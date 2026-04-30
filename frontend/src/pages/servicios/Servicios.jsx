import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, DollarSign, Plus, Pencil, Trash2 } from 'lucide-react'
import { getServicios, eliminarServicio } from '../../api/servicios'
import { usePermisos } from '../../hooks/usePermisos'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmarEliminar from '../../components/ui/ConfirmarEliminar'
import ServicioModal from './ServicioModal'

export default function Servicios() {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [servicioEditar, setServicioEditar] = useState(null)
  const [servicioEliminar, setServicioEliminar] = useState(null)

  const { crear, editar, eliminar } = usePermisos('servicios')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['servicios'],
    queryFn: () => getServicios().then((r) => r.data),
  })

  const lista = data?.resultados ?? data ?? []

  const mutEliminar = useMutation({
    mutationFn: () => eliminarServicio(servicioEliminar.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicios'] })
      setServicioEliminar(null)
    },
  })

  function abrirEditar(s) {
    setServicioEditar(s)
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setServicioEditar(null)
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Servicios</h2>
        {crear && (
          <button
            onClick={() => { setServicioEditar(null); setModalAbierto(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Nuevo servicio
          </button>
        )}
      </div>

      {lista.length === 0 ? (
        <EmptyState mensaje="Sin servicios registrados" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {lista.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{s.nombre}</p>
                  {s.categoria_nombre && (
                    <p className="text-xs text-indigo-600 mt-0.5">{s.categoria_nombre}</p>
                  )}
                </div>
                <div className="flex gap-1.5 ml-2 flex-shrink-0">
                  {editar && (
                    <button
                      onClick={() => abrirEditar(s)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {eliminar && (
                    <button
                      onClick={() => setServicioEliminar(s)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {s.descripcion && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{s.descripcion}</p>
              )}

              <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Clock size={13} /> {s.duracion_minutos} min
                </span>
                <span className="flex items-center gap-1 font-medium text-gray-800">
                  <DollarSign size={13} />
                  {Number(s.precio_base).toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && <ServicioModal servicio={servicioEditar} onClose={cerrarModal} />}

      {servicioEliminar && (
        <ConfirmarEliminar
          nombre={servicioEliminar.nombre}
          onConfirmar={() => mutEliminar.mutate()}
          onCancelar={() => setServicioEliminar(null)}
          cargando={mutEliminar.isPending}
        />
      )}
    </div>
  )
}
