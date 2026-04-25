from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CambiarPasswordView,
    LoginView,
    LogoutView,
    PerfilView,
    SucursalViewSet,
    UsuarioViewSet,
)

router = DefaultRouter()
router.register('usuarios', UsuarioViewSet, basename='usuario')
router.register('sucursales', SucursalViewSet, basename='sucursal')

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('token/renovar/', TokenRefreshView.as_view(), name='auth-token-renovar'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('perfil/', PerfilView.as_view(), name='auth-perfil'),
    path('cambiar-password/', CambiarPasswordView.as_view(), name='auth-cambiar-password'),
    path('', include(router.urls)),
]
