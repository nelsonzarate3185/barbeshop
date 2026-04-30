import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { crearServicio, actualizarServicio, getCategorias } from '../../api/servicios'

export default function ServicioModal({ servicio, onClose }) {
  const qc = useQueryClient()
  const esEdicion = !!servicio

  const { data: categoriasData } = useQuery({
    queryKey: ['categorias-servicio'],
    queryFn: () => getCategorias().then((r) => r.data),
  })
  const categorias = categoriasData?.results ?? categoriasData?.resultados ?? categoriasData ?? []

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      nombre: '',
      descripcion: '',
      categoria: '',
      duracion_minutos: '',
      precio_base: '',
    },
  })

  useEffect(() => {
    if (servicio) {
      reset({
        nombre: servicio.nombre ?? '',
        descripcion: servicio.descripcion ?? '',
        categoria: servicio.categoria ?? '',
        duracion_minutos: servicio.duracion_minutos ?? '',
        precio_base: servicio.precio_base ?? '',
      })
    }
  }, [servicio, reset])

  const mutacion = useMutation({
    mutationFn: (data) =>
      esEdicion ? actualizarServicio(servicio.id, data) : crearServicio(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicios'] })
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
    const payload = { ...data }
    if (!payload.descripcion) delete payload.descripcion
    mutacion.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            {esEdicion ? 'Editar servicio' : 'Nuevo servicio'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
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
              placeholder="Ej: Corte clásico"
            />
            {errors.nombre && (
              <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              {...register('descripcion')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Descripción del servicio..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              {...register('categoria', { required: 'Requerido' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Seleccionar categoría...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {errors.categoria && (
              <p className="text-xs text-red-500 mt-1">{errors.categoria.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Duración (min) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('duracion_minutos', {
                  required: 'Requerido',
                  min: { value: 5, message: 'Mínimo 5 min' },
                })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="30"
              />
              {errors.duracion_minutos && (
                <p className="text-xs text-red-500 mt-1">{errors.duracion_minutos.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Precio base ($) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('precio_base', {
                  required: 'Requerido',
                  min: { value: 0.01, message: 'Debe ser mayor a 0' },
                })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
              {errors.precio_base && (
                <p className="text-xs text-red-500 mt-1">{errors.precio_base.message}</p>
              )}
            </div>
          </div>

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
                : 'Crear servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
