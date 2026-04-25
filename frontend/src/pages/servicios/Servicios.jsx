import { useQuery } from '@tanstack/react-query'
import { Clock, DollarSign } from 'lucide-react'
import { getServicios } from '../../api/barberos'
import Spinner from '../../components/ui/Spinner'

export default function Servicios() {
  const { data, isLoading } = useQuery({
    queryKey: ['servicios'],
    queryFn: () => getServicios().then(r => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>

  const lista = data?.resultados ?? data ?? []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Servicios</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {lista.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="font-semibold text-gray-900">{s.nombre}</p>
            {s.categoria_nombre && (
              <p className="text-xs text-indigo-600 mt-0.5">{s.categoria_nombre}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Clock size={13} /> {s.duracion_minutos} min
              </span>
              <span className="flex items-center gap-1">
                <DollarSign size={13} /> ${Number(s.precio_base).toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
