from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from .models import Comision, Factura, ItemFactura


class ItemFacturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemFactura
        fields = [
            'id', 'servicio', 'producto', 'descripcion',
            'cantidad', 'precio_unitario',
            'descuento_monto', 'descuento_porcentaje',
            'subtotal', 'subtotal_neto', 'tasa_iva',
        ]
        read_only_fields = ['subtotal', 'subtotal_neto']


class ItemFacturaCrearSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemFactura
        fields = [
            'servicio', 'producto', 'descripcion',
            'cantidad', 'precio_unitario',
            'descuento_monto', 'descuento_porcentaje', 'tasa_iva',
        ]

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
        # subtotal y subtotal_neto se calculan en ItemFactura.save()
        return attrs


class FacturaSerializer(serializers.ModelSerializer):
    items = ItemFacturaSerializer(many=True, read_only=True)
    cliente_nombre      = serializers.CharField(source='cliente.nombre_completo', read_only=True)
    barbero_nombre      = serializers.CharField(source='barbero.usuario.get_full_name', read_only=True)
    sucursal_nombre     = serializers.CharField(source='sucursal.nombre', read_only=True)
    metodo_pago_display = serializers.CharField(source='get_metodo_pago_display', read_only=True)
    tipo_comprobante_display = serializers.CharField(source='get_tipo_comprobante_display', read_only=True)
    condicion_cliente_display = serializers.CharField(source='get_condicion_cliente_display', read_only=True)
    comision_monto = serializers.DecimalField(
        source='comision.monto', max_digits=14, decimal_places=2, read_only=True,
    )

    class Meta:
        model = Factura
        fields = [
            'id', 'turno',
            'cliente', 'cliente_nombre', 'cliente_ruc_ci', 'condicion_cliente', 'condicion_cliente_display',
            'barbero', 'barbero_nombre',
            'sucursal', 'sucursal_nombre',
            # Comprobante Paraguay
            'tipo_comprobante', 'tipo_comprobante_display',
            'numero_factura', 'numero_timbrado', 'cdc', 'estado_sifen',
            # Importes
            'subtotal_bruto', 'descuento_detalle',
            'codigo_promocion', 'descuento_promocion',
            'subtotal_neto',
            'base_iva_10', 'iva_10', 'base_iva_5', 'iva_5', 'exentas',
            # Legacy
            'subtotal', 'descuento', 'impuesto', 'total',
            'metodo_pago', 'metodo_pago_display',
            'anulada', 'comision_monto', 'items', 'pagado_en', 'creado_en',
        ]
        read_only_fields = ['subtotal', 'subtotal_bruto', 'subtotal_neto', 'total', 'pagado_en', 'creado_en']


class FacturaCrearSerializer(serializers.ModelSerializer):
    items = ItemFacturaCrearSerializer(many=True)

    class Meta:
        model = Factura
        fields = [
            'turno', 'cliente', 'barbero', 'sucursal',
            'tipo_comprobante', 'numero_timbrado', 'numero_factura',
            'cliente_ruc_ci', 'condicion_cliente',
            'codigo_promocion', 'descuento_promocion',
            'descuento', 'impuesto', 'metodo_pago', 'items',
        ]

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('La factura debe tener al menos un ítem.')
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        descuento_promo = Decimal(str(validated_data.get('descuento_promocion', 0)))
        descuento_extra = Decimal(str(validated_data.get('descuento', 0)))
        impuesto        = Decimal(str(validated_data.get('impuesto', 0)))

        # Crear factura sin totales aún
        factura = Factura.objects.create(
            **validated_data,
            subtotal=0, subtotal_bruto=0, subtotal_neto=0, total=0,
            pagado_en=timezone.now(),
        )

        # Crear ítems (ItemFactura.save() calcula subtotal y subtotal_neto)
        items = []
        for d in items_data:
            item = ItemFactura(factura=factura, **d)
            item.save()
            items.append(item)

        # Recalcular totales
        subtotal_bruto   = sum(i.subtotal for i in items)
        descuento_detalle = sum(i.subtotal - i.subtotal_neto for i in items)
        subtotal_neto    = subtotal_bruto - descuento_detalle - descuento_promo
        total            = max(subtotal_neto + impuesto - descuento_extra, Decimal('0'))

        factura.subtotal_bruto    = subtotal_bruto
        factura.descuento_detalle = descuento_detalle
        factura.subtotal_neto     = subtotal_neto
        factura.subtotal          = subtotal_bruto   # legacy
        factura.total             = total
        factura.calcular_iva()
        factura.save()

        return factura


class ComisionSerializer(serializers.ModelSerializer):
    barbero_nombre = serializers.CharField(source='barbero.usuario.get_full_name', read_only=True)
    factura_total  = serializers.DecimalField(source='factura.total', max_digits=14, decimal_places=2, read_only=True)

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
    periodo = serializers.CharField(max_length=7)

    def validate_periodo(self, value):
        import re
        if not re.match(r'^\d{4}-\d{2}$', value):
            raise serializers.ValidationError('El período debe tener el formato YYYY-MM (ej: 2026-05).')
        return value
