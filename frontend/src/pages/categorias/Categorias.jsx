import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { getCategorias, eliminarCategoria } from '../../api/servicios'
import { getCategoriasProducto, eliminarCategoriaProducto } from '../../api/inventario'
import { usePermisos } from '../../hooks/usePermisos'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmarEliminar from '../../components/ui/ConfirmarEliminar'
import CategoriaModal from './CategoriaModal'

const TABS = [
  { valor: 'servicio', label: 'Servicios' },
  { valor: 'producto', label: 'Productos' },
]

export default function Categorias() {
  const [tab, setTab] = useState('servicio')
  const [modal, setModal] = useState(null)        // null | { tipo, categoria }
  const [aEliminar, setAEliminar] = useState(null) // null | { tipo, categoria }
  const [errorEliminar, setErrorEliminar] = useState('')

  const { crear, editar, eliminar } = usePermisos('categorias')
  const qc = useQueryClient()

  const { data: dataServicios, isLoading: loadServicios } = useQuery({
    queryKey: ['categorias-servicio'],
    queryFn: () => getCategorias().then((r) => r.data),
  })

  const { data: dataProductos, isLoading: loadProductos } = useQuery({
    queryKey: ['categorias-producto'],
    queryFn: () => getCategoriasProducto().then((r) => r.data),
  })

  const listaServicios = dataServicios?.results ?? dataServicios?.resultados ?? dataServicios ?? []
  const listaProductos = dataProductos?.results ?? dataProductos?.resultados ?? dataProductos ?? []

  const isLoading = tab === 'servicio' ? loadServicios : loadProductos
  const lista = tab === 'servicio' ? listaServicios : listaProductos

  const mutEliminar = useMutation({
    mutationFn: () =>
      aEliminar.tipo === 'servicio'
        ? eliminarCategoria(aEliminar.categoria.id)
        : eliminarCategoriaProducto(aEliminar.categoria.id),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [
          aEliminar.tipo === 'servicio' ? 'categorias-servicio' : 'categorias-producto',
        ],
      })
      setAEliminar(null)
      setErrorEliminar('')
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.detail ??
        'No se puede eliminar: la categoría tiene elementos asociados.'
      setErrorEliminar(msg)
    },
  })

  function abrirCrear() {
    setModal({ tipo: tab, categoria: null })
  }

  function abrirEditar(cat) {
    setModal({ tipo: tab, categoria: cat })
  }

  function iniciarEliminar(cat) {
    setErrorEliminar('')
    setAEliminar({ tipo: tab, categoria: cat })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Categorías</h2>
        {crear && (
          <button
            onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Nueva categoría
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map((t) => (
          <button
            key={t.valor}
            onClick={() => setTab(t.valor)}
            className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t.valor
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : lista.length === 0 ? (
          <EmptyState mensaje="Sin categorías registradas" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Descripción
                </th>
                {tab === 'servicio' && (
                  <>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Orden
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Servicios
                    </th>
                  </>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lista.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Tag size={13} className="text-indigo-500" />
                      </div>
                      <span className="font-medium text-gray-900">{cat.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {cat.descripcion || '—'}
                  </td>
                  {tab === 'servicio' && (
                    <>
                      <td className="px-4 py-3 text-center text-gray-600">{cat.orden ?? 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {cat.total_servicios ?? 0}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {editar && (
                        <button
                          onClick={() => abrirEditar(cat)}
                          title="Editar"
                          className="text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {eliminar && (
                        <button
                          onClick={() => iniciarEliminar(cat)}
                          title="Eliminar"
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <CategoriaModal
          tipo={modal.tipo}
          categoria={modal.categoria}
          onClose={() => setModal(null)}
        />
      )}

      {/* Confirmación eliminar */}
      {aEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Eliminar categoría</h3>
                <p className="text-xs text-gray-500 mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">
              ¿Estás seguro que querés eliminar{' '}
              <span className="font-medium text-gray-900">
                {aEliminar.categoria.nombre}
              </span>?
            </p>

            {errorEliminar && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{errorEliminar}</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setAEliminar(null); setErrorEliminar('') }}
                disabled={mutEliminar.isPending}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => mutEliminar.mutate()}
                disabled={mutEliminar.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {mutEliminar.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
