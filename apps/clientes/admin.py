from django.contrib import admin

from .models import Cliente


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ['apellido', 'nombre', 'telefono', 'email', 'sucursal', 'activo', 'creado_en']
    list_filter = ['activo', 'sucursal']
    search_fields = ['nombre', 'apellido', 'telefono', 'email']
    ordering = ['apellido', 'nombre']
    date_hierarchy = 'creado_en'
    readonly_fields = ['creado_en', 'actualizado_en']
