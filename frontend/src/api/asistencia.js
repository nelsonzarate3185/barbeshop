import api from '../lib/axios'

export const getAsistencias = (params) => api.get('/asistencia/', { params })
export const getAsistencia  = (id)     => api.get(`/asistencia/${id}/`)

export const marcarIngreso  = (data)   => api.post('/asistencia/marcar_ingreso/', data)
export const inicioDescanso = (id, data) => api.post(`/asistencia/${id}/inicio_descanso/`, data)
export const finDescanso    = (id, data) => api.post(`/asistencia/${id}/fin_descanso/`, data)
export const marcarSalida   = (id, data) => api.post(`/asistencia/${id}/marcar_salida/`, data)
export const registroManual = (data)   => api.post('/asistencia/registro_manual/', data)
