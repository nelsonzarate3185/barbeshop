from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import EsAdministrador
from .models import Comision, Factura
from .serializers import (
    ComisionSerializer,
    FacturaCrearSerializer,
    FacturaSerializer,
    LiquidarComisionesSerializer,
)


class FacturaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['barbero', 'cliente', 'sucursal', 'metodo_pago']
    ordering_fields = ['creado_en', 'total']
    ordering = ['-creado_en']
    http_method_names = ['get', 'post', 'head', 'options']  # sin PUT/PATCH/DELETE

    def get_queryset(self):
        qs = Factura.objects.select_related(
            'cliente', 'barbero__usuario', 'sucursal', 'comision'
        ).prefetch_related('items')

        desde = self.request.query_params.get('desde')
        hasta = self.request.query_params.get('hasta')
        if desde:
            qs = qs.filter(creado_en__date__gte=desde)
        if hasta:
            qs = qs.filter(creado_en__date__lte=hasta)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return FacturaCrearSerializer
        return FacturaSerializer


class ComisionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ComisionSerializer
    permission_classes = [IsAuthenticated, EsAdministrador]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['barbero', 'periodo', 'liquidada']
    ordering_fields = ['periodo', 'monto']
    ordering = ['-periodo']

    def get_queryset(self):
        return Comision.objects.select_related(
            'barbero__usuario', 'factura'
        )

    @action(detail=False, methods=['post'], url_path='liquidar')
    def liquidar(self, request):
        serializer = LiquidarComisionesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        barbero_id = serializer.validated_data['barbero']
        periodo = serializer.validated_data['periodo']

        comisiones = Comision.objects.filter(
            barbero_id=barbero_id,
            periodo=periodo,
            liquidada=False,
        )

        if not comisiones.exists():
            return Response(
                {'detalle': 'No hay comisiones pendientes para ese período.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        total = sum(c.monto for c in comisiones)
        ahora = timezone.now()
        comisiones.update(liquidada=True, liquidada_en=ahora)

        return Response({
            'detalle': f'{comisiones.count()} comisiones liquidadas.',
            'barbero_id': barbero_id,
            'periodo': periodo,
            'total_liquidado': total,
            'liquidada_en': ahora,
        })
