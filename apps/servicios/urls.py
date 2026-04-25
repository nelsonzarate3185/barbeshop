from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CategoriaServicioViewSet, ServicioViewSet

router = DefaultRouter()
router.register('categorias', CategoriaServicioViewSet, basename='categoria-servicio')
router.register('', ServicioViewSet, basename='servicio')

urlpatterns = [
    path('', include(router.urls)),
]
