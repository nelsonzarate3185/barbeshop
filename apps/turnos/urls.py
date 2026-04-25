from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TurnoViewSet

router = DefaultRouter()
router.register('', TurnoViewSet, basename='turno')

urlpatterns = [
    path('', include(router.urls)),
]
