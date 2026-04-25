from datetime import timedelta

from django.db import transaction
from rest_framework import serializers

from apps.barberos.models import AusenciaBarbero, HorarioBarbero
from apps.clientes.serializers import ClienteResumenSerializer
from apps.barberos.serializers import PerfilBarberoResumenSerializer
from apps.servicios.serializers import ServicioResumenSerializer
from .models import Turno


class TurnoSerializer(serializers.ModelSerializer):
    cliente_detalle = ClienteResumenSerializer(source='cliente', read_only=True)
    barbero_detalle = PerfilBarberoResumenSerializer(source='barbero', read_only=True)
    servicio_detalle = ServicioResumenSerializer(source='servicio', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    origen_display = serializers.CharField(source='get_origen_display', read_only=True)

    class Meta:
        model = Turno
        fields = [
            'id', 'cliente', 'cliente_detalle',
            'barbero', 'barbero_detalle',
            'servicio', 'servicio_detalle',
            'sucursal', 'fecha_inicio', 'fecha_fin',
            'estado', 'estado_display',
            'origen', 'origen_display',
            'notas', 'recordatorio_enviado', 'creado_en',
        ]
        read_only_fields = ['fecha_fin', 'recordatorio_enviado', 'creado_en']


class TurnoCrearSerializer(serializers.ModelSerializer):
    class Meta:
        model = Turno
        fields = [
            'cliente', 'barbero', 'servicio', 'sucursal',
            'fecha_inicio', 'origen', 'notas',
        ]

    def validate(self, attrs):
        barbero = attrs['barbero']
        servicio = attrs['servicio']
        fecha_inicio = attrs['fecha_inicio']
        fecha_fin = fecha_inicio + timedelta(minutes=servicio.duracion_minutos)
        attrs['fecha_fin'] = fecha_fin

        # Validar que el barbero ofrece este servicio
        if not barbero.servicios.filter(servicio=servicio, activo=True).exists():
            raise serializers.ValidationError(
                {'servicio': 'El barbero no ofrece este servicio.'}
            )

        # Validar horario del barbero ese día
        dia_semana = fecha_inicio.weekday()
        horario = HorarioBarbero.objects.filter(
            barbero=barbero,
            dia_semana=dia_semana,
            disponible=True,
        ).first()

        if not horario:
            raise serializers.ValidationError(
                {'fecha_inicio': 'El barbero no trabaja ese día.'}
            )

        if fecha_inicio.time() < horario.hora_inicio or fecha_fin.time() > horario.hora_fin:
            raise serializers.ValidationError({
                'fecha_inicio': (
                    f'El turno debe estar entre {horario.hora_inicio} '
                    f'y {horario.hora_fin}.'
                )
            })

        # Validar ausencias registradas
        if AusenciaBarbero.objects.filter(
            barbero=barbero,
            fecha_inicio__lt=fecha_fin,
            fecha_fin__gt=fecha_inicio,
        ).exists():
            raise serializers.ValidationError(
                {'barbero': 'El barbero tiene una ausencia registrada en ese período.'}
            )

        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            barbero = validated_data['barbero']
            fecha_inicio = validated_data['fecha_inicio']
            fecha_fin = validated_data['fecha_fin']

            # Bloqueo pesimista para evitar solapamientos concurrentes
            solapado = Turno.objects.select_for_update().filter(
                barbero=barbero,
                estado__in=Turno.ESTADOS_ACTIVOS,
                fecha_inicio__lt=fecha_fin,
                fecha_fin__gt=fecha_inicio,
            ).exists()

            if solapado:
                raise serializers.ValidationError(
                    'El barbero ya tiene un turno reservado en ese horario.'
                )

            return Turno.objects.create(**validated_data)


class CambiarEstadoSerializer(serializers.Serializer):
    TRANSICIONES_VALIDAS = {
        Turno.ESTADO_PENDIENTE: [Turno.ESTADO_CONFIRMADO, Turno.ESTADO_CANCELADO],
        Turno.ESTADO_CONFIRMADO: [Turno.ESTADO_EN_CURSO, Turno.ESTADO_CANCELADO, Turno.ESTADO_AUSENTE],
        Turno.ESTADO_EN_CURSO: [Turno.ESTADO_COMPLETADO, Turno.ESTADO_CANCELADO],
    }

    estado = serializers.ChoiceField(choices=Turno.ESTADOS)

    def validate_estado(self, nuevo_estado):
        turno = self.context['turno']
        transiciones = self.TRANSICIONES_VALIDAS.get(turno.estado, [])
        if nuevo_estado not in transiciones:
            raise serializers.ValidationError(
                f'No se puede pasar de "{turno.get_estado_display()}" '
                f'a "{dict(Turno.ESTADOS)[nuevo_estado]}".'
            )
        return nuevo_estado
