import api from '../lib/axios'

export const getClientes = (params) => api.get('/clientes/', { params })
export const getCliente = (id) => api.get(`/clientes/${id}/`)
export const crearCliente = (data) => api.post('/clientes/', data)
export const actualizarCliente = (id, data) => api.patch(`/clientes/${id}/`, data)
export const eliminarCliente = (id) => api.delete(`/clientes/${id}/`)
export const getHistorial = (id) => api.get(`/clientes/${id}/historial/`)
