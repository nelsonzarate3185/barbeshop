import api from '../lib/axios'

export const getBarberos = (params) => api.get('/barberos/', { params })
export const getBarbero = (id) => api.get(`/barberos/${id}/`)
export const getDisponibilidad = (id, fecha) =>
  api.get(`/barberos/${id}/disponibilidad/`, { params: { fecha } })
export const getServicios = () => api.get('/servicios/')
