import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, ResponsiveContainer, Legend,
} from 'recharts'
import { getIngresos, getRendimientoBarberos, getClientesFrecuentes } from '../../api/reportes'
import Spinner from '../../components/ui/Spinner'
import Card from '../../components/ui/Card'

const fmtPeso = (v) => `$${Number(v || 0).toLocaleString('es-AR')}`

export default function Reportes() {
  const hoy = format(new Date(), 'yyyy-MM-dd')
  const [desde, setDesde] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'))
  const [hasta, setHasta] = useState(hoy)

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

  return (
    <div className="space-y-6">
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
    </div>
  )
}
