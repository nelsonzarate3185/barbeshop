from rest_framework import serializers
from django.utils import timezone

from .models import DescansoAsistencia, RegistroAsistencia


class DescansoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DescansoAsistencia
        fields = ['id', 'inicio', 'fin', 'nota']


class RegistroAsistenciaSerializer(serializers.ModelSerializer):
    descansos         = DescansoSerializer(many=True, read_only=True)
    empleado_nombre   = serializers.CharField(source='empleado.get_full_name', read_only=True)
    sucursal_nombre   = serializers.CharField(source='sucursal.nombre', read_only=True)
    horas_netas_display = serializers.CharField(read_only=True)
    turno_abierto     = serializers.BooleanField(read_only=True)
    descanso_abierto_id = serializers.SerializerMethodField()

    class Meta:
        model = RegistroAsistencia
        fields = [
            'id', 'empleado', 'empleado_nombre',
            'sucursal', 'sucursal_nombre',
            'fecha', 'hora_ingreso', 'hora_salida',
            'descansos', 'horas_netas_minutos', 'horas_netas_display',
            'turno_abierto', 'descanso_abierto_id',
            'observaciones', 'creado_en',
        ]

    def get_descanso_abierto_id(self, obj):
        d = obj.descanso_abierto
        return d.id if d else None
