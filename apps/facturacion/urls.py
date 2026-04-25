from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ComisionViewSet, FacturaViewSet

router = DefaultRouter()
router.register('comisiones', ComisionViewSet, basename='comision')
router.register('', FacturaViewSet, basename='factura')

urlpatterns = [
    path('', include(router.urls)),
]
