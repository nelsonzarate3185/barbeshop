export default function Spinner({ className = 'h-8 w-8' }) {
  return (
    <div className={`animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 ${className}`} />
  )
}
