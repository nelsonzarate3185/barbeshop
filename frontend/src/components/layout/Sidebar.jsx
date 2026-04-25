import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Users, Scissors,
  Package, FileText, BarChart2, LogOut, Boxes,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV = [
  { to: '/',            label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/turnos',      label: 'Turnos',       icon: Calendar },
  { to: '/clientes',    label: 'Clientes',     icon: Users },
  { to: '/barberos',    label: 'Barberos',     icon: Scissors },
  { to: '/servicios',   label: 'Servicios',    icon: Boxes },
  { to: '/inventario',  label: 'Inventario',   icon: Package },
  { to: '/facturacion', label: 'Facturación',  icon: FileText },
  { to: '/reportes',    label: 'Reportes',     icon: BarChart2 },
]

export default function Sidebar() {
  const { usuario, cerrarSesion } = useAuth()

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-gray-900 text-white flex flex-col z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Scissors size={20} className="text-indigo-400" />
          <span className="font-bold text-lg">Barbería</span>
        </div>
        {usuario && (
          <p className="text-xs text-gray-400 mt-1 truncate">{usuario.nombre_completo}</p>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-700">
        <button
          onClick={cerrarSesion}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
