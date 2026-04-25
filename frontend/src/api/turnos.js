import api from '../lib/axios'

export const getTurnos = (params) => api.get('/turnos/', { params })
export const getTurno = (id) => api.get(`/turnos/${id}/`)
export const crearTurno = (data) => api.post('/turnos/', data)
export const cambiarEstado = (id, estado) => api.patch(`/turnos/${id}/cambiar_estado/`, { estado })
