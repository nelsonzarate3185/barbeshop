from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='facturacion.Factura')
def crear_comision_automatica(sender, instance, created, **kwargs):
    """Genera la comisión del barbero al crear una factura."""
    if not created:
        return

    from .models import Comision

    monto = instance.barbero.calcular_comision(float(instance.total))
    periodo = instance.creado_en.strftime('%Y-%m')

    Comision.objects.create(
        factura=instance,
        barbero=instance.barbero,
        monto=monto,
        periodo=periodo,
    )

    # Marcar el turno como completado si está vinculado
    if instance.turno and instance.turno.estado != 'completado':
        instance.turno.estado = 'completado'
        instance.turno.save(update_fields=['estado'])
