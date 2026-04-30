const PERMISOS_KEY = 'permisos_roles'

export const ROLES = [
  { valor: 'administrador', label: 'Administrador' },
  { valor: 'recepcionista', label: 'Recepcionista' },
  { valor: 'barbero', label: 'Barbero' },
]

export const MODULOS = [
  { valor: 'clientes', label: 'Clientes', acciones: ['crear', 'editar', 'eliminar'] },
  { valor: 'barberos', label: 'Barberos', acciones: ['crear', 'editar', 'eliminar'] },
  { valor: 'servicios', label: 'Servicios', acciones: ['crear', 'editar', 'eliminar'] },
  { valor: 'categorias', label: 'Categorías', acciones: ['crear', 'editar', 'eliminar'] },
  { valor: 'inventario', label: 'Inventario', acciones: ['crear', 'editar', 'eliminar'] },
  // Facturación: el backend no permite editar ni eliminar facturas
  { valor: 'facturacion', label: 'Facturación', acciones: ['crear'] },
]

export const ACCIONES = [
  { valor: 'crear', label: 'Crear' },
  { valor: 'editar', label: 'Editar' },
  { valor: 'eliminar', label: 'Eliminar' },
]

const todosTrue = (acciones) => Object.fromEntries(acciones.map((a) => [a, true]))
const todosFalse = (acciones) => Object.fromEntries(acciones.map((a) => [a, false]))

export const DEFAULTS = {
  administrador: Object.fromEntries(
    MODULOS.map((m) => [m.valor, todosTrue(m.acciones)])
  ),
  recepcionista: {
    clientes: { crear: true, editar: true, eliminar: false },
    barberos: { crear: false, editar: false, eliminar: false },
    servicios: { crear: false, editar: false, eliminar: false },
    categorias: { crear: false, editar: false, eliminar: false },
    inventario: { crear: false, editar: false, eliminar: false },
    facturacion: { crear: true },
  },
  barbero: Object.fromEntries(
    MODULOS.map((m) => [m.valor, todosFalse(m.acciones)])
  ),
}

export function cargarPermisos() {
  try {
    const stored = localStorage.getItem(PERMISOS_KEY)
    if (!stored) return structuredClone(DEFAULTS)
    const parsed = JSON.parse(stored)
    return {
      ...structuredClone(DEFAULTS),
      ...parsed,
      // Administrador siempre tiene acceso total
      administrador: DEFAULTS.administrador,
    }
  } catch {
    return structuredClone(DEFAULTS)
  }
}

export function guardarPermisos(permisos) {
  const aGuardar = {
    ...permisos,
    administrador: DEFAULTS.administrador,
  }
  localStorage.setItem(PERMISOS_KEY, JSON.stringify(aGuardar))
}
