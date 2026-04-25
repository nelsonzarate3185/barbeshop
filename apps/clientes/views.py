from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from common.mixins import BajaLogicaMixin
from .models import Cliente
from .serializers import ClienteResumenSerializer, ClienteSerializer


class ClienteViewSet(BajaLogicaMixin, viewsets.ModelViewSet):
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activo', 'sucursal']
    search_fields = ['nombre', 'apellido', 'telefono', 'email']
    ordering_fields = ['apellido', 'nombre', 'creado_en']
    ordering = ['apellido', 'nombre']

    def get_queryset(self):
        return Cliente.objects.select_related('sucursal').filter(activo=True)

    @action(detail=True, methods=['get'], url_path='historial')
    def historial(self, request, pk=None):
        from django.apps import apps
        cliente = self.get_object()

        TurnoSerializer = apps.get_model('turnos', 'Turno')
        turnos_qs = cliente.turnos.select_related(
            'barbero__usuario', 'servicio'
        ).order_by('-fecha_inicio')[:20]

        FacturaModel = apps.get_model('facturacion', 'Factura')
        facturas_qs = FacturaModel.objects.filter(
            cliente=cliente
        ).order_by('-creado_en')[:20]

        from apps.turnos.serializers import TurnoSerializer as TS
        from apps.facturacion.serializers import FacturaSerializer as FS

        return Response({
            'cliente': ClienteSerializer(cliente).data,
            'turnos': TS(turnos_qs, many=True).data,
            'facturas': FS(facturas_qs, many=True).data,
        })
