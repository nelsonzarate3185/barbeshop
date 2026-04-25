from django.db import models


class Cliente(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20, unique=True)
    email = models.EmailField(null=True, blank=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    notas = models.TextField(blank=True)
    sucursal = models.ForeignKey(
        'cuentas.Sucursal',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='clientes',
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['apellido', 'nombre']

    def __str__(self):
        return f'{self.apellido}, {self.nombre}'

    @property
    def nombre_completo(self):
        return f'{self.nombre} {self.apellido}'

    @property
    def es_cliente_frecuente(self):
        return self.turnos.filter(estado='completado').count() >= 10
