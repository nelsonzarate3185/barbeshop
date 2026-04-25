import api from '../lib/axios'

export const getDashboard = () => api.get('/reportes/dashboard/')
export const getIngresos = (params) => api.get('/reportes/ingresos/', { params })
export const getRendimientoBarberos = (params) => api.get('/reportes/rendimiento-barberos/', { params })
export const getClientesFrecuentes = (params) => api.get('/reportes/clientes-frecuentes/', { params })
export const getServiciosPopulares = (params) => api.get('/reportes/servicios-populares/', { params })
