import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { crearFactura } from '../../api/facturacion'
import { getClientes } from '../../api/clientes'
import { getBarberos } from '../../api/barberos'
import { useAuth } from '../../hooks/useAuth'

const METODOS_PAGO = [
  { valor: 'efectivo',      label: 'Efectivo' },
  { valor: 'tarjeta',       label: 'Tarjeta crédito/débito' },
  { valor: 'transferencia', label: 'Transferencia bancaria' },
  { valor: 'mercadopago',   label: 'MercadoPago' },
]

const CONDICIONES = [
  { valor: 'no_contribuyente', label: 'No contribuyente' },
  { valor: 'contribuyente',    label: 'Contribuyente (RUC)' },
  { valor: 'extranjero',       label: 'Extranjero' },
]

const TASAS_IVA = [
  { valor: 10, label: 'IVA 10%' },
  { valor: 5,  label: 'IVA 5%' },
  { valor: 0,  label: 'Exento' },
]

const TIPOS = [
  { valor: 'manual',      label: 'Factura Manual (timbrado)' },
  { valor: 'electronica', label: 'e-Factura SIFEN' },
]

const ITEM_VACIO = {
  descripcion: '', cantidad: '1', precio_unitario: '',
  tasa_iva: 10, descuento_monto: '0', descuento_porcentaje: '0',
  usar_pct: false,
}

const gs = (v) => `Gs. ${Math.round(Number(v || 0)).toLocaleString('es-PY')}`

function calcItem(item) {
  const qty   = parseFloat(item.cantidad) || 0
  const price = parseFloat(item.precio_unitario) || 0
  const sub   = qty * price
  const desc  = item.usar_pct
    ? sub * (parseFloat(item.descuento_porcentaje) || 0) / 100
    : parseFloat(item.descuento_monto) || 0
  const neto  = Math.max(sub - desc, 0)
  const tasa  = Number(item.tasa_iva)
  const base  = tasa > 0 ? neto / (1 + tasa / 100) : neto
  const iva   = neto - base
  return { sub, desc, neto, base, iva, tasa }
}

export default function FacturaModal({ onClose }) {
  const { usuario } = useAuth()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    tipo_comprobante: 'manual',
    numero_timbrado: '',
    numero_factura: '',
    cdc: '',
    cliente: '',
    condicion_cliente: 'no_contribuyente',
    cliente_ruc_ci: '',
    barbero: '',
    metodo_pago: 'efectivo',
    codigo_promocion: '',
    descuento_promocion: '0',
  })
  const [items, setItems] = useState([{ ...ITEM_VACIO }])
  const [errores, setErrores] = useState({})
  const [mostrarPromo, setMostrarPromo] = useState(false)

  const { data: clientesData } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: () => getClientes({ page: 1, por_pagina: 100 }).then(r => r.data),
  })
  const { data: barberosData } = useQuery({
    queryKey: ['barberos'],
    queryFn: () => getBarberos().then(r => r.data),
  })

  const clientes = clientesData?.resultados ?? []
  const barberos = barberosData?.resultados ?? barberosData ?? []

  // Auto-completar RUC/CI al seleccionar cliente
  function onClienteChange(e) {
    const id = e.target.value
    const cli = clientes.find(c => String(c.id) === String(id))
    setForm(f => ({
      ...f,
      cliente: id,
      cliente_ruc_ci: cli?.ruc_ci ?? f.cliente_ruc_ci,
      condicion_cliente: cli?.ruc_ci?.includes('-') ? 'contribuyente' : 'no_contribuyente',
    }))
  }

  // Cálculos generales
  const calcs = items.map(calcItem)
  const subtotalBruto   = calcs.reduce((a, c) => a + c.sub, 0)
  const totalDescDetalle = calcs.reduce((a, c) => a + c.desc, 0)
  const descPromo       = parseFloat(form.descuento_promocion) || 0
  const subtotalNeto    = Math.max(subtotalBruto - totalDescDetalle - descPromo, 0)
  const base10 = calcs.filter(c => c.tasa === 10).reduce((a, c) => a + c.base, 0)
  const iva10  = calcs.filter(c => c.tasa === 10).reduce((a, c) => a + c.iva, 0)
  const base5  = calcs.filter(c => c.tasa === 5).reduce((a, c) => a + c.base, 0)
  const iva5   = calcs.filter(c => c.tasa === 5).reduce((a, c) => a + c.iva, 0)
  const exentas = calcs.filter(c => c.tasa === 0).reduce((a, c) => a + c.neto, 0)
  const total  = subtotalNeto

  const mutacion = useMutation({
    mutationFn: crearFactura,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facturas'] }); onClose() },
    onError: (err) => {
      const data = err?.response?.data
      if (data && typeof data === 'object') setErrores(data)
    },
  })

  function setItem(idx, campo, valor) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setErrores({})

    const payload = {
      cliente:         parseInt(form.cliente),
      barbero:         parseInt(form.barbero),
      sucursal:        usuario?.sucursal_id ?? null,
      tipo_comprobante: form.tipo_comprobante,
      numero_timbrado: form.numero_timbrado,
      numero_factura:  form.numero_factura,
      cdc:             form.cdc,
      condicion_cliente: form.condicion_cliente,
      cliente_ruc_ci:  form.cliente_ruc_ci,
      metodo_pago:     form.metodo_pago,
      codigo_promocion:    form.codigo_promocion,
      descuento_promocion: descPromo,
      items: items.map((it, i) => ({
        descripcion:          it.descripcion,
        cantidad:             parseFloat(it.cantidad),
        precio_unitario:      parseFloat(it.precio_unitario),
        tasa_iva:             Number(it.tasa_iva),
        descuento_monto:      it.usar_pct ? 0 : parseFloat(it.descuento_monto) || 0,
        descuento_porcentaje: it.usar_pct ? parseFloat(it.descuento_porcentaje) || 0 : 0,
      })),
    }

    mutacion.mutate(payload)
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'
  const err = (campo) => errores[campo] && (
    <p className="text-xs text-red-500 mt-1">
      {Array.isArray(errores[campo]) ? errores[campo][0] : errores[campo]}
    </p>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[95vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900">Nueva factura</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* ── Tipo de comprobante ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tipo de comprobante <span className="text-red-500">*</span>
              </label>
              <select value={form.tipo_comprobante} onChange={e => setForm({ ...form, tipo_comprobante: e.target.value })} className={inputCls}>
                {TIPOS.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {form.tipo_comprobante === 'manual' ? 'N° timbrado' : 'CDC (44 dígitos)'}
              </label>
              {form.tipo_comprobante === 'manual' ? (
                <input value={form.numero_timbrado} onChange={e => setForm({ ...form, numero_timbrado: e.target.value })} className={inputCls} placeholder="Ej: 15007000" />
              ) : (
                <input value={form.cdc} onChange={e => setForm({ ...form, cdc: e.target.value })} className={inputCls} maxLength={44} placeholder="CDC de 44 dígitos" />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">N° de factura</label>
            <input value={form.numero_factura} onChange={e => setForm({ ...form, numero_factura: e.target.value })} className={`${inputCls} font-mono`} placeholder="001-001-0000001" />
          </div>

          {/* ── Cliente ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cliente <span className="text-red-500">*</span>
              </label>
              <select required value={form.cliente} onChange={onClienteChange} className={inputCls}>
                <option value="">Seleccionar...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
                ))}
              </select>
              {err('cliente')}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                RUC / CI <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.cliente_ruc_ci}
                onChange={e => setForm({ ...form, cliente_ruc_ci: e.target.value })}
                className={`${inputCls} font-mono`}
                placeholder="80123456-7 o 1234567"
              />
              {err('cliente_ruc_ci')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Condición</label>
              <select value={form.condicion_cliente} onChange={e => setForm({ ...form, condicion_cliente: e.target.value })} className={inputCls}>
                {CONDICIONES.map(c => <option key={c.valor} value={c.valor}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Barbero <span className="text-red-500">*</span>
              </label>
              <select required value={form.barbero} onChange={e => setForm({ ...form, barbero: e.target.value })} className={inputCls}>
                <option value="">Seleccionar...</option>
                {barberos.map(b => <option key={b.id} value={b.id}>{b.usuario_nombre}</option>)}
              </select>
              {err('barbero')}
            </div>
          </div>

          {/* ── Ítems ────────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">
                Ítems <span className="text-red-500">*</span>
              </label>
              <button type="button" onClick={() => setItems(p => [...p, { ...ITEM_VACIO }])}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700">
                <Plus size={13} /> Agregar ítem
              </button>
            </div>

            {/* Cabecera */}
            <div className="grid grid-cols-12 gap-1 text-xs font-medium text-gray-500 px-1 mb-1">
              <span className="col-span-3">Descripción</span>
              <span className="col-span-1 text-center">Cant.</span>
              <span className="col-span-2">Precio unit. (Gs.)</span>
              <span className="col-span-2">IVA</span>
              <span className="col-span-2">Descuento</span>
              <span className="col-span-1 text-right">Neto</span>
              <span className="col-span-1" />
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => {
                const c = calcItem(item)
                return (
                  <div key={idx} className="grid grid-cols-12 gap-1 items-center">
                    <input
                      required
                      value={item.descripcion}
                      onChange={e => setItem(idx, 'descripcion', e.target.value)}
                      placeholder="Descripción"
                      className="col-span-3 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      required type="number" min="0.01" step="0.01"
                      value={item.cantidad}
                      onChange={e => setItem(idx, 'cantidad', e.target.value)}
                      className="col-span-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      required type="number" min="0" step="1"
                      value={item.precio_unitario}
                      onChange={e => setItem(idx, 'precio_unitario', e.target.value)}
                      placeholder="0"
                      className="col-span-2 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <select
                      value={item.tasa_iva}
                      onChange={e => setItem(idx, 'tasa_iva', Number(e.target.value))}
                      className="col-span-2 px-2 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {TASAS_IVA.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
                    </select>
                    {/* Descuento: toggle % vs monto */}
                    <div className="col-span-2 flex items-center gap-1">
                      <input
                        type="number" min="0" step="0.01"
                        value={item.usar_pct ? item.descuento_porcentaje : item.descuento_monto}
                        onChange={e => setItem(idx, item.usar_pct ? 'descuento_porcentaje' : 'descuento_monto', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => setItem(idx, 'usar_pct', !item.usar_pct)}
                        className="px-1.5 py-1.5 border border-gray-300 rounded text-xs text-gray-500 hover:bg-gray-50"
                        title={item.usar_pct ? 'Cambiar a monto fijo' : 'Cambiar a porcentaje'}
                      >
                        {item.usar_pct ? '%' : 'Gs'}
                      </button>
                    </div>
                    <div className="col-span-1 text-right text-xs font-medium text-gray-800 pr-1">
                      {Math.round(c.neto).toLocaleString('es-PY')}
                    </div>
                    <button
                      type="button"
                      onClick={() => items.length > 1 && setItems(p => p.filter((_, i) => i !== idx))}
                      disabled={items.length === 1}
                      className="col-span-1 flex justify-center text-gray-400 hover:text-red-500 disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Descuento por promoción ──────────────────────────────────── */}
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setMostrarPromo(v => !v)}
              className="flex items-center justify-between w-full px-4 py-2.5 bg-gray-50 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <span>Descuento por promoción (cabecera)</span>
              {mostrarPromo ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {mostrarPromo && (
              <div className="grid grid-cols-2 gap-4 px-4 py-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Código promoción</label>
                  <input
                    value={form.codigo_promocion}
                    onChange={e => setForm({ ...form, codigo_promocion: e.target.value })}
                    className={inputCls}
                    placeholder="Ej: PROMO10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Descuento (Gs.)</label>
                  <input
                    type="number" min="0" step="1"
                    value={form.descuento_promocion}
                    onChange={e => setForm({ ...form, descuento_promocion: e.target.value })}
                    className={inputCls}
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Método de pago ───────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Método de pago</label>
            <select value={form.metodo_pago} onChange={e => setForm({ ...form, metodo_pago: e.target.value })} className={inputCls}>
              {METODOS_PAGO.map(m => <option key={m.valor} value={m.valor}>{m.label}</option>)}
            </select>
          </div>

          {/* ── Pie de factura ───────────────────────────────────────────── */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm border border-gray-100">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal bruto</span><span>{gs(subtotalBruto)}</span>
            </div>
            {totalDescDetalle > 0 && (
              <div className="flex justify-between text-red-500">
                <span>(−) Descuentos detalle</span><span>{gs(totalDescDetalle)}</span>
              </div>
            )}
            {descPromo > 0 && (
              <div className="flex justify-between text-red-500">
                <span>(−) Desc. promoción {form.codigo_promocion && `[${form.codigo_promocion}]`}</span>
                <span>{gs(descPromo)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-700 font-medium border-t border-gray-200 pt-1.5">
              <span>Subtotal neto</span><span>{gs(subtotalNeto)}</span>
            </div>
            <div className="pt-1 space-y-0.5 text-xs text-gray-500 border-t border-dashed border-gray-200">
              {base10 > 0 && <>
                <div className="flex justify-between"><span>Base imponible 10%</span><span>{gs(base10)}</span></div>
                <div className="flex justify-between"><span>IVA 10%</span><span>{gs(iva10)}</span></div>
              </>}
              {base5 > 0 && <>
                <div className="flex justify-between"><span>Base imponible 5%</span><span>{gs(base5)}</span></div>
                <div className="flex justify-between"><span>IVA 5%</span><span>{gs(iva5)}</span></div>
              </>}
              {exentas > 0 && (
                <div className="flex justify-between"><span>Exentas</span><span>{gs(exentas)}</span></div>
              )}
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t-2 border-gray-300">
              <span>TOTAL GENERAL</span><span>{gs(total)}</span>
            </div>
          </div>

          {mutacion.error && !Object.keys(errores).length && (
            <p className="text-xs text-red-500">Error al guardar. Revisá los datos.</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={mutacion.isPending}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {mutacion.isPending ? 'Guardando...' : 'Emitir factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
