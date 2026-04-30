import { useState } from 'react'
import { ShieldCheck, Info } from 'lucide-react'
import { usePermisosCtx } from '../../contexts/PermisosContext'
import { usePermisos } from '../../hooks/usePermisos'
import { MODULOS, DEFAULTS } from '../../lib/permisos'

const ROLES_EDITABLES = [
  { valor: 'recepcionista', label: 'Recepcionista' },
  { valor: 'barbero', label: 'Barbero' },
]

export default function PermisosRoles() {
  const { permisos, actualizarPermisos } = usePermisosCtx()
  const { esAdmin } = usePermisos('clientes')
  const [rolSeleccionado, setRolSeleccionado] = useState('recepcionista')
  const [local, setLocal] = useState(() => structuredClone(permisos))
  const [guardado, setGuardado] = useState(false)

  if (!esAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldCheck size={40} className="text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Acceso restringido</p>
        <p className="text-sm text-gray-400 mt-1">
          Solo los administradores pueden configurar permisos.
        </p>
      </div>
    )
  }

  function togglePermiso(modulo, accion) {
    setLocal((prev) => ({
      ...prev,
      [rolSeleccionado]: {
        ...prev[rolSeleccionado],
        [modulo]: {
          ...prev[rolSeleccionado]?.[modulo],
          [accion]: !prev[rolSeleccionado]?.[modulo]?.[accion],
        },
      },
    }))
    setGuardado(false)
  }

  function guardar() {
    actualizarPermisos(local)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 3000)
  }

  function restaurar() {
    setLocal(structuredClone(DEFAULTS))
    setGuardado(false)
  }

  const permisosRol = local[rolSeleccionado] ?? {}

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Permisos por rol</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configurá qué acciones puede realizar cada rol en cada módulo.
        </p>
      </div>

      {/* Selector de rol */}
      <div className="flex gap-2">
        {ROLES_EDITABLES.map((r) => (
          <button
            key={r.valor}
            onClick={() => setRolSeleccionado(r.valor)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              rolSeleccionado === r.valor
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {r.label}
          </button>
        ))}
        <div className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
          Administrador — acceso total
        </div>
      </div>

      {/* Tabla de permisos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Módulo
              </th>
              <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Crear
              </th>
              <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Editar
              </th>
              <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Eliminar
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {MODULOS.map((m) => (
              <tr key={m.valor} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-800">{m.label}</td>
                {['crear', 'editar', 'eliminar'].map((accion) => {
                  const habilitado = m.acciones.includes(accion)
                  const checked = permisosRol[m.valor]?.[accion] ?? false
                  return (
                    <td key={accion} className="px-5 py-4 text-center">
                      {habilitado ? (
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermiso(m.valor, accion)}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </label>
                      ) : (
                        <span
                          className="inline-block w-4 h-4 rounded bg-gray-100"
                          title="No disponible en este módulo"
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-700">
        <Info size={16} className="flex-shrink-0" />
        <p>
          Los cambios aplican inmediatamente. El casillero gris (—) indica que la acción no existe
          en ese módulo (ej: Facturación no permite editar ni eliminar facturas).
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={guardar}
          className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Guardar cambios
        </button>
        <button
          onClick={restaurar}
          className="px-5 py-2 text-gray-600 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          Restaurar valores por defecto
        </button>
        {guardado && (
          <span className="text-sm text-green-600 font-medium">✓ Cambios guardados</span>
        )}
      </div>
    </div>
  )
}
