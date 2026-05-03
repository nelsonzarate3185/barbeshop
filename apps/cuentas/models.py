from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UsuarioManager


class Sucursal(models.Model):
    nombre = models.CharField(max_length=100)
    direccion = models.CharField(max_length=200, blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    zona_horaria = models.CharField(
        max_length=50,
        default='America/Asuncion',
    )
    # Datos SET Paraguay
    ruc = models.CharField(max_length=20, blank=True, help_text='RUC del emisor con DV (ej: 80123456-7)')
    razon_social = models.CharField(max_length=200, blank=True)
    punto_expedicion = models.CharField(max_length=3, blank=True, help_text='Código SET de 3 dígitos (ej: 001)')
    horario_atencion = models.CharField(max_length=100, blank=True, help_text='Ej: Lun-Sáb 08:00-20:00')
    activa = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Sucursal'
        verbose_name_plural = 'Sucursales'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Usuario(AbstractUser):
    ROL_ADMINISTRADOR = 'administrador'
    ROL_BARBERO = 'barbero'
    ROL_RECEPCIONISTA = 'recepcionista'

    ROLES = [
        (ROL_ADMINISTRADOR, 'Administrador'),
        (ROL_BARBERO, 'Barbero'),
        (ROL_RECEPCIONISTA, 'Recepcionista'),
    ]

    email = models.EmailField(unique=True)
    rol = models.CharField(max_length=20, choices=ROLES, default=ROL_RECEPCIONISTA)
    telefono = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatares/', null=True, blank=True)
    sucursal = models.ForeignKey(
        Sucursal,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='usuarios',
    )
    activo = models.BooleanField(default=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UsuarioManager()

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return f'{self.get_full_name()} ({self.get_rol_display()})'

    @property
    def es_administrador(self):
        return self.rol == self.ROL_ADMINISTRADOR

    @property
    def es_barbero(self):
        return self.rol == self.ROL_BARBERO

    @property
    def es_recepcionista(self):
        return self.rol == self.ROL_RECEPCIONISTA
