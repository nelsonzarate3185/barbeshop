import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { crearCategoria, actualizarCategoria } from '../../api/servicios'
import {
  crearCategoriaProducto,
  actualizarCategoriaProducto,
} from '../../api/inventario'

// tipo: 'servicio' | 'producto'
export default function CategoriaModal({ categoria, tipo, onClose }) {
  const qc = useQueryClient()
  const esEdicion = !!categoria
  const esServicio = tipo === 'servicio'

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { nombre: '', descripcion: '', orden: '' },
  })

  useEffect(() => {
    if (categoria) {
      reset({
        nombre: categoria.nombre ?? '',
        descripcion: categoria.descripcion ?? '',
        orden: categoria.orden ?? '',
      })
    }
  }, [categoria, reset])

  const mutacion = useMutation({
    mutationFn: (data) => {
      if (esServicio) {
        return esEdicion
          ? actualizarCategoria(categoria.id, data)
          : crearCategoria(data)
      }
      return esEdicion
        ? actualizarCategoriaProducto(categoria.id, data)
        : crearCategoriaProducto(data)
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [esServicio ? 'categorias-servicio' : 'categorias-producto'],
      })
      onClose()
    },
    onError: (err) => {
      const data = err?.response?.data
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([campo, mensajes]) => {
          const msg = Array.isArray(mensajes) ? mensajes[0] : mensajes
          setError(campo, { message: msg })
        })
      }
    },
  })

  const onSubmit = (data) => {
    const payload = { nombre: data.nombre }
    if (data.descripcion) payload.descripcion = data.descripcion
    if (esServicio && data.orden !== '') payload.orden = parseInt(data.orden) || 0
    mutacion.mutate(payload)
  }

  const titulo = esServicio ? 'categoría de servicio' : 'categoría de producto'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 capitalize">
            {esEdicion ? `Editar ${titulo}` : `Nueva ${titulo}`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              {...register('nombre', { required: 'Requerido' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Nombre de la categoría"
            />
            {errors.nombre && (
              <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              {...register('descripcion')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Descripción opcional..."
            />
          </div>

          {/* Campo orden solo para categorías de servicios */}
          {esServicio && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Orden de visualización
              </label>
              <input
                {...register('orden')}
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
              <p className="text-xs text-gray-400 mt-1">
                Número menor = aparece primero
              </p>
            </div>
          )}

          {mutacion.error && !Object.keys(errors).length && (
            <p className="text-xs text-red-500">
              Error al guardar. Revisá los datos e intentá de nuevo.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting
                ? 'Guardando...'
                : esEdicion
                ? 'Guardar cambios'
                : 'Crear categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
