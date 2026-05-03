import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { PermisosProvider } from './contexts/PermisosContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Turnos from './pages/turnos/Turnos'
import Clientes from './pages/clientes/Clientes'
import Barberos from './pages/barberos/Barberos'
import Servicios from './pages/servicios/Servicios'
import Inventario from './pages/inventario/Inventario'
import Facturacion from './pages/facturacion/Facturacion'
import Reportes from './pages/reportes/Reportes'
import Categorias from './pages/categorias/Categorias'
import PermisosRoles from './pages/configuracion/PermisosRoles'
import Asistencia from './pages/asistencia/Asistencia'
import Spinner from './components/ui/Spinner'

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function ProtectedRoute({ children }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return <div className="flex justify-center items-center min-h-screen"><Spinner /></div>
  return usuario ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="turnos" element={<Turnos />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="barberos" element={<Barberos />} />
        <Route path="servicios" element={<Servicios />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="facturacion" element={<Facturacion />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="categorias" element={<Categorias />} />
        <Route path="asistencia" element={<Asistencia />} />
        <Route path="configuracion/permisos" element={<PermisosRoles />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <PermisosProvider>
            <AppRoutes />
          </PermisosProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
