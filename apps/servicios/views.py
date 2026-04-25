from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from common.mixins import BajaLogicaMixin
from common.permissions import SoloLecturaOAdministrador
from .models import CategoriaServicio, Servicio
from .serializers import CategoriaServicioSerializer, ServicioSerializer


class CategoriaServicioViewSet(viewsets.ModelViewSet):
    queryset = CategoriaServicio.objects.all()
    serializer_class = CategoriaServicioSerializer
    permission_classes = [IsAuthenticated, SoloLecturaOAdministrador]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['orden', 'nombre']


class ServicioViewSet(BajaLogicaMixin, viewsets.ModelViewSet):
    serializer_class = ServicioSerializer
    permission_classes = [IsAuthenticated, SoloLecturaOAdministrador]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activo', 'categoria']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'precio_base', 'duracion_minutos']
    ordering = ['nombre']

    def get_queryset(self):
        return Servicio.objects.select_related('categoria').filter(activo=True)
