import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { getFacturas } from '../../api/facturacion'
import { usePermisos } from '../../hooks/usePermisos'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import FacturaModal from './FacturaModal'

const METODO_LABEL = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  mercadopago: 'MercadoPago',
}

export default function Facturacion() {
  const [pagina, setPagina] = useState(1)
  const [modalAbierto, setModalAbierto] = useState(false)

  const { crear } = usePermisos('facturacion')

  const { data, isLoading } = useQuery({
    queryKey: ['facturas', pagina],
    queryFn: () => getFacturas({ page: pagina }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const lista = data?.resultados ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Facturación</h2>
        {crear && (
          <button
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Nueva factura
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : lista.length === 0 ? (
          <EmptyState mensaje="Sin facturas registradas" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['N° Factura', 'Tipo', 'Fecha', 'Cliente', 'RUC/CI', 'Barbero', 'Total', 'Método'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lista.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{f.numero_factura || `#${f.id}`}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${f.tipo_comprobante === 'electronica' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                      {f.tipo_comprobante === 'electronica' ? 'e-Factura' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {format(new Date(f.creado_en), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{f.cliente_nombre}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{f.cliente_ruc_ci || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{f.barbero_nombre}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                    Gs. {Math.round(Number(f.total)).toLocaleString('es-PY')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {METODO_LABEL[f.metodo_pago] ?? f.metodo_pago_display ?? f.metodo_pago}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data && data.paginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Total: {data.total}</p>
            <div className="flex gap-2">
              <button
                disabled={!data.anterior}
                onClick={() => setPagina((p) => p - 1)}
                className="px-3 py-1.5 text-xs rounded border border-gray-200 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="px-3 py-1.5 text-xs">
                {data.pagina_actual} / {data.paginas}
              </span>
              <button
                disabled={!data.siguiente}
                onClick={() => setPagina((p) => p + 1)}
                className="px-3 py-1.5 text-xs rounded border border-gray-200 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {modalAbierto && <FacturaModal onClose={() => setModalAbierto(false)} />}
    </div>
  )
}
