import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { crearProducto, actualizarProducto, getCategoriasProducto } from '../../api/inventario'

export default function ProductoModal({ producto, onClose }) {
  const qc = useQueryClient()
  const esEdicion = !!producto

  const { data: categoriasData } = useQuery({
    queryKey: ['categorias-producto'],
    queryFn: () => getCategoriasProducto().then((r) => r.data),
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
      sku: '',
      categoria: '',
      stock_actual: '',
      stock_minimo: '',
      unidad: '',
      precio_costo: '',
      precio_venta: '',
    },
  })

  useEffect(() => {
    if (producto) {
      reset({
        nombre: producto.nombre ?? '',
        sku: producto.sku ?? '',
        categoria: producto.categoria ?? '',
        stock_actual: producto.stock_actual ?? '',
        stock_minimo: producto.stock_minimo ?? '',
        unidad: producto.unidad ?? '',
        precio_costo: producto.precio_costo ?? '',
        precio_venta: producto.precio_venta ?? '',
      })
    }
  }, [producto, reset])

  const [errorGeneral, setErrorGeneral] = useState('')

  const mutacion = useMutation({
    mutationFn: (data) =>
      esEdicion ? actualizarProducto(producto.id, data) : crearProducto(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] })
      onClose()
    },
    onError: (err) => {
      setErrorGeneral('')
      const data = err?.response?.data

      if (!data) {
        setErrorGeneral('Error de conexión. Verificá tu red e intentá de nuevo.')
        return
      }

      // Campos conocidos del formulario
      const CAMPOS_FORM = ['nombre', 'sku', 'categoria', 'stock_actual', 'stock_minimo', 'unidad', 'precio_costo', 'precio_venta']
      const erroresGenerales = []

      if (typeof data === 'object') {
        Object.entries(data).forEach(([campo, mensajes]) => {
          const msg = Array.isArray(mensajes) ? mensajes[0] : String(mensajes)
          if (CAMPOS_FORM.includes(campo)) {
            setError(campo, { message: msg })
          } else {
            erroresGenerales.push(msg)
          }
        })
      } else if (typeof data === 'string') {
        erroresGenerales.push(data)
      }

      if (erroresGenerales.length) {
        setErrorGeneral(erroresGenerales.join(' '))
      }
    },
  })

  const onSubmit = (data) => {
    const payload = {
      nombre: data.nombre,
      sku: data.sku,
      categoria: parseInt(data.categoria),
      stock_actual: parseFloat(data.stock_actual) || 0,
      stock_minimo: parseFloat(data.stock_minimo) || 0,
      unidad: data.unidad,
      precio_costo: data.precio_costo !== '' ? parseFloat(data.precio_costo) : 0,
      precio_venta: data.precio_venta !== '' ? parseFloat(data.precio_venta) : 0,
    }
    mutacion.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            {esEdicion ? 'Editar producto' : 'Nuevo producto'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                {...register('nombre', { required: 'Requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Shampoo para barba"
              />
              {errors.nombre && (
                <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                {...register('sku', { required: 'Requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                placeholder="PROD-001"
              />
              {errors.sku && (
                <p className="text-xs text-red-500 mt-1">{errors.sku.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                {...register('categoria', { required: 'Requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Seleccionar...</option>
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

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Unidad <span className="text-red-500">*</span>
              </label>
              <input
                {...register('unidad', { required: 'Requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="ml, unidad, kg..."
              />
              {errors.unidad && (
                <p className="text-xs text-red-500 mt-1">{errors.unidad.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Stock actual <span className="text-red-500">*</span>
              </label>
              <input
                {...register('stock_actual', {
                  required: 'Requerido',
                  min: { value: 0, message: 'Mínimo 0' },
                })}
                type="number"
                step="0.001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
              {errors.stock_actual && (
                <p className="text-xs text-red-500 mt-1">{errors.stock_actual.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Stock mínimo <span className="text-red-500">*</span>
              </label>
              <input
                {...register('stock_minimo', {
                  required: 'Requerido',
                  min: { value: 0, message: 'Mínimo 0' },
                })}
                type="number"
                step="0.001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
              {errors.stock_minimo && (
                <p className="text-xs text-red-500 mt-1">{errors.stock_minimo.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Precio costo ($)
              </label>
              <input
                {...register('precio_costo', { min: { value: 0, message: 'Mínimo 0' } })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
              {errors.precio_costo && (
                <p className="text-xs text-red-500 mt-1">{errors.precio_costo.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Precio venta ($)
              </label>
              <input
                {...register('precio_venta', { min: { value: 0, message: 'Mínimo 0' } })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
              {errors.precio_venta && (
                <p className="text-xs text-red-500 mt-1">{errors.precio_venta.message}</p>
              )}
            </div>
          </div>

          {errorGeneral && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">{errorGeneral}</p>
            </div>
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
                : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
