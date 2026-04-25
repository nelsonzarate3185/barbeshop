from rest_framework import serializers

from .models import CategoriaServicio, Servicio


class CategoriaServicioSerializer(serializers.ModelSerializer):
    total_servicios = serializers.IntegerField(
        source='servicios.count',
        read_only=True,
    )

    class Meta:
        model = CategoriaServicio
        fields = ['id', 'nombre', 'descripcion', 'orden', 'total_servicios']


class ServicioSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)

    class Meta:
        model = Servicio
        fields = [
            'id', 'nombre', 'descripcion',
            'categoria', 'categoria_nombre',
            'duracion_minutos', 'precio_base',
            'activo', 'creado_en',
        ]
        read_only_fields = ['creado_en']

    def validate_precio_base(self, value):
        if value <= 0:
            raise serializers.ValidationError('El precio debe ser mayor a 0.')
        return value

    def validate_duracion_minutos(self, value):
        if value < 5:
            raise serializers.ValidationError('La duración mínima es de 5 minutos.')
        return value


class ServicioResumenSerializer(serializers.ModelSerializer):
    """Versión compacta para referencias en otros módulos."""
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)

    class Meta:
        model = Servicio
        fields = ['id', 'nombre', 'categoria_nombre', 'duracion_minutos', 'precio_base']
