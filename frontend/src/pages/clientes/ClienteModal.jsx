import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { crearCliente, actualizarCliente } from '../../api/clientes'
import { useAuth } from '../../hooks/useAuth'

export default function ClienteModal({ cliente, onClose }) {
  const { usuario } = useAuth()
  const qc = useQueryClient()
  const esEdicion = !!cliente

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      nombre: '',
      apellido: '',
      telefono: '',
      email: '',
      fecha_nacimiento: '',
      notas: '',
    },
  })

  useEffect(() => {
    if (cliente) {
      reset({
        nombre: cliente.nombre ?? '',
        apellido: cliente.apellido ?? '',
        telefono: cliente.telefono ?? '',
        email: cliente.email ?? '',
        fecha_nacimiento: cliente.fecha_nacimiento ?? '',
        notas: cliente.notas ?? '',
      })
    }
  }, [cliente, reset])

  const mutacion = useMutation({
    mutationFn: (data) =>
      esEdicion
        ? actualizarCliente(cliente.id, data)
        : crearCliente({ ...data, sucursal: usuario?.sucursal_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
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
    if (!payload.email) delete payload.email
    if (!payload.fecha_nacimiento) delete payload.fecha_nacimiento
    if (!payload.notas) delete payload.notas
    mutacion.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            {esEdicion ? 'Editar cliente' : 'Nuevo cliente'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                {...register('nombre', { required: 'Requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Juan"
              />
              {errors.nombre && (
                <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Apellido <span className="text-red-500">*</span>
              </label>
              <input
                {...register('apellido', { required: 'Requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Pérez"
              />
              {errors.apellido && (
                <p className="text-xs text-red-500 mt-1">{errors.apellido.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input
              {...register('telefono', {
                required: 'Requerido',
                minLength: { value: 8, message: 'Mínimo 8 dígitos' },
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="11 1234-5678"
            />
            {errors.telefono && (
              <p className="text-xs text-red-500 mt-1">{errors.telefono.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="juan@email.com"
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Fecha de nacimiento
            </label>
            <input
              {...register('fecha_nacimiento')}
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              {...register('notas')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Observaciones sobre el cliente..."
            />
          </div>

          {mutacion.error && !Object.keys(errors).length && (
            <p className="text-xs text-red-500">
              Error al guardar. Revisá los datos e intentá de nuevo.
            </p>
          )}

          {/* Buttons */}
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
                : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
