from datetime import date, datetime

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import DescansoAsistencia, RegistroAsistencia
from .serializers import RegistroAsistenciaSerializer


class AsistenciaViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = RegistroAsistenciaSerializer

    def get_queryset(self):
        qs = RegistroAsistencia.objects.select_related(
            'empleado', 'sucursal'
        ).prefetch_related('descansos')

        fecha = self.request.query_params.get('fecha')
        empleado = self.request.query_params.get('empleado')
        sucursal = self.request.query_params.get('sucursal')

        if fecha:
            qs = qs.filter(fecha=fecha)
        if empleado:
            qs = qs.filter(empleado_id=empleado)
        if sucursal:
            qs = qs.filter(sucursal_id=sucursal)

        # Barberos y recepcionistas solo ven los propios
        u = self.request.user
        if not u.es_administrador:
            qs = qs.filter(empleado=u)

        return qs

    # ── INGRESO ───────────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'])
    def marcar_ingreso(self, request):
        empleado_id = request.data.get('empleado', request.user.id)
        sucursal_id = request.data.get('sucursal')
        hora_str    = request.data.get('hora')  # opcional, si no usa now()
        observaciones = request.data.get('observaciones', '')

        hoy = date.today()
        hora = datetime.strptime(hora_str, '%H:%M').time() if hora_str else timezone.localtime().time().replace(second=0, microsecond=0)

        if RegistroAsistencia.objects.filter(empleado_id=empleado_id, fecha=hoy, hora_ingreso__isnull=False).exists():
            return Response({'detail': 'Ya existe un ingreso registrado para hoy.'}, status=400)

        registro, _ = RegistroAsistencia.objects.get_or_create(
            empleado_id=empleado_id,
            fecha=hoy,
            defaults={'sucursal_id': sucursal_id, 'observaciones': observaciones},
        )
        registro.hora_ingreso = hora
        if sucursal_id:
            registro.sucursal_id = sucursal_id
        if observaciones:
            registro.observaciones = observaciones
        registro.save()

        return Response(RegistroAsistenciaSerializer(registro).data)

    # ── INICIO DESCANSO ───────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def inicio_descanso(self, request, pk=None):
        registro = self.get_object()
        hora_str = request.data.get('hora')
        hora = datetime.strptime(hora_str, '%H:%M').time() if hora_str else timezone.localtime().time().replace(second=0, microsecond=0)

        if registro.descanso_abierto:
            return Response({'detail': 'Ya hay un descanso abierto. Cerralo primero.'}, status=400)
        if not registro.turno_abierto:
            return Response({'detail': 'No hay turno abierto para iniciar descanso.'}, status=400)

        descanso = DescansoAsistencia.objects.create(
            registro=registro,
            inicio=hora,
            nota=request.data.get('nota', ''),
        )
        return Response(RegistroAsistenciaSerializer(registro).data)

    # ── FIN DESCANSO ──────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def fin_descanso(self, request, pk=None):
        registro = self.get_object()
        hora_str = request.data.get('hora')
        hora = datetime.strptime(hora_str, '%H:%M').time() if hora_str else timezone.localtime().time().replace(second=0, microsecond=0)

        descanso = registro.descanso_abierto
        if not descanso:
            return Response({'detail': 'No hay descanso abierto.'}, status=400)

        descanso.fin = hora
        descanso.save()
        return Response(RegistroAsistenciaSerializer(registro).data)

    # ── SALIDA ────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def marcar_salida(self, request, pk=None):
        registro = self.get_object()
        hora_str = request.data.get('hora')
        hora = datetime.strptime(hora_str, '%H:%M').time() if hora_str else timezone.localtime().time().replace(second=0, microsecond=0)

        # Cerrar descanso abierto automáticamente
        descanso = registro.descanso_abierto
        if descanso:
            descanso.fin  = hora
            descanso.nota = (descanso.nota + ' [cerrado automático al marcar salida]').strip()
            descanso.save()

        registro.hora_salida = hora
        registro.horas_netas_minutos = registro.calcular_horas_netas()
        registro.save()

        return Response(RegistroAsistenciaSerializer(registro).data)

    # ── REGISTRO MANUAL ───────────────────────────────────────────────────────
    @action(detail=False, methods=['post'])
    def registro_manual(self, request):
        """Permite a un admin registrar/corregir datos de asistencia manualmente."""
        ser = RegistroAsistenciaSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        registro = ser.save()
        registro.horas_netas_minutos = registro.calcular_horas_netas()
        registro.save()
        return Response(RegistroAsistenciaSerializer(registro).data, status=201)
