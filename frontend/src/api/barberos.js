import api from '../lib/axios'

export const getBarberos = (params) => api.get('/barberos/', { params })
export const getBarbero = (id) => api.get(`/barberos/${id}/`)
export const crearBarbero = (data) => api.post('/barberos/', data)
export const actualizarBarbero = (id, data) => api.patch(`/barberos/${id}/`, data)
export const eliminarBarbero = (id) => api.delete(`/barberos/${id}/`)
export const getDisponibilidad = (id, fecha) =>
  api.get(`/barberos/${id}/disponibilidad/`, { params: { fecha } })
export const getUsuariosBarbero = () =>
  api.get('/auth/usuarios/', { params: { rol: 'barbero' } })
export const getServicios = () => api.get('/servicios/')
