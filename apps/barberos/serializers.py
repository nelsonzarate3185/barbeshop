from rest_framework import serializers

from apps.servicios.serializers import ServicioResumenSerializer
from .models import AusenciaBarbero, HorarioBarbero, PerfilBarbero, ServicioBarbero


class HorarioBarberoSerializer(serializers.ModelSerializer):
    dia_nombre = serializers.CharField(source='get_dia_semana_display', read_only=True)

    class Meta:
        model = HorarioBarbero
        fields = ['id', 'dia_semana', 'dia_nombre', 'hora_inicio', 'hora_fin', 'disponible']

    def validate(self, attrs):
        if attrs.get('hora_inicio') and attrs.get('hora_fin'):
            if attrs['hora_inicio'] >= attrs['hora_fin']:
                raise serializers.ValidationError(
                    'La hora de inicio debe ser anterior a la hora de fin.'
                )
        return attrs


class ServicioBarberoSerializer(serializers.ModelSerializer):
    servicio_detalle = ServicioResumenSerializer(source='servicio', read_only=True)
    precio_efectivo = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = ServicioBarbero
        fields = [
            'id', 'servicio', 'servicio_detalle',
            'precio_propio', 'precio_efectivo', 'activo',
        ]


class AusenciaBarberoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AusenciaBarbero
        fields = ['id', 'fecha_inicio', 'fecha_fin', 'motivo', 'creado_en']
        read_only_fields = ['creado_en']

    def validate(self, attrs):
        if attrs.get('fecha_inicio') and attrs.get('fecha_fin'):
            if attrs['fecha_inicio'] >= attrs['fecha_fin']:
                raise serializers.ValidationError(
                    'La fecha de inicio debe ser anterior a la fecha de fin.'
                )
        return attrs


class PerfilBarberoSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True)
    usuario_email = serializers.CharField(source='usuario.email', read_only=True)
    usuario_telefono = serializers.CharField(source='usuario.telefono', read_only=True)
    tipo_comision_display = serializers.CharField(
        source='get_tipo_comision_display',
        read_only=True,
    )
    horarios = HorarioBarberoSerializer(many=True, read_only=True)

    class Meta:
        model = PerfilBarbero
        fields = [
            'id', 'usuario', 'usuario_nombre', 'usuario_email', 'usuario_telefono',
            'bio', 'especialidad',
            'tipo_comision', 'tipo_comision_display', 'valor_comision',
            'activo', 'horarios', 'creado_en',
        ]
        read_only_fields = ['creado_en']


class PerfilBarberoResumenSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(source='usuario.get_full_name', read_only=True)

    class Meta:
        model = PerfilBarbero
        fields = ['id', 'nombre', 'especialidad']
