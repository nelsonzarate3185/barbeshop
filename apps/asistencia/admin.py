from django.contrib import admin
from .models import DescansoAsistencia, RegistroAsistencia


class DescansoInline(admin.TabularInline):
    model = DescansoAsistencia
    extra = 0


@admin.register(RegistroAsistencia)
class RegistroAsistenciaAdmin(admin.ModelAdmin):
    list_display = ['empleado', 'sucursal', 'fecha', 'hora_ingreso', 'hora_salida', 'horas_netas_display']
    list_filter  = ['fecha', 'sucursal']
    search_fields = ['empleado__first_name', 'empleado__last_name']
    inlines = [DescansoInline]
