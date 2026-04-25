const VARIANTS = {
  pendiente:  'bg-yellow-100 text-yellow-800',
  confirmado: 'bg-blue-100 text-blue-800',
  en_curso:   'bg-purple-100 text-purple-800',
  completado: 'bg-green-100 text-green-800',
  cancelado:  'bg-red-100 text-red-800',
  ausente:    'bg-gray-100 text-gray-700',
  default:    'bg-gray-100 text-gray-700',
}

export default function Badge({ label, variant }) {
  const cls = VARIANTS[variant] ?? VARIANTS.default
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}
