import { Inbox } from 'lucide-react'

export default function EmptyState({ mensaje = 'Sin resultados', descripcion }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Inbox size={40} className="mb-3" />
      <p className="font-medium text-gray-600">{mensaje}</p>
      {descripcion && <p className="text-sm mt-1">{descripcion}</p>}
    </div>
  )
}
