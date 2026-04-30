import { useAuth } from './useAuth'
import { usePermisosCtx } from '../contexts/PermisosContext'

export function usePermisos(modulo) {
  const { usuario } = useAuth()
  const { permisos } = usePermisosCtx()
  const rol = usuario?.rol ?? ''
  const permisosRol = permisos[rol]?.[modulo] ?? { crear: false, editar: false, eliminar: false }

  return {
    puede: (accion) => permisosRol[accion] ?? false,
    crear: permisosRol.crear ?? false,
    editar: permisosRol.editar ?? false,
    eliminar: permisosRol.eliminar ?? false,
    esAdmin: rol === 'administrador',
    rol,
  }
}
