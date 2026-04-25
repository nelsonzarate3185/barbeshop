from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='turnos.Turno')
def descontar_stock_al_completar(sender, instance, **kwargs):
    """Descuenta automáticamente el stock de insumos cuando un turno se completa."""
    if instance.estado != instance.ESTADO_COMPLETADO:
        return

    from apps.inventario.models import MovimientoStock, ServicioProducto

    referencia = f'Turno #{instance.id}'

    # Evitar doble descuento si el turno ya fue procesado
    if MovimientoStock.objects.filter(referencia=referencia).exists():
        return

    for sp in ServicioProducto.objects.filter(
        servicio=instance.servicio
    ).select_related('producto'):
        producto = sp.producto
        producto.stock_actual = max(0, producto.stock_actual - sp.cantidad)
        producto.save(update_fields=['stock_actual'])

        MovimientoStock.objects.create(
            producto=producto,
            tipo=MovimientoStock.TIPO_SALIDA,
            cantidad=sp.cantidad,
            referencia=referencia,
            notas=f'Consumo automático: {instance.servicio.nombre}',
        )
