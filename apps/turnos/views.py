from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from common.permissions import EsAdministradorORecepcionista
from .models import Turno
from .serializers import CambiarEstadoSerializer, TurnoCrearSerializer, TurnoSerializer


class TurnoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['barbero', 'cliente', 'estado', 'sucursal', 'origen']
    search_fields = ['cliente__nombre', 'cliente__apellido', 'servicio__nombre']
    ordering_fields = ['fecha_inicio', 'estado', 'creado_en']
    ordering = ['fecha_inicio']

    def get_queryset(self):
        qs = Turno.objects.select_related(
            'cliente', 'barbero__usuario', 'servicio', 'sucursal'
        )
        # Filtro por rango de fechas
        desde = self.request.query_params.get('desde')
        hasta = self.request.query_params.get('hasta')
        if desde:
            qs = qs.filter(fecha_inicio__date__gte=desde)
        if hasta:
            qs = qs.filter(fecha_inicio__date__lte=hasta)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return TurnoCrearSerializer
        return TurnoSerializer

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), EsAdministradorORecepcionista()]
        return [IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        """Cancelar turno en lugar de eliminar físicamente."""
        turno = self.get_object()
        if turno.estado not in (Turno.ESTADO_PENDIENTE, Turno.ESTADO_CONFIRMADO):
            return Response(
                {'detalle': 'Solo se pueden cancelar turnos pendientes o confirmados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        turno.estado = Turno.ESTADO_CANCELADO
        turno.save(update_fields=['estado'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'], url_path='estado')
    def cambiar_estado(self, request, pk=None):
        turno = self.get_object()
        serializer = CambiarEstadoSerializer(
            data=request.data,
            context={'turno': turno},
        )
        serializer.is_valid(raise_exception=True)
        turno.estado = serializer.validated_data['estado']
        turno.save(update_fields=['estado'])
        return Response(TurnoSerializer(turno).data)
