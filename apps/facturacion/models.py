from django.db import models


class Factura(models.Model):
    METODO_EFECTIVO = 'efectivo'
    METODO_TARJETA = 'tarjeta'
    METODO_TRANSFERENCIA = 'transferencia'
    METODO_MERCADOPAGO = 'mercadopago'

    METODOS_PAGO = [
        (METODO_EFECTIVO, 'Efectivo'),
        (METODO_TARJETA, 'Tarjeta de crédito/débito'),
        (METODO_TRANSFERENCIA, 'Transferencia bancaria'),
        (METODO_MERCADOPAGO, 'MercadoPago'),
    ]

    turno = models.OneToOneField(
        'turnos.Turno',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='factura',
    )
    cliente = models.ForeignKey(
        'clientes.Cliente',
        on_delete=models.PROTECT,
        related_name='facturas',
    )
    barbero = models.ForeignKey(
        'barberos.PerfilBarbero',
        on_delete=models.PROTECT,
        related_name='facturas',
    )
    sucursal = models.ForeignKey(
        'cuentas.Sucursal',
        on_delete=models.PROTECT,
        related_name='facturas',
    )
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    descuento = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    impuesto = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    metodo_pago = models.CharField(max_length=20, choices=METODOS_PAGO, default=METODO_EFECTIVO)
    pagado_en = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Factura'
        verbose_name_plural = 'Facturas'
        ordering = ['-creado_en']

    def __str__(self):
        return f'Factura #{self.id} — {self.cliente} — ${self.total}'


class ItemFactura(models.Model):
    factura = models.ForeignKey(
        Factura,
        on_delete=models.CASCADE,
        related_name='items',
    )
    servicio = models.ForeignKey(
        'servicios.Servicio',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    producto = models.ForeignKey(
        'inventario.Producto',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    descripcion = models.CharField(max_length=200)
    cantidad = models.DecimalField(max_digits=8, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Item de Factura'
        verbose_name_plural = 'Items de Factura'

    def __str__(self):
        return f'{self.descripcion} x{self.cantidad} = ${self.subtotal}'


class Comision(models.Model):
    factura = models.OneToOneField(
        Factura,
        on_delete=models.CASCADE,
        related_name='comision',
    )
    barbero = models.ForeignKey(
        'barberos.PerfilBarbero',
        on_delete=models.PROTECT,
        related_name='comisiones',
    )
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    periodo = models.CharField(max_length=7)  # formato: "2026-04"
    liquidada = models.BooleanField(default=False)
    liquidada_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Comisión'
        verbose_name_plural = 'Comisiones'
        ordering = ['-factura__creado_en']

    def __str__(self):
        return f'Comisión {self.barbero} — ${self.monto} ({self.periodo})'
