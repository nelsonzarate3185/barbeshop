import api from '../lib/axios'

export const login = (credentials) => api.post('/auth/login/', credentials)
export const logout = (refresh) => api.post('/auth/logout/', { refresh })
export const getPerfil = () => api.get('/auth/perfil/')
export const cambiarPassword = (data) => api.post('/auth/cambiar-password/', data)
