import api from '../lib/axios'

export const getProductos = (params) => api.get('/inventario/productos/', { params })
export const getProducto = (id) => api.get(`/inventario/productos/${id}/`)
export const getProductosBajoStock = () =>
  api.get('/inventario/productos/bajo_stock/')
export const registrarMovimiento = (data) =>
  api.post('/inventario/movimientos/', data)
