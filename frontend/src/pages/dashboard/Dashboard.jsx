import { useQuery } from '@tanstack/react-query'
import { Calendar, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react'
import { getDashboard } from '../../api/reportes'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_LABEL = {
  pendiente: 'Pendiente', confirmado: 'Confirmado',
  en_curso: 'En curso', completado: 'Completado',
  cancelado: 'Cancelado', ausente: 'Ausente',
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard().then(r => r.data),
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner /></div>
  }

  const { turnos_hoy, ingresos_hoy, ingresos_mes, alertas_stock, proximos_turnos, top_barberos_mes } = data

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          titulo="Turnos hoy"
          valor={turnos_hoy.total}
          subtitulo={`${turnos_hoy.completados} completados`}
          icono={Calendar}
          color="indigo"
        />
        <StatCard
          titulo="Ingresos hoy"
          valor={`$${Number(ingresos_hoy.total).toLocaleString('es-AR')}`}
          subtitulo={`${ingresos_hoy.cantidad_facturas} facturas`}
          icono={DollarSign}
          color="green"
        />
        <StatCard
          titulo="Ingresos del mes"
          valor={`$${Number(ingresos_mes.total).toLocaleString('es-AR')}`}
          subtitulo={`${ingresos_mes.cantidad_facturas} facturas`}
          icono={TrendingUp}
          color="purple"
        />
        <StatCard
          titulo="Alertas stock"
          valor={alertas_stock.cantidad}
          subtitulo="productos bajo mínimo"
          icono={AlertTriangle}
          color={alertas_stock.cantidad > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Resumen turnos del día */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {['pendiente','confirmado','en_curso','completado','cancelado'].map(e => (
          <div key={e} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{turnos_hoy[e] ?? 0}</p>
            <Badge label={ESTADO_LABEL[e]} variant={e} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Próximos turnos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Próximos turnos del día</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {proximos_turnos.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Sin turnos pendientes</p>
            ) : proximos_turnos.map(t => (
              <div key={t.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    {t.cliente_nombre ?? 'Sin nombre'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t.servicio_nombre} · {t.barbero_nombre}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">
                    {format(new Date(t.fecha_inicio), 'HH:mm')}
                  </p>
                  <Badge label={ESTADO_LABEL[t.estado]} variant={t.estado} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top barberos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Top barberos del mes</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {top_barberos_mes.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Sin datos</p>
            ) : top_barberos_mes.map((b, i) => (
              <div key={b.id} className="px-6 py-3 flex items-center gap-4">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">
                    {b.usuario__first_name} {b.usuario__last_name}
                  </p>
                  <p className="text-xs text-gray-500">{b.turnos_mes} turnos</p>
                </div>
                <p className="text-sm font-semibold text-green-600">
                  ${Number(b.ingresos_mes || 0).toLocaleString('es-AR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alertas stock */}
      {alertas_stock.cantidad > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-800 flex items-center gap-2 mb-3">
            <AlertTriangle size={16} />
            Productos con stock bajo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {alertas_stock.productos.map(p => (
              <div key={p.id} className="bg-white rounded-lg px-4 py-2.5 border border-red-100">
                <p className="font-medium text-sm text-gray-900">{p.nombre}</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Stock: {p.stock_actual} {p.unidad} (mínimo: {p.stock_minimo})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
