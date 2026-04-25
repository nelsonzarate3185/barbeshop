from django.db import models


class CategoriaProducto(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Categoría de Producto'
        verbose_name_plural = 'Categorías de Producto'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Producto(models.Model):
    nombre = models.CharField(max_length=100)
    sku = models.CharField(max_length=50, unique=True)
    categoria = models.ForeignKey(
        CategoriaProducto,
        on_delete=models.PROTECT,
        related_name='productos',
    )
    stock_actual = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    stock_minimo = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    unidad = models.CharField(max_length=20)  # ml, unidad, kg, etc.
    precio_costo = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    precio_venta = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['nombre']

    def __str__(self):
        return f'{self.nombre} ({self.sku})'

    @property
    def bajo_stock(self):
        return self.stock_actual <= self.stock_minimo


class ServicioProducto(models.Model):
    """Consumo estimado de un producto al realizar un servicio."""

    servicio = models.ForeignKey(
        'servicios.Servicio',
        on_delete=models.CASCADE,
        related_name='productos_usados',
    )
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        related_name='servicios_que_usan',
    )
    cantidad = models.DecimalField(max_digits=8, decimal_places=3)

    class Meta:
        verbose_name = 'Producto por Servicio'
        verbose_name_plural = 'Productos por Servicio'
        unique_together = [['servicio', 'producto']]

    def __str__(self):
        return f'{self.servicio} usa {self.cantidad} {self.producto.unidad} de {self.producto}'


class MovimientoStock(models.Model):
    TIPO_ENTRADA = 'entrada'
    TIPO_SALIDA = 'salida'
    TIPO_AJUSTE = 'ajuste'
    TIPO_DEVOLUCION = 'devolucion'

    TIPOS = [
        (TIPO_ENTRADA, 'Entrada (compra)'),
        (TIPO_SALIDA, 'Salida (servicio/venta)'),
        (TIPO_AJUSTE, 'Ajuste manual'),
        (TIPO_DEVOLUCION, 'Devolución'),
    ]

    producto = models.ForeignKey(
        Producto,
        on_delete=models.PROTECT,
        related_name='movimientos',
    )
    tipo = models.CharField(max_length=15, choices=TIPOS)
    cantidad = models.DecimalField(max_digits=10, decimal_places=3)
    referencia = models.CharField(max_length=100, blank=True)
    notas = models.TextField(blank=True)
    creado_por = models.ForeignKey(
        'cuentas.Usuario',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='movimientos_stock',
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Movimiento de Stock'
        verbose_name_plural = 'Movimientos de Stock'
        ordering = ['-creado_en']

    def __str__(self):
        return f'{self.get_tipo_display()} — {self.producto} ({self.cantidad})'
