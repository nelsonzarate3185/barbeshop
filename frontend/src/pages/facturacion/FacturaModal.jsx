import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Trash2 } from 'lucide-react'
import { crearFactura } from '../../api/facturacion'
import { getClientes } from '../../api/clientes'
import { getBarberos } from '../../api/barberos'
import { useAuth } from '../../hooks/useAuth'

const METODOS_PAGO = [
  { valor: 'efectivo', label: 'Efectivo' },
  { valor: 'tarjeta', label: 'Tarjeta crédito/débito' },
  { valor: 'transferencia', label: 'Transferencia bancaria' },
  { valor: 'mercadopago', label: 'MercadoPago' },
]

const ITEM_VACIO = { descripcion: '', cantidad: '1', precio_unitario: '' }

export default function FacturaModal({ onClose }) {
  const { usuario } = useAuth()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    cliente: '',
    barbero: '',
    metodo_pago: 'efectivo',
    descuento: '0',
    impuesto: '0',
  })
  const [items, setItems] = useState([{ ...ITEM_VACIO }])
  const [errores, setErrores] = useState({})

  const { data: clientesData } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: () => getClientes({ page: 1 }).then((r) => r.data),
  })
  const { data: barberosData } = useQuery({
    queryKey: ['barberos'],
    queryFn: () => getBarberos().then((r) => r.data),
  })

  const clientes = clientesData?.resultados ?? []
  const barberos = barberosData?.resultados ?? barberosData ?? []

  const subtotal = items.reduce((acc, i) => {
    const qty = parseFloat(i.cantidad) || 0
    const precio = parseFloat(i.precio_unitario) || 0
    return acc + qty * precio
  }, 0)
  const descuento = parseFloat(form.descuento) || 0
  const impuesto = parseFloat(form.impuesto) || 0
  const total = Math.max(subtotal - descuento + impuesto, 0)

  const mutacion = useMutation({
    mutationFn: crearFactura,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facturas'] })
      onClose()
    },
    onError: (err) => {
      const data = err?.response?.data
      if (data && typeof data === 'object') setErrores(data)
    },
  })

  function setItem(idx, campo, valor) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)))
  }

  function agregarItem() {
    setItems((prev) => [...prev, { ...ITEM_VACIO }])
  }

  function quitarItem(idx) {
    if (items.length === 1) return
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setErrores({})

    const payload = {
      cliente: parseInt(form.cliente),
      barbero: parseInt(form.barbero),
      sucursal: usuario?.sucursal_id,
      metodo_pago: form.metodo_pago,
      descuento: parseFloat(form.descuento) || 0,
      impuesto: parseFloat(form.impuesto) || 0,
      items: items.map((it) => ({
        descripcion: it.descripcion,
        cantidad: parseFloat(it.cantidad),
        precio_unitario: parseFloat(it.precio_unitario),
      })),
    }

    mutacion.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-semibold text-gray-900">Nueva factura</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Cliente y Barbero */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cliente <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Seleccionar...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.apellido}
                  </option>
                ))}
              </select>
              {errores.cliente && (
                <p className="text-xs text-red-500 mt-1">
                  {Array.isArray(errores.cliente) ? errores.cliente[0] : errores.cliente}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Barbero <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.barbero}
                onChange={(e) => setForm({ ...form, barbero: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Seleccionar...</option>
                {barberos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.usuario_nombre}
                  </option>
                ))}
              </select>
              {errores.barbero && (
                <p className="text-xs text-red-500 mt-1">
                  {Array.isArray(errores.barbero) ? errores.barbero[0] : errores.barbero}
                </p>
              )}
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Método de pago
            </label>
            <select
              value={form.metodo_pago}
              onChange={(e) => setForm({ ...form, metodo_pago: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {METODOS_PAGO.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">
                Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={agregarItem}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
              >
                <Plus size={13} /> Agregar item
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                <span className="col-span-5">Descripción</span>
                <span className="col-span-2 text-center">Cant.</span>
                <span className="col-span-3">Precio unit.</span>
                <span className="col-span-2 text-right">Subtotal</span>
              </div>

              {items.map((item, idx) => {
                const sub =
                  (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0)
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      required
                      value={item.descripcion}
                      onChange={(e) => setItem(idx, 'descripcion', e.target.value)}
                      placeholder="Descripción"
                      className="col-span-5 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.cantidad}
                      onChange={(e) => setItem(idx, 'cantidad', e.target.value)}
                      className="col-span-2 px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.precio_unitario}
                      onChange={(e) => setItem(idx, 'precio_unitario', e.target.value)}
                      placeholder="0.00"
                      className="col-span-3 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="col-span-1 text-right text-xs text-gray-700 font-medium pr-1">
                      ${sub.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarItem(idx)}
                      disabled={items.length === 1}
                      className="col-span-1 flex justify-center text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
            {errores.items && (
              <p className="text-xs text-red-500 mt-1">
                {Array.isArray(errores.items) ? errores.items[0] : errores.items}
              </p>
            )}
          </div>

          {/* Descuento e impuesto */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descuento ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.descuento}
                onChange={(e) => setForm({ ...form, descuento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Impuesto ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.impuesto}
                onChange={(e) => setForm({ ...form, impuesto: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Total */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            {descuento > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento</span>
                <span>-${descuento.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {impuesto > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Impuesto</span>
                <span>+${impuesto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-200 text-base">
              <span>Total</span>
              <span>${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {mutacion.error && !Object.keys(errores).length && (
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
              disabled={mutacion.isPending}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {mutacion.isPending ? 'Guardando...' : 'Emitir factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
