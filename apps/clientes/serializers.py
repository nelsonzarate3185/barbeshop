from rest_framework import serializers

from .models import Cliente


class ClienteSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(read_only=True)
    es_cliente_frecuente = serializers.BooleanField(read_only=True)
    sucursal_nombre = serializers.CharField(source='sucursal.nombre', read_only=True)

    class Meta:
        model = Cliente
        fields = [
            'id', 'nombre', 'apellido', 'nombre_completo',
            'ruc_ci', 'telefono', 'email', 'fecha_nacimiento', 'notas',
            'sucursal', 'sucursal_nombre',
            'es_cliente_frecuente', 'creado_en', 'activo',
        ]
        read_only_fields = ['creado_en']

    def validate_telefono(self, value):
        limpio = ''.join(c for c in value if c.isdigit() or c == '+')
        if len(limpio) < 8:
            raise serializers.ValidationError(
                'El teléfono debe tener al menos 8 dígitos.'
            )
        return limpio


class ClienteResumenSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(read_only=True)

    class Meta:
        model = Cliente
        fields = ['id', 'nombre_completo', 'telefono', 'email']
