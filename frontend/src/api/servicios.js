import api from '../lib/axios'

export const getServicios = (params) => api.get('/servicios/', { params })
export const getServicio = (id) => api.get(`/servicios/${id}/`)
export const crearServicio = (data) => api.post('/servicios/', data)
export const actualizarServicio = (id, data) => api.patch(`/servicios/${id}/`, data)
export const eliminarServicio = (id) => api.delete(`/servicios/${id}/`)

export const getCategorias = () => api.get('/servicios/categorias/')
export const crearCategoria = (data) => api.post('/servicios/categorias/', data)
export const actualizarCategoria = (id, data) => api.patch(`/servicios/categorias/${id}/`, data)
export const eliminarCategoria = (id) => api.delete(`/servicios/categorias/${id}/`)
