import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Scissors, Plus, Pencil, Trash2 } from 'lucide-react'
import { getBarberos, eliminarBarbero } from '../../api/barberos'
import { usePermisos } from '../../hooks/usePermisos'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmarEliminar from '../../components/ui/ConfirmarEliminar'
import BarberoModal from './BarberoModal'

export default function Barberos() {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [barberoEditar, setBarberoEditar] = useState(null)
  const [barberoEliminar, setBarberoEliminar] = useState(null)

  const { crear, editar, eliminar } = usePermisos('barberos')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['barberos'],
    queryFn: () => getBarberos().then((r) => r.data),
  })

  const lista = data?.resultados ?? data ?? []

  const mutEliminar = useMutation({
    mutationFn: () => eliminarBarbero(barberoEliminar.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barberos'] })
      setBarberoEliminar(null)
    },
  })

  function abrirEditar(b) {
    setBarberoEditar(b)
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setBarberoEditar(null)
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Barberos</h2>
        {crear && (
          <button
            onClick={() => { setBarberoEditar(null); setModalAbierto(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Nuevo barbero
          </button>
        )}
      </div>

      {lista.length === 0 ? (
        <EmptyState mensaje="Sin barberos registrados" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {lista.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Scissors size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{b.usuario_nombre}</p>
                    <p className="text-sm text-gray-500">{b.especialidad || 'General'}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {editar && (
                    <button
                      onClick={() => abrirEditar(b)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {eliminar && (
                    <button
                      onClick={() => setBarberoEliminar(b)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-1.5">
                {b.usuario_email && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email</span>
                    <span className="truncate max-w-[160px]">{b.usuario_email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Comisión</span>
                  <span className="font-medium">
                    {b.tipo_comision === 'porcentaje'
                      ? `${b.valor_comision}%`
                      : `$${b.valor_comision}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tipo</span>
                  <span>{b.tipo_comision_display}</span>
                </div>
              </div>

              {b.bio && (
                <p className="mt-3 text-xs text-gray-500 border-t border-gray-100 pt-3 line-clamp-2">
                  {b.bio}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {modalAbierto && <BarberoModal barbero={barberoEditar} onClose={cerrarModal} />}

      {barberoEliminar && (
        <ConfirmarEliminar
          nombre={barberoEliminar.usuario_nombre}
          onConfirmar={() => mutEliminar.mutate()}
          onCancelar={() => setBarberoEliminar(null)}
          cargando={mutEliminar.isPending}
        />
      )}
    </div>
  )
}
