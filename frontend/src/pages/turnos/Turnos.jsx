import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { getTurnos, cambiarEstado } from '../../api/turnos'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import NuevoTurnoModal from './NuevoTurnoModal'

const ESTADO_LABEL = {
  pendiente: 'Pendiente', confirmado: 'Confirmado',
  en_curso: 'En curso', completado: 'Completado',
  cancelado: 'Cancelado', ausente: 'Ausente',
}
const TRANSICIONES = {
  pendiente: ['confirmado', 'cancelado'],
  confirmado: ['en_curso', 'cancelado', 'ausente'],
  en_curso: ['completado', 'cancelado'],
}

export default function Turnos() {
  const qc = useQueryClient()
  const [pagina, setPagina] = useState(1)
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [modalOpen, setModalOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['turnos', pagina, fecha],
    queryFn: () => getTurnos({ page: pagina, fecha_inicio__date: fecha }).then(r => r.data),
  })

  const { mutate: cambiar } = useMutation({
    mutationFn: ({ id, estado }) => cambiarEstado(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['turnos'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Turnos</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Nuevo turno
        </button>
      </div>

      {/* Filtro fecha */}
      <div className="flex items-center gap-3">
        <button onClick={() => {
          const d = new Date(fecha); d.setDate(d.getDate() - 1)
          setFecha(format(d, 'yyyy-MM-dd')); setPagina(1)
        }} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
          <ChevronLeft size={16} />
        </button>
        <input
          type="date"
          value={fecha}
          onChange={e => { setFecha(e.target.value); setPagina(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button onClick={() => {
          const d = new Date(fecha); d.setDate(d.getDate() + 1)
          setFecha(format(d, 'yyyy-MM-dd')); setPagina(1)
        }} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : data?.resultados?.length === 0 ? (
          <EmptyState mensaje="Sin turnos para esta fecha" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Hora','Cliente','Barbero','Servicio','Estado','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.resultados?.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {format(new Date(t.fecha_inicio), 'HH:mm')}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{t.cliente_nombre}</td>
                  <td className="px-4 py-3 text-gray-700">{t.barbero_nombre}</td>
                  <td className="px-4 py-3 text-gray-700">{t.servicio_nombre}</td>
                  <td className="px-4 py-3">
                    <Badge label={ESTADO_LABEL[t.estado]} variant={t.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(TRANSICIONES[t.estado] ?? []).map(e => (
                        <button
                          key={e}
                          onClick={() => cambiar({ id: t.id, estado: e })}
                          className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                        >
                          {ESTADO_LABEL[e]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginación */}
        {data && data.paginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Total: {data.total}</p>
            <div className="flex gap-2">
              <button disabled={!data.anterior} onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1.5 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                Anterior
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-600">
                {data.pagina_actual} / {data.paginas}
              </span>
              <button disabled={!data.siguiente} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1.5 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && <NuevoTurnoModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
