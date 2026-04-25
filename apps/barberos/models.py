from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class PerfilBarbero(models.Model):
    TIPO_COMISION_FIJO = 'fijo'
    TIPO_COMISION_PORCENTAJE = 'porcentaje'

    TIPOS_COMISION = [
        (TIPO_COMISION_FIJO, 'Monto fijo por servicio'),
        (TIPO_COMISION_PORCENTAJE, 'Porcentaje sobre el total'),
    ]

    usuario = models.OneToOneField(
        'cuentas.Usuario',
        on_delete=models.CASCADE,
        related_name='perfil_barbero',
    )
    bio = models.TextField(blank=True)
    especialidad = models.CharField(max_length=100, blank=True)
    tipo_comision = models.CharField(
        max_length=15,
        choices=TIPOS_COMISION,
        default=TIPO_COMISION_PORCENTAJE,
    )
    valor_comision = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Porcentaje (0–100) o monto fijo, según el tipo configurado.',
    )
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Perfil de Barbero'
        verbose_name_plural = 'Perfiles de Barbero'
        ordering = ['usuario__first_name', 'usuario__last_name']

    def __str__(self):
        return f'Barbero: {self.usuario.get_full_name()}'

    def calcular_comision(self, monto_servicio: float) -> float:
        if self.tipo_comision == self.TIPO_COMISION_PORCENTAJE:
            return round(float(monto_servicio) * float(self.valor_comision) / 100, 2)
        return float(self.valor_comision)


class ServicioBarbero(models.Model):
    """Servicios habilitados para un barbero con precio opcional diferenciado."""

    barbero = models.ForeignKey(
        PerfilBarbero,
        on_delete=models.CASCADE,
        related_name='servicios',
    )
    servicio = models.ForeignKey(
        'servicios.Servicio',
        on_delete=models.CASCADE,
        related_name='barberos',
    )
    precio_propio = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Si está vacío, se usa el precio base del servicio.',
    )
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Servicio de Barbero'
        verbose_name_plural = 'Servicios de Barbero'
        unique_together = [['barbero', 'servicio']]

    def __str__(self):
        return f'{self.barbero} — {self.servicio}'

    @property
    def precio_efectivo(self):
        return self.precio_propio if self.precio_propio is not None else self.servicio.precio_base


class HorarioBarbero(models.Model):
    DIAS = [
        (0, 'Lunes'),
        (1, 'Martes'),
        (2, 'Miércoles'),
        (3, 'Jueves'),
        (4, 'Viernes'),
        (5, 'Sábado'),
        (6, 'Domingo'),
    ]

    barbero = models.ForeignKey(
        PerfilBarbero,
        on_delete=models.CASCADE,
        related_name='horarios',
    )
    dia_semana = models.IntegerField(choices=DIAS)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    disponible = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Horario de Barbero'
        verbose_name_plural = 'Horarios de Barbero'
        unique_together = [['barbero', 'dia_semana']]
        ordering = ['dia_semana', 'hora_inicio']

    def __str__(self):
        return (
            f'{self.barbero} — {self.get_dia_semana_display()}: '
            f'{self.hora_inicio}–{self.hora_fin}'
        )

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.hora_inicio and self.hora_fin and self.hora_inicio >= self.hora_fin:
            raise ValidationError(
                'La hora de inicio debe ser anterior a la hora de fin.'
            )


class AusenciaBarbero(models.Model):
    barbero = models.ForeignKey(
        PerfilBarbero,
        on_delete=models.CASCADE,
        related_name='ausencias',
    )
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    motivo = models.CharField(max_length=200, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Ausencia de Barbero'
        verbose_name_plural = 'Ausencias de Barbero'
        ordering = ['fecha_inicio']

    def __str__(self):
        return (
            f'{self.barbero} ausente: '
            f'{self.fecha_inicio.date()} — {self.fecha_fin.date()}'
        )

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.fecha_inicio and self.fecha_fin and self.fecha_inicio >= self.fecha_fin:
            raise ValidationError(
                'La fecha de inicio debe ser anterior a la fecha de fin.'
            )
