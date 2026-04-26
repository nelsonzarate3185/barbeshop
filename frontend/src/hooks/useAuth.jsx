import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as apiLogin, logout as apiLogout, getPerfil } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      getPerfil()
        .then(({ data }) => setUsuario(data))
        .catch(() => localStorage.clear())
        .finally(() => setCargando(false))
    } else {
      setCargando(false)
    }
  }, [])

  const iniciarSesion = async (credentials) => {
    const { data } = await apiLogin(credentials)
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    setUsuario(data.usuario)
    navigate('/')
  }

  const cerrarSesion = async () => {
    const refresh = localStorage.getItem('refresh_token')
    try { await apiLogout(refresh) } catch {}
    localStorage.clear()
    setUsuario(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
