from django.db import models


class Turno(models.Model):
    ESTADO_PENDIENTE = 'pendiente'
    ESTADO_CONFIRMADO = 'confirmado'
    ESTADO_EN_CURSO = 'en_curso'
    ESTADO_COMPLETADO = 'completado'
    ESTADO_CANCELADO = 'cancelado'
    ESTADO_AUSENTE = 'ausente'

    ESTADOS = [
        (ESTADO_PENDIENTE, 'Pendiente'),
        (ESTADO_CONFIRMADO, 'Confirmado'),
        (ESTADO_EN_CURSO, 'En curso'),
        (ESTADO_COMPLETADO, 'Completado'),
        (ESTADO_CANCELADO, 'Cancelado'),
        (ESTADO_AUSENTE, 'No se presentó'),
    ]

    ORIGEN_WEB = 'web'
    ORIGEN_WHATSAPP = 'whatsapp'
    ORIGEN_MANUAL = 'manual'

    ORIGENES = [
        (ORIGEN_WEB, 'Sitio web'),
        (ORIGEN_WHATSAPP, 'WhatsApp'),
        (ORIGEN_MANUAL, 'Carga manual'),
    ]

    # Estados que bloquean el horario del barbero
    ESTADOS_ACTIVOS = [ESTADO_PENDIENTE, ESTADO_CONFIRMADO, ESTADO_EN_CURSO]

    cliente = models.ForeignKey(
        'clientes.Cliente',
        on_delete=models.PROTECT,
        related_name='turnos',
    )
    barbero = models.ForeignKey(
        'barberos.PerfilBarbero',
        on_delete=models.PROTECT,
        related_name='turnos',
    )
    servicio = models.ForeignKey(
        'servicios.Servicio',
        on_delete=models.PROTECT,
        related_name='turnos',
    )
    sucursal = models.ForeignKey(
        'cuentas.Sucursal',
        on_delete=models.PROTECT,
        related_name='turnos',
    )
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    estado = models.CharField(max_length=15, choices=ESTADOS, default=ESTADO_PENDIENTE)
    origen = models.CharField(max_length=15, choices=ORIGENES, default=ORIGEN_MANUAL)
    notas = models.TextField(blank=True)
    recordatorio_enviado = models.BooleanField(default=False)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Turno'
        verbose_name_plural = 'Turnos'
        ordering = ['fecha_inicio']

    def __str__(self):
        return (
            f'{self.cliente} — {self.servicio} — '
            f'{self.fecha_inicio.strftime("%d/%m/%Y %H:%M")}'
        )
