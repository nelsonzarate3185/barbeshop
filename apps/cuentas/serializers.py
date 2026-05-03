from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Sucursal

Usuario = get_user_model()


class SucursalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sucursal
        fields = ['id', 'nombre', 'direccion', 'telefono', 'zona_horaria', 'activa']


class UsuarioSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(source='get_full_name', read_only=True)
    sucursal_nombre = serializers.CharField(source='sucursal.nombre', read_only=True)
    sucursal_id     = serializers.IntegerField(source='sucursal.id', read_only=True)
    rol_display     = serializers.CharField(source='get_rol_display', read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'first_name', 'last_name', 'nombre_completo',
            'rol', 'rol_display', 'telefono', 'avatar',
            'sucursal', 'sucursal_id', 'sucursal_nombre', 'activo', 'date_joined',
        ]
        read_only_fields = ['date_joined']


class UsuarioCrearSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirmar = serializers.CharField(write_only=True)

    class Meta:
        model = Usuario
        fields = [
            'email', 'first_name', 'last_name',
            'password', 'password_confirmar',
            'rol', 'telefono', 'sucursal',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirmar'):
            raise serializers.ValidationError(
                {'password_confirmar': 'Las contraseñas no coinciden.'}
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        usuario = Usuario(**validated_data)
        usuario.username = validated_data['email']
        usuario.set_password(password)
        usuario.save()
        return usuario


class CambiarPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True)
    password_nuevo = serializers.CharField(write_only=True, min_length=8)
    password_confirmar = serializers.CharField(write_only=True)

    def validate_password_actual(self, value):
        usuario = self.context['request'].user
        if not usuario.check_password(value):
            raise serializers.ValidationError('La contraseña actual es incorrecta.')
        return value

    def validate(self, attrs):
        if attrs['password_nuevo'] != attrs['password_confirmar']:
            raise serializers.ValidationError(
                {'password_confirmar': 'Las contraseñas no coinciden.'}
            )
        return attrs


class TokenPersonalizadoSerializer(TokenObtainPairSerializer):
    """Agrega datos del usuario autenticado a la respuesta del login."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data['usuario'] = {
            'id': self.user.id,
            'email': self.user.email,
            'nombre_completo': self.user.get_full_name(),
            'rol': self.user.rol,
            'sucursal_id': self.user.sucursal_id,
        }
        return data
