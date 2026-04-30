import { createContext, useContext, useState } from 'react'
import { cargarPermisos, guardarPermisos } from '../lib/permisos'

const PermisosContext = createContext(null)

export function PermisosProvider({ children }) {
  const [permisos, setPermisos] = useState(() => cargarPermisos())

  function actualizarPermisos(nuevos) {
    guardarPermisos(nuevos)
    setPermisos(cargarPermisos())
  }

  return (
    <PermisosContext.Provider value={{ permisos, actualizarPermisos }}>
      {children}
    </PermisosContext.Provider>
  )
}

export const usePermisosCtx = () => useContext(PermisosContext)
