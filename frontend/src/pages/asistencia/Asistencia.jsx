import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { LogIn, Coffee, LogOut, Clock, Users } from 'lucide-react'
import {
  getAsistencias, marcarIngreso, inicioDescanso,
  finDescanso, marcarSalida,
} from '../../api/asistencia'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../../components/ui/Spinner'

const fmtTime = (t) => (t ? String(t).slice(0, 5) : '—')

function BadgeEstado({ registro }) {
  if (!registro.hora_ingreso)
    return <span className="text-xs text-gray-400">Sin marcar</span>
  if (!registro.hora_salida) {
    if (registro.descanso_abierto_id)
      return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">En descanso</span>
    return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">En turno</span>
  }
  return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Finalizado</span>
}

export default function Asistencia() {
  const { usuario } = useAuth()
  const qc = useQueryClient()
  const hoy = format(new Date(), 'yyyy-MM-dd')
  const [fecha, setFecha] = useState(hoy)
  const esAdmin = usuario?.rol === 'administrador'

  const { data, isLoading } = useQuery({
    queryKey: ['asistencia', fecha],
    queryFn: () => getAsistencias({ fecha }).then(r => r.data),
    refetchInterval: 30_000,
  })

  // La API usa paginación estándar con key "resultados"
  const registros = data?.resultados ?? (Array.isArray(data) ? data : [])

  // Registro propio del día de hoy
  const propio = fecha === hoy
    ? registros.find(r => r.empleado === usuario?.id)
    : null

  const invalidar = () => qc.invalidateQueries({ queryKey: ['asistencia', hoy] })

  const mutIngreso  = useMutation({ mutationFn: (d) => marcarIngreso(d),          onSuccess: invalidar })
  const mutIniDesc  = useMutation({ mutationFn: ({ id, ...d }) => inicioDescanso(id, d), onSuccess: invalidar })
  const mutFinDesc  = useMutation({ mutationFn: ({ id, ...d }) => finDescanso(id, d),   onSuccess: invalidar })
  const mutSalida   = useMutation({ mutationFn: ({ id, ...d }) => marcarSalida(id, d),  onSuccess: invalidar })

  const cargando = mutIngreso.isPending || mutIniDesc.isPending || mutFinDesc.isPending || mutSalida.isPending

  const errorMsg = [mutIngreso.error, mutIniDesc.error, mutFinDesc.error, mutSalida.error]
    .filter(Boolean)
    .map(e => e?.response?.data?.detail ?? 'Error al registrar marcación.')
    .at(0)

  function accion(tipo) {
    const hora = format(new Date(), 'HH:mm')
    if (tipo === 'ingreso') {
      mutIngreso.mutate({ sucursal: usuario?.sucursal_id ?? null, hora })
    } else if (tipo === 'inicio_descanso') {
      mutIniDesc.mutate({ id: propio.id, hora })
    } else if (tipo === 'fin_descanso') {
      mutFinDesc.mutate({ id: propio.id, hora })
    } else if (tipo === 'salida') {
      mutSalida.mutate({ id: propio.id, hora })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Asistencia</h2>
        {esAdmin && (
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
      </div>

      {/* ── Panel de marcación (solo día actual) ─────────────────────────── */}
      {fecha === hoy && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-4 gap-4">
            <div>
              <p className="font-semibold text-gray-900">{usuario?.nombre_completo}</p>
              <p className="text-sm text-gray-500 capitalize">
                {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>
            {propio && <BadgeEstado registro={propio} />}
          </div>

          {/* Resumen horario */}
          {propio && (
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-indigo-400" />
                Ingreso: <strong className="text-gray-800">{fmtTime(propio.hora_ingreso)}</strong>
              </span>
              {propio.hora_salida && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-gray-400" />
                  Salida: <strong className="text-gray-800">{fmtTime(propio.hora_salida)}</strong>
                </span>
              )}
              {propio.horas_netas_display && propio.horas_netas_display !== '—' && (
                <span className="flex items-center gap-1.5 text-green-600 font-semibold">
                  Total neto: {propio.horas_netas_display}
                </span>
              )}
            </div>
          )}

          {/* Descansos */}
          {propio?.descansos?.length > 0 && (
            <div className="mb-4 space-y-1">
              {propio.descansos.map((d, i) => (
                <div key={d.id} className="flex gap-3 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded">
                  <span className="font-medium">Descanso {i + 1}:</span>
                  <span>
                    {fmtTime(d.inicio)} → {d.fin ? fmtTime(d.fin) : <em className="text-yellow-600">abierto</em>}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {errorMsg}
            </div>
          )}

          {/* Botones de marcación */}
          <div className="flex flex-wrap gap-3">
            {!propio?.hora_ingreso && (
              <button
                onClick={() => accion('ingreso')}
                disabled={cargando}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <LogIn size={16} />
                {cargando ? 'Registrando...' : 'Marcar ingreso'}
              </button>
            )}

            {propio?.turno_abierto && !propio?.descanso_abierto_id && (
              <button
                onClick={() => accion('inicio_descanso')}
                disabled={cargando}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors"
              >
                <Coffee size={16} /> Inicio descanso
              </button>
            )}

            {propio?.descanso_abierto_id && (
              <button
                onClick={() => accion('fin_descanso')}
                disabled={cargando}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                <Coffee size={16} /> Fin descanso
              </button>
            )}

            {propio?.turno_abierto && (
              <button
                onClick={() => accion('salida')}
                disabled={cargando}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <LogOut size={16} /> Marcar salida
              </button>
            )}

            {propio?.hora_salida && (
              <p className="text-sm text-green-600 font-medium self-center">
                ✓ Turno completado — {propio.horas_netas_display}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Tabla de registros ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <Users size={16} className="text-gray-400" />
          <h3 className="font-semibold text-gray-900 text-sm">
            Registros — {format(new Date(fecha + 'T12:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es })}
          </h3>
          <span className="ml-auto text-xs text-gray-400">{registros.length} empleado{registros.length !== 1 ? 's' : ''}</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : registros.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">Sin registros para esta fecha.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Empleado', 'Sucursal', 'Ingreso', 'Salida', 'Descansos', 'Total neto', 'Estado'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {registros.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50 ${r.empleado === usuario?.id ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.empleado_nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{r.sucursal_nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 font-mono">{fmtTime(r.hora_ingreso)}</td>
                  <td className="px-4 py-3 text-gray-700 font-mono">{fmtTime(r.hora_salida)}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{r.descansos?.length ?? 0}</td>
                  <td className="px-4 py-3 font-semibold text-indigo-700">{r.horas_netas_display}</td>
                  <td className="px-4 py-3"><BadgeEstado registro={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
