import api from '../lib/axios'

export const getProductos = (params) => api.get('/inventario/', { params })
export const getProducto = (id) => api.get(`/inventario/${id}/`)
export const crearProducto = (data) => api.post('/inventario/', data)
export const actualizarProducto = (id, data) => api.patch(`/inventario/${id}/`, data)
export const eliminarProducto = (id) => api.delete(`/inventario/${id}/`)
export const getProductosBajoStock = () => api.get('/inventario/bajo-stock/')
export const registrarMovimiento = (data) => api.post('/inventario/movimientos/', data)

export const getCategoriasProducto = () => api.get('/inventario/categorias/')
export const crearCategoriaProducto = (data) => api.post('/inventario/categorias/', data)
export const actualizarCategoriaProducto = (id, data) =>
  api.patch(`/inventario/categorias/${id}/`, data)
export const eliminarCategoriaProducto = (id) => api.delete(`/inventario/categorias/${id}/`)
