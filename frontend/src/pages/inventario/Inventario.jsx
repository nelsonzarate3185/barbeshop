import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { getProductos } from '../../api/inventario'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function Inventario() {
  const [pagina, setPagina] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['productos', pagina],
    queryFn: () => getProductos({ page: pagina }).then(r => r.data),
    placeholderData: prev => prev,
  })

  const lista = data?.resultados ?? []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Inventario</h2>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : lista.length === 0 ? (
          <EmptyState mensaje="Sin productos registrados" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Producto','SKU','Stock','Mínimo','Precio venta','Estado'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lista.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {p.stock_actual} {p.unidad}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.stock_minimo}</td>
                  <td className="px-4 py-3 text-gray-700">
                    ${Number(p.precio_venta).toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-3">
                    {p.bajo_stock ? (
                      <span className="flex items-center gap-1 text-xs text-red-600">
                        <AlertTriangle size={12} /> Bajo stock
                      </span>
                    ) : (
                      <span className="text-xs text-green-600">OK</span>
                    )}
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
              <button disabled={!data.anterior} onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1.5 text-xs rounded border border-gray-200 disabled:opacity-40">Anterior</button>
              <span className="px-3 py-1.5 text-xs">{data.pagina_actual} / {data.paginas}</span>
              <button disabled={!data.siguiente} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1.5 text-xs rounded border border-gray-200 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
