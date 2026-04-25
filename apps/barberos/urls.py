from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PerfilBarberoViewSet

router = DefaultRouter()
router.register('', PerfilBarberoViewSet, basename='barbero')

urlpatterns = [
    path('', include(router.urls)),
]
