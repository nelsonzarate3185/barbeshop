import api from '../lib/axios'

export const getFacturas = (params) => api.get('/facturacion/facturas/', { params })
export const getFactura = (id) => api.get(`/facturacion/facturas/${id}/`)
export const crearFactura = (data) => api.post('/facturacion/facturas/', data)
