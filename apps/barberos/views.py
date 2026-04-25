from datetime import date, datetime, timedelta

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import EsAdministrador, EsPropietarioOAdministrador
from .models import AusenciaBarbero, HorarioBarbero, PerfilBarbero, ServicioBarbero
from .serializers import (
    AusenciaBarberoSerializer,
    HorarioBarberoSerializer,
    PerfilBarberoSerializer,
    ServicioBarberoSerializer,
)


class PerfilBarberoViewSet(viewsets.ModelViewSet):
    serializer_class = PerfilBarberoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activo']
    search_fields = ['usuario__first_name', 'usuario__last_name', 'especialidad']
    ordering_fields = ['usuario__first_name', 'usuario__last_name']

    def get_queryset(self):
        return (
            PerfilBarbero.objects
            .select_related('usuario')
            .prefetch_related('horarios')
            .filter(activo=True)
        )

    def get_permissions(self):
        if self.action in ('create', 'destroy'):
            return [IsAuthenticated(), EsAdministrador()]
        if self.action in ('update', 'partial_update'):
            return [IsAuthenticated(), EsPropietarioOAdministrador()]
        return [IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.activo = False
        instance.save(update_fields=['activo'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Horario ──────────────────────────────────────────────────────────

    @action(detail=True, methods=['get', 'put'], url_path='horario')
    def horario(self, request, pk=None):
        barbero = self.get_object()

        if request.method == 'GET':
            horarios = HorarioBarbero.objects.filter(barbero=barbero)
            return Response(HorarioBarberoSerializer(horarios, many=True).data)

        serializer = HorarioBarberoSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)

        HorarioBarbero.objects.filter(barbero=barbero).delete()
        nuevos = [
            HorarioBarbero(barbero=barbero, **item)
            for item in serializer.validated_data
        ]
        HorarioBarbero.objects.bulk_create(nuevos)

        resultado = HorarioBarbero.objects.filter(barbero=barbero)
        return Response(HorarioBarberoSerializer(resultado, many=True).data)

    # ── Disponibilidad ────────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='disponibilidad')
    def disponibilidad(self, request, pk=None):
        barbero = self.get_object()
        fecha_str = request.query_params.get('fecha')

        if not fecha_str:
            return Response(
                {'error': 'El parámetro "fecha" es requerido (formato: YYYY-MM-DD).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            fecha = date.fromisoformat(fecha_str)
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ausente = AusenciaBarbero.objects.filter(
            barbero=barbero,
            fecha_inicio__date__lte=fecha,
            fecha_fin__date__gte=fecha,
        ).exists()

        if ausente:
            return Response({
                'fecha': fecha_str,
                'barbero_id': barbero.id,
                'disponible': False,
                'motivo': 'El barbero no está disponible en esta fecha.',
                'slots': [],
            })

        dia_semana = fecha.weekday()  # 0=Lunes, 6=Domingo
        try:
            horario = HorarioBarbero.objects.get(
                barbero=barbero,
                dia_semana=dia_semana,
                disponible=True,
            )
        except HorarioBarbero.DoesNotExist:
            return Response({
                'fecha': fecha_str,
                'barbero_id': barbero.id,
                'disponible': False,
                'motivo': 'El barbero no trabaja este día.',
                'slots': [],
            })

        # Obtener turnos activos del día para filtrar slots ocupados
        from django.apps import apps
        Turno = apps.get_model('turnos', 'Turno')
        turnos_del_dia = Turno.objects.filter(
            barbero=barbero,
            fecha_inicio__date=fecha,
            estado__in=['pendiente', 'confirmado', 'en_curso'],
        ).values_list('fecha_inicio', 'fecha_fin')

        ocupados = [(t[0], t[1]) for t in turnos_del_dia]

        slots_libres = []
        slot = datetime.combine(fecha, horario.hora_inicio)
        fin_jornada = datetime.combine(fecha, horario.hora_fin)

        while slot < fin_jornada:
            slot_fin = slot + timedelta(minutes=30)
            solapado = any(
                t_inicio < slot_fin and t_fin > slot
                for t_inicio, t_fin in ocupados
            )
            if not solapado:
                slots_libres.append(slot.strftime('%H:%M'))
            slot = slot_fin

        return Response({
            'fecha': fecha_str,
            'barbero_id': barbero.id,
            'disponible': True,
            'hora_inicio': horario.hora_inicio.strftime('%H:%M'),
            'hora_fin': horario.hora_fin.strftime('%H:%M'),
            'slots': slots_libres,
        })

    # ── Servicios ─────────────────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='servicios')
    def servicios(self, request, pk=None):
        barbero = self.get_object()

        if request.method == 'GET':
            qs = ServicioBarbero.objects.select_related(
                'servicio__categoria'
            ).filter(barbero=barbero)
            return Response(ServicioBarberoSerializer(qs, many=True).data)

        serializer = ServicioBarberoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(barbero=barbero)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # ── Ausencias ─────────────────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='ausencias')
    def ausencias(self, request, pk=None):
        barbero = self.get_object()

        if request.method == 'GET':
            qs = AusenciaBarbero.objects.filter(barbero=barbero)
            return Response(AusenciaBarberoSerializer(qs, many=True).data)

        serializer = AusenciaBarberoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(barbero=barbero)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # ── Comisiones (Fase 3) ───────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='comisiones')
    def comisiones(self, request, pk=None):
        return Response({
            'detalle': 'Módulo de comisiones disponible en la Fase 3.',
            'periodo': request.query_params.get('periodo'),
        })
