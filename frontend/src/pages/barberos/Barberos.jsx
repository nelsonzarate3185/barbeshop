import { useQuery } from '@tanstack/react-query'
import { Scissors } from 'lucide-react'
import { getBarberos } from '../../api/barberos'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function Barberos() {
  const { data, isLoading } = useQuery({
    queryKey: ['barberos'],
    queryFn: () => getBarberos().then(r => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>

  const lista = data?.resultados ?? data ?? []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Barberos</h2>

      {lista.length === 0 ? <EmptyState mensaje="Sin barberos registrados" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {lista.map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Scissors size={20} className="text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {b.usuario__first_name ?? b.nombre} {b.usuario__last_name ?? ''}
                  </p>
                  <p className="text-sm text-gray-500">{b.especialidad || 'General'}</p>
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Comisión</span>
                  <span className="font-medium">
                    {b.tipo_comision === 'porcentaje' ? `${b.valor_comision}%` : `$${b.valor_comision}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
