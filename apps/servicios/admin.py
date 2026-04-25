from django.contrib import admin

from .models import CategoriaServicio, Servicio


@admin.register(CategoriaServicio)
class CategoriaServicioAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'orden', 'descripcion']
    ordering = ['orden', 'nombre']


@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'categoria', 'duracion_minutos', 'precio_base', 'activo']
    list_filter = ['activo', 'categoria']
    search_fields = ['nombre', 'descripcion']
    ordering = ['categoria', 'nombre']
    readonly_fields = ['creado_en', 'actualizado_en']
