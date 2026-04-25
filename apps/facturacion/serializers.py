from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from .models import Comision, Factura, ItemFactura


class ItemFacturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemFactura
        fields = [
            'id', 'servicio', 'producto', 'descripcion',
            'cantidad', 'precio_unitario', 'subtotal',
        ]
        read_only_fields = ['subtotal']


class ItemFacturaCrearSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemFactura
        fields = ['servicio', 'producto', 'descripcion', 'cantidad', 'precio_unitario']

    def validate(self, attrs):
        if not attrs.get('descripcion'):
            if attrs.get('servicio'):
                attrs['descripcion'] = attrs['servicio'].nombre
            elif attrs.get('producto'):
                attrs['descripcion'] = attrs['producto'].nombre
            else:
                raise serializers.ValidationError(
                    'Debe indicar una descripción, servicio o producto.'
                )
        attrs['subtotal'] = attrs['cantidad'] * attrs['precio_unitario']
        return attrs


class FacturaSerializer(serializers.ModelSerializer):
    items = ItemFacturaSerializer(many=True, read_only=True)
    cliente_nombre = serializers.CharField(source='cliente.nombre_completo', read_only=True)
    barbero_nombre = serializers.CharField(
        source='barbero.usuario.get_full_name',
        read_only=True,
    )
    metodo_pago_display = serializers.CharField(
        source='get_metodo_pago_display',
        read_only=True,
    )
    comision_monto = serializers.DecimalField(
        source='comision.monto',
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = Factura
        fields = [
            'id', 'turno', 'cliente', 'cliente_nombre',
            'barbero', 'barbero_nombre', 'sucursal',
            'subtotal', 'descuento', 'impuesto', 'total',
            'metodo_pago', 'metodo_pago_display',
            'comision_monto', 'items', 'pagado_en', 'creado_en',
        ]
        read_only_fields = ['subtotal', 'total', 'pagado_en', 'creado_en']


class FacturaCrearSerializer(serializers.ModelSerializer):
    items = ItemFacturaCrearSerializer(many=True)

    class Meta:
        model = Factura
        fields = [
            'turno', 'cliente', 'barbero', 'sucursal',
            'descuento', 'impuesto', 'metodo_pago', 'items',
        ]

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('La factura debe tener al menos un item.')
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')

        subtotal = sum(item['subtotal'] for item in items_data)
        descuento = Decimal(str(validated_data.get('descuento', 0)))
        impuesto = Decimal(str(validated_data.get('impuesto', 0)))
        total = subtotal - descuento + impuesto

        factura = Factura.objects.create(
            **validated_data,
            subtotal=subtotal,
            total=max(total, Decimal('0')),
            pagado_en=timezone.now(),
        )

        ItemFactura.objects.bulk_create([
            ItemFactura(factura=factura, **item)
            for item in items_data
        ])

        return factura


class ComisionSerializer(serializers.ModelSerializer):
    barbero_nombre = serializers.CharField(
        source='barbero.usuario.get_full_name',
        read_only=True,
    )
    factura_total = serializers.DecimalField(
        source='factura.total',
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = Comision
        fields = [
            'id', 'factura', 'factura_total',
            'barbero', 'barbero_nombre',
            'monto', 'periodo', 'liquidada', 'liquidada_en',
        ]
        read_only_fields = ['monto', 'periodo', 'liquidada_en']


class LiquidarComisionesSerializer(serializers.Serializer):
    barbero = serializers.IntegerField()
    periodo = serializers.CharField(max_length=7)  # formato: "2026-04"

    def validate_periodo(self, value):
        import re
        if not re.match(r'^\d{4}-\d{2}$', value):
            raise serializers.ValidationError(
                'El período debe tener el formato YYYY-MM (ej: 2026-04).'
            )
        return value
