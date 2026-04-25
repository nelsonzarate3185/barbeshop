from django.contrib import admin

from .models import AusenciaBarbero, HorarioBarbero, PerfilBarbero, ServicioBarbero


class HorarioBarberoInline(admin.TabularInline):
    model = HorarioBarbero
    extra = 0


class ServicioBarberoInline(admin.TabularInline):
    model = ServicioBarbero
    extra = 0
    autocomplete_fields = ['servicio']


@admin.register(PerfilBarbero)
class PerfilBarberoAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'especialidad', 'tipo_comision', 'valor_comision', 'activo']
    list_filter = ['activo', 'tipo_comision']
    search_fields = ['usuario__first_name', 'usuario__last_name', 'especialidad']
    readonly_fields = ['creado_en']
    inlines = [HorarioBarberoInline, ServicioBarberoInline]


@admin.register(AusenciaBarbero)
class AusenciaBarberoAdmin(admin.ModelAdmin):
    list_display = ['barbero', 'fecha_inicio', 'fecha_fin', 'motivo']
    list_filter = ['barbero']
    date_hierarchy = 'fecha_inicio'
    readonly_fields = ['creado_en']
