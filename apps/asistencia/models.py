from datetime import timedelta

from django.db import models
from django.utils import timezone


class RegistroAsistencia(models.Model):
    empleado = models.ForeignKey(
        'cuentas.Usuario',
        on_delete=models.PROTECT,
        related_name='asistencias',
    )
    sucursal = models.ForeignKey(
        'cuentas.Sucursal',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='asistencias',
    )
    fecha        = models.DateField()
    hora_ingreso = models.TimeField(null=True, blank=True)
    hora_salida  = models.TimeField(null=True, blank=True)
    observaciones = models.TextField(blank=True)

    # Calculado al cerrar
    horas_netas_minutos = models.IntegerField(null=True, blank=True)

    creado_en      = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Registro de Asistencia'
        verbose_name_plural = 'Registros de Asistencia'
        unique_together = ('empleado', 'fecha')
        ordering = ['-fecha', 'empleado__first_name']

    def __str__(self):
        return f'{self.empleado} — {self.fecha}'

    def calcular_horas_netas(self):
        """Calcula minutos netos trabajados descontando todos los descansos."""
        if not self.hora_ingreso or not self.hora_salida:
            return None
        from datetime import datetime, date
        base = date.today()
        dt_ingreso = datetime.combine(base, self.hora_ingreso)
        dt_salida  = datetime.combine(base, self.hora_salida)
        total = int((dt_salida - dt_ingreso).total_seconds() // 60)

        minutos_descanso = 0
        for d in self.descansos.all():
            if d.inicio and d.fin:
                dt_i = datetime.combine(base, d.inicio)
                dt_f = datetime.combine(base, d.fin)
                minutos_descanso += int((dt_f - dt_i).total_seconds() // 60)

        return max(total - minutos_descanso, 0)

    @property
    def horas_netas_display(self):
        if self.horas_netas_minutos is None:
            return '—'
        h = self.horas_netas_minutos // 60
        m = self.horas_netas_minutos % 60
        return f'{h}h {m:02d}min'

    @property
    def turno_abierto(self):
        """True si hay ingreso pero no salida."""
        return bool(self.hora_ingreso and not self.hora_salida)

    @property
    def descanso_abierto(self):
        """Retorna el descanso sin cerrar, si existe."""
        return self.descansos.filter(fin__isnull=True).first()


class DescansoAsistencia(models.Model):
    registro = models.ForeignKey(
        RegistroAsistencia,
        on_delete=models.CASCADE,
        related_name='descansos',
    )
    inicio = models.TimeField()
    fin    = models.TimeField(null=True, blank=True)
    nota   = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = 'Descanso'
        verbose_name_plural = 'Descansos'
        ordering = ['inicio']

    def __str__(self):
        fin = self.fin or 'abierto'
        return f'Descanso {self.inicio} — {fin}'
