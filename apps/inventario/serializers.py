from rest_framework import serializers

from .models import CategoriaProducto, MovimientoStock, Producto, ServicioProducto


class CategoriaProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaProducto
        fields = ['id', 'nombre', 'descripcion']


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    bajo_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Producto
        fields = [
            'id', 'nombre', 'sku', 'categoria', 'categoria_nombre',
            'stock_actual', 'stock_minimo', 'bajo_stock', 'unidad',
            'precio_costo', 'precio_venta', 'activo', 'creado_en',
        ]
        read_only_fields = ['creado_en']

    def validate_precio_venta(self, value):
        if value < 0:
            raise serializers.ValidationError('El precio no puede ser negativo.')
        return value


class ProductoResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = ['id', 'nombre', 'sku', 'stock_actual', 'unidad']


class ServicioProductoSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_unidad = serializers.CharField(source='producto.unidad', read_only=True)

    class Meta:
        model = ServicioProducto
        fields = ['id', 'servicio', 'producto', 'producto_nombre', 'producto_unidad', 'cantidad']


class MovimientoStockSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    creado_por_nombre = serializers.CharField(
        source='creado_por.get_full_name',
        read_only=True,
    )

    class Meta:
        model = MovimientoStock
        fields = [
            'id', 'producto', 'producto_nombre',
            'tipo', 'tipo_display', 'cantidad',
            'referencia', 'notas',
            'creado_por', 'creado_por_nombre', 'creado_en',
        ]
        read_only_fields = ['creado_en', 'creado_por']

    def create(self, validated_data):
        validated_data['creado_por'] = self.context['request'].user
        movimiento = super().create(validated_data)

        producto = movimiento.producto
        if movimiento.tipo in (MovimientoStock.TIPO_ENTRADA, MovimientoStock.TIPO_DEVOLUCION):
            producto.stock_actual += movimiento.cantidad
        elif movimiento.tipo == MovimientoStock.TIPO_SALIDA:
            producto.stock_actual -= movimiento.cantidad
        elif movimiento.tipo == MovimientoStock.TIPO_AJUSTE:
            producto.stock_actual = movimiento.cantidad

        producto.save(update_fields=['stock_actual'])
        return movimiento
