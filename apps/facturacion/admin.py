from django.contrib import admin

from .models import Comision, Factura, ItemFactura


class ItemFacturaInline(admin.TabularInline):
    model = ItemFactura
    extra = 0
    readonly_fields = ['subtotal']


@admin.register(Factura)
class FacturaAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'cliente', 'barbero', 'sucursal',
        'subtotal', 'descuento', 'total', 'metodo_pago', 'creado_en',
    ]
    list_filter = ['metodo_pago', 'sucursal', 'barbero']
    search_fields = ['cliente__nombre', 'cliente__apellido']
    readonly_fields = ['subtotal', 'total', 'pagado_en', 'creado_en']
    date_hierarchy = 'creado_en'
    inlines = [ItemFacturaInline]


@admin.register(Comision)
class ComisionAdmin(admin.ModelAdmin):
    list_display = ['barbero', 'monto', 'periodo', 'liquidada', 'liquidada_en']
    list_filter = ['liquidada', 'periodo', 'barbero']
    readonly_fields = ['monto', 'periodo', 'liquidada_en']
    actions = ['marcar_liquidadas']

    @admin.action(description='Marcar seleccionadas como liquidadas')
    def marcar_liquidadas(self, request, queryset):
        from django.utils import timezone
        queryset.filter(liquidada=False).update(
            liquidada=True,
            liquidada_en=timezone.now(),
        )
