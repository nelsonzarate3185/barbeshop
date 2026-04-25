import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, User } from 'lucide-react'
import { getClientes } from '../../api/clientes'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function Clientes() {
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', pagina, busqueda],
    queryFn: () => getClientes({ page: pagina, search: busqueda || undefined }).then(r => r.data),
    placeholderData: prev => prev,
  })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
          placeholder="Buscar por nombre o teléfono..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : data?.resultados?.length === 0 ? (
          <EmptyState mensaje="No se encontraron clientes" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Cliente','Teléfono','Email','Frecuente','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.resultados?.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User size={14} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{c.nombre} {c.apellido}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.telefono}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email || '—'}</td>
                  <td className="px-4 py-3">
                    {c.es_cliente_frecuente
                      ? <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Frecuente</span>
                      : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-indigo-600 hover:underline">Ver historial</button>
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
              <span className="px-3 py-1.5 text-xs text-gray-600">{data.pagina_actual} / {data.paginas}</span>
              <button disabled={!data.siguiente} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1.5 text-xs rounded border border-gray-200 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
