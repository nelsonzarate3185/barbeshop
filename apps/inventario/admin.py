from django.contrib import admin

from .models import CategoriaProducto, MovimientoStock, Producto, ServicioProducto


@admin.register(CategoriaProducto)
class CategoriaProductoAdmin(admin.ModelAdmin):
    list_display = ['nombre']
    search_fields = ['nombre']


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'sku', 'categoria', 'stock_actual', 'stock_minimo', 'bajo_stock', 'activo']
    list_filter = ['activo', 'categoria']
    search_fields = ['nombre', 'sku']
    readonly_fields = ['creado_en']

    @admin.display(boolean=True, description='Bajo stock')
    def bajo_stock(self, obj):
        return obj.bajo_stock


@admin.register(ServicioProducto)
class ServicioProductoAdmin(admin.ModelAdmin):
    list_display = ['servicio', 'producto', 'cantidad']
    list_filter = ['servicio']


@admin.register(MovimientoStock)
class MovimientoStockAdmin(admin.ModelAdmin):
    list_display = ['producto', 'tipo', 'cantidad', 'referencia', 'creado_por', 'creado_en']
    list_filter = ['tipo', 'producto']
    readonly_fields = ['creado_en']
    date_hierarchy = 'creado_en'
