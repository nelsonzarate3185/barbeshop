from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CategoriaProductoViewSet, ProductoViewSet, ServicioProductoViewSet

router = DefaultRouter()
router.register('categorias', CategoriaProductoViewSet, basename='categoria-producto')
router.register('servicio-producto', ServicioProductoViewSet, basename='servicio-producto')
router.register('', ProductoViewSet, basename='producto')

urlpatterns = [
    path('', include(router.urls)),
]
