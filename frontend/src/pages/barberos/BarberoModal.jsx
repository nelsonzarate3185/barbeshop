import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { crearBarbero, actualizarBarbero, getUsuariosBarbero } from '../../api/barberos'

export default function BarberoModal({ barbero, onClose }) {
  const qc = useQueryClient()
  const esEdicion = !!barbero

  const { data: usuariosData } = useQuery({
    queryKey: ['usuarios-barbero'],
    queryFn: () => getUsuariosBarbero().then((r) => r.data),
    enabled: !esEdicion,
  })

  const usuarios = usuariosData?.resultados ?? usuariosData ?? []

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      usuario: '',
      bio: '',
      especialidad: '',
      tipo_comision: 'porcentaje',
      valor_comision: '',
    },
  })

  useEffect(() => {
    if (barbero) {
      reset({
        bio: barbero.bio ?? '',
        especialidad: barbero.especialidad ?? '',
        tipo_comision: barbero.tipo_comision ?? 'porcentaje',
        valor_comision: barbero.valor_comision ?? '',
      })
    }
  }, [barbero, reset])

  const mutacion = useMutation({
    mutationFn: (data) =>
      esEdicion ? actualizarBarbero(barbero.id, data) : crearBarbero(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barberos'] })
      qc.invalidateQueries({ queryKey: ['usuarios-barbero'] })
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
    if (!payload.bio) delete payload.bio
    if (!payload.especialidad) delete payload.especialidad
    if (esEdicion) delete payload.usuario
    mutacion.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            {esEdicion ? 'Editar barbero' : 'Nuevo barbero'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {/* Usuario (solo en creación) */}
          {!esEdicion && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Usuario <span className="text-red-500">*</span>
              </label>
              <select
                {...register('usuario', { required: 'Requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Seleccionar usuario...</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre_completo} — {u.email}
                  </option>
                ))}
              </select>
              {errors.usuario && (
                <p className="text-xs text-red-500 mt-1">{errors.usuario.message}</p>
              )}
            </div>
          )}

          {/* En edición, mostrar nombre del usuario como texto */}
          {esEdicion && (
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
              <span className="text-xs text-gray-400 block mb-0.5">Usuario</span>
              {barbero.usuario_nombre}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Especialidad</label>
            <input
              {...register('especialidad')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ej: Corte clásico, barba, degradé..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Biografía</label>
            <textarea
              {...register('bio')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Descripción breve del barbero..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tipo de comisión
              </label>
              <select
                {...register('tipo_comision')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="fijo">Monto fijo ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Valor de comisión <span className="text-red-500">*</span>
              </label>
              <input
                {...register('valor_comision', {
                  required: 'Requerido',
                  min: { value: 0, message: 'Debe ser ≥ 0' },
                  max: { value: 100, message: 'Máximo 100' },
                })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
              {errors.valor_comision && (
                <p className="text-xs text-red-500 mt-1">{errors.valor_comision.message}</p>
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
                : 'Crear barbero'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
