import { AlertTriangle } from 'lucide-react'

export default function ConfirmarEliminar({ nombre, onConfirmar, onCancelar, cargando }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Eliminar cliente</h3>
            <p className="text-xs text-gray-500 mt-0.5">Esta acción no se puede deshacer</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          ¿Estás seguro que querés eliminar a{' '}
          <span className="font-medium text-gray-900">{nombre}</span>?
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancelar}
            disabled={cargando}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={cargando}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {cargando ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
