import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, User, Plus, Pencil, Trash2, History } from 'lucide-react'
import { getClientes, eliminarCliente } from '../../api/clientes'
import { usePermisos } from '../../hooks/usePermisos'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ClienteModal from './ClienteModal'
import ConfirmarEliminar from '../../components/ui/ConfirmarEliminar'

export default function Clientes() {
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [clienteEditar, setClienteEditar] = useState(null)
  const [clienteEliminar, setClienteEliminar] = useState(null)

  const { crear, editar, eliminar } = usePermisos('clientes')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', pagina, busqueda],
    queryFn: () =>
      getClientes({ page: pagina, search: busqueda || undefined }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const mutEliminar = useMutation({
    mutationFn: () => eliminarCliente(clienteEliminar.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      setClienteEliminar(null)
    },
  })

  function abrirCrear() {
    setClienteEditar(null)
    setModalAbierto(true)
  }

  function abrirEditar(cliente) {
    setClienteEditar(cliente)
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setClienteEditar(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
        {crear && (
          <button
            onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Nuevo cliente
          </button>
        )}
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value)
            setPagina(1)
          }}
          placeholder="Buscar por nombre o teléfono..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : data?.resultados?.length === 0 ? (
          <EmptyState mensaje="No se encontraron clientes" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Cliente', 'RUC / CI', 'Teléfono', 'Email', 'Frecuente', 'Acciones'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.resultados?.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <User size={14} className="text-indigo-600" />
                      </div>
                      <p className="font-medium text-gray-900">
                        {c.nombre} {c.apellido}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.ruc_ci || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.telefono}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email || '—'}</td>
                  <td className="px-4 py-3">
                    {c.es_cliente_frecuente ? (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        Frecuente
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        title="Ver historial"
                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        <History size={16} />
                      </button>
                      {editar && (
                        <button
                          onClick={() => abrirEditar(c)}
                          title="Editar"
                          className="text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {eliminar && (
                        <button
                          onClick={() => setClienteEliminar(c)}
                          title="Eliminar"
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
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
              <button
                disabled={!data.anterior}
                onClick={() => setPagina((p) => p - 1)}
                className="px-3 py-1.5 text-xs rounded border border-gray-200 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-600">
                {data.pagina_actual} / {data.paginas}
              </span>
              <button
                disabled={!data.siguiente}
                onClick={() => setPagina((p) => p + 1)}
                className="px-3 py-1.5 text-xs rounded border border-gray-200 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {modalAbierto && (
        <ClienteModal cliente={clienteEditar} onClose={cerrarModal} />
      )}

      {/* Confirmación eliminar */}
      {clienteEliminar && (
        <ConfirmarEliminar
          nombre={`${clienteEliminar.nombre} ${clienteEliminar.apellido}`}
          onConfirmar={() => mutEliminar.mutate()}
          onCancelar={() => setClienteEliminar(null)}
          cargando={mutEliminar.isPending}
        />
      )}
    </div>
  )
}
