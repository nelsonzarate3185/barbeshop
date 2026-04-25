from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Sucursal, Usuario


@admin.register(Sucursal)
class SucursalAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'direccion', 'telefono', 'zona_horaria', 'activa']
    list_filter = ['activa']
    search_fields = ['nombre', 'direccion']


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'rol', 'sucursal', 'activo']
    list_filter = ['rol', 'activo', 'sucursal', 'is_staff']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['email']

    fieldsets = UserAdmin.fieldsets + (
        ('Información de la barbería', {
            'fields': ('rol', 'telefono', 'avatar', 'sucursal', 'activo'),
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2'),
        }),
        ('Información de la barbería', {
            'fields': ('rol', 'telefono', 'sucursal'),
        }),
    )
