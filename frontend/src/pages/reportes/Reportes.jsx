import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { Download, ChevronDown, ChevronUp } from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, ResponsiveContainer, Legend,
} from 'recharts'
import { getIngresos, getRendimientoBarberos, getClientesFrecuentes, getDetalleServicios } from '../../api/reportes'
import { getBarberos } from '../../api/barberos'
import Spinner from '../../components/ui/Spinner'
import Card from '../../components/ui/Card'

const fmtPeso = (v) => `$${Number(v || 0).toLocaleString('es-AR')}`

const METODO_LABEL = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  mercadopago: 'MercadoPago',
}

export default function Reportes() {
  const hoy = format(new Date(), 'yyyy-MM-dd')
  const [desde, setDesde] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'))
  const [hasta, setHasta] = useState(hoy)

  const [barberoFiltro, setBarberoFiltro] = useState('')
  const [clienteQ, setClienteQ]           = useState('')
  const [seccionAbierta, setSeccionAbierta] = useState(true)

  const { data: ingresos, isLoading: loadIngresos } = useQuery({
    queryKey: ['ingresos', desde, hasta],
    queryFn: () => getIngresos({ desde, hasta, agrupar_por: 'dia' }).then(r => r.data),
  })

  const { data: barberos, isLoading: loadBarberos } = useQuery({
    queryKey: ['rendimiento', desde, hasta],
    queryFn: () => getRendimientoBarberos({ desde, hasta }).then(r => r.data),
  })

  const { data: clientes } = useQuery({
    queryKey: ['clientes-frecuentes', desde, hasta],
    queryFn: () => getClientesFrecuentes({ desde, hasta, limit: 5 }).then(r => r.data),
  })

  const { data: listaBarberos } = useQuery({
    queryKey: ['barberos-lista'],
    queryFn: () => getBarberos().then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: detalle, isLoading: loadDetalle } = useQuery({
    queryKey: ['detalle-servicios', desde, hasta, barberoFiltro, clienteQ],
    queryFn: () =>
      getDetalleServicios({
        desde,
        hasta,
        ...(barberoFiltro ? { barbero: barberoFiltro } : {}),
        ...(clienteQ      ? { cliente_q: clienteQ }   : {}),
      }).then(r => r.data),
    enabled: seccionAbierta,
  })

  const chartData = ingresos?.por_periodo?.map(p => ({
    fecha: format(new Date(p.periodo), 'dd/MM'),
    ingresos: Number(p.ingresos || 0),
    facturas: p.cantidad_facturas,
  })) ?? []

  const barData = barberos?.datos?.map(b => ({
    nombre: b.usuario__first_name,
    completados: b.turnos_completados,
    ingresos: Number(b.ingresos_generados || 0),
  })) ?? []

  const opcionesBarberos = listaBarberos?.resultados ?? listaBarberos?.results ?? listaBarberos ?? []
  const filas = detalle?.datos ?? []

  function exportarExcel() {
    const headers = ['Fecha', 'Barbero', 'Cliente', 'Teléfono', 'Servicio', 'Cant.', 'Precio unit.', 'Subtotal', 'Método de pago']
    const cuerpo = filas.map(r => [
      r.fecha, r.barbero_nombre, r.cliente_nombre, r.cliente_telefono,
      r.servicio_nombre, Number(r.cantidad), Number(r.precio_unitario), Number(r.subtotal),
      METODO_LABEL[r.metodo_pago] ?? r.metodo_pago,
    ])
    const total = filas.reduce((acc, r) => acc + Number(r.subtotal), 0)
    const filaTotal = ['', '', '', '', '', '', 'TOTAL', total, '']
    const hoja = XLSX.utils.aoa_to_sheet([headers, ...cuerpo, filaTotal])
    hoja['!cols'] = [
      { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 14 },
      { wch: 26 }, { wch: 8 },  { wch: 14 }, { wch: 14 }, { wch: 16 },
    ]
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Detalle servicios')
    XLSX.writeFile(libro, `reporte-servicios-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* Header + date range */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Reportes</h2>
        <div className="flex items-center gap-2">
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <span className="text-gray-400 text-sm">—</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      {/* Totales */}
      {ingresos && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total ingresos', value: fmtPeso(ingresos.totales.total_ingresos) },
            { label: 'Facturas emitidas', value: ingresos.totales.total_facturas },
            { label: 'Promedio por factura', value: fmtPeso(ingresos.totales.promedio_factura) },
          ].map(s => (
            <Card key={s.label}>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Gráfico ingresos */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Ingresos diarios</h3>
        {loadIngresos ? <div className="flex justify-center py-12"><Spinner /></div> : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmtPeso(v)} />
              <Area type="monotone" dataKey="ingresos" stroke="#6366f1" fill="url(#colorIngresos)" strokeWidth={2} name="Ingresos" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Rendimiento barberos */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Rendimiento por barbero</h3>
        {loadBarberos ? <div className="flex justify-center py-12"><Spinner /></div> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="completados" fill="#6366f1" name="Turnos" radius={[4,4,0,0]} />
              <Bar yAxisId="right" dataKey="ingresos" fill="#10b981" name="Ingresos $" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Top clientes */}
      {clientes?.datos?.length > 0 && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Clientes frecuentes</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="pb-2">#</th>
                <th className="pb-2">Cliente</th>
                <th className="pb-2">Turnos</th>
                <th className="pb-2">Total gastado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientes.datos.map((c, i) => (
                <tr key={c.id}>
                  <td className="py-2.5 text-gray-400 font-medium">{i + 1}</td>
                  <td className="py-2.5 font-medium text-gray-900">{c.nombre} {c.apellido}</td>
                  <td className="py-2.5 text-gray-600">{c.turnos_completados}</td>
                  <td className="py-2.5 font-semibold text-green-600">{fmtPeso(c.total_gastado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Detalle de servicios */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSeccionAbierta(v => !v)}
            className="flex items-center gap-2 text-left group"
          >
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
              Detalle de servicios
            </h3>
            {seccionAbierta
              ? <ChevronUp size={16} className="text-gray-400" />
              : <ChevronDown size={16} className="text-gray-400" />}
          </button>
          {seccionAbierta && filas.length > 0 && (
            <button
              onClick={exportarExcel}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Download size={14} />
              Descargar Excel
            </button>
          )}
        </div>

        {seccionAbierta && (
          <>
            {/* Filtros */}
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={barberoFiltro}
                onChange={e => setBarberoFiltro(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos los barberos</option>
                {opcionesBarberos.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.usuario_nombre ?? b.usuario?.nombre_completo ?? `Barbero ${b.id}`}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={clienteQ}
                onChange={e => setClienteQ(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[180px]"
              />
            </div>

            {/* Contador */}
            {!loadDetalle && (
              <p className="text-xs text-gray-500 mb-3">
                {filas.length === 0
                  ? 'Sin registros para el período seleccionado.'
                  : `${filas.length} registro${filas.length !== 1 ? 's' : ''}`}
              </p>
            )}

            {/* Grilla */}
            {loadDetalle ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : filas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Fecha', 'Barbero', 'Cliente', 'Teléfono', 'Servicio', 'Cant.', 'Precio unit.', 'Subtotal', 'Método de pago'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filas.map((row, idx) => (
                      <tr key={`${row.factura_id}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{row.fecha}</td>
                        <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{row.barbero_nombre}</td>
                        <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{row.cliente_nombre}</td>
                        <td className="px-3 py-2.5 text-gray-500">{row.cliente_telefono}</td>
                        <td className="px-3 py-2.5 text-gray-900 font-medium">{row.servicio_nombre}</td>
                        <td className="px-3 py-2.5 text-gray-600 text-right">{row.cantidad}</td>
                        <td className="px-3 py-2.5 text-gray-600 text-right">{fmtPeso(row.precio_unitario)}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-900 text-right">{fmtPeso(row.subtotal)}</td>
                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                          {METODO_LABEL[row.metodo_pago] ?? row.metodo_pago}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr>
                      <td colSpan={7} className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">
                        Total
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-gray-900">
                        {fmtPeso(filas.reduce((acc, r) => acc + Number(r.subtotal), 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  )
}
