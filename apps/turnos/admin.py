from django.contrib import admin

from .models import Turno


@admin.register(Turno)
class TurnoAdmin(admin.ModelAdmin):
    list_display = [
        'cliente', 'barbero', 'servicio', 'sucursal',
        'fecha_inicio', 'fecha_fin', 'estado', 'origen',
    ]
    list_filter = ['estado', 'origen', 'sucursal', 'barbero']
    search_fields = ['cliente__nombre', 'cliente__apellido', 'servicio__nombre']
    ordering = ['-fecha_inicio']
    date_hierarchy = 'fecha_inicio'
    readonly_fields = ['creado_en', 'actualizado_en', 'recordatorio_enviado']

    fieldsets = (
        ('Datos del turno', {
            'fields': ('cliente', 'barbero', 'servicio', 'sucursal'),
        }),
        ('Horario', {
            'fields': ('fecha_inicio', 'fecha_fin'),
        }),
        ('Estado', {
            'fields': ('estado', 'origen', 'notas', 'recordatorio_enviado'),
        }),
        ('Auditoría', {
            'fields': ('creado_en', 'actualizado_en'),
            'classes': ('collapse',),
        }),
    )
