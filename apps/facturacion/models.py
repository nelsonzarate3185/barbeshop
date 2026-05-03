from django.db import models
from django.utils import timezone


class Factura(models.Model):
    # ── Método de pago ────────────────────────────────────────────────────────
    METODO_EFECTIVO      = 'efectivo'
    METODO_TARJETA       = 'tarjeta'
    METODO_TRANSFERENCIA = 'transferencia'
    METODO_MERCADOPAGO   = 'mercadopago'
    METODOS_PAGO = [
        (METODO_EFECTIVO,      'Efectivo'),
        (METODO_TARJETA,       'Tarjeta de crédito/débito'),
        (METODO_TRANSFERENCIA, 'Transferencia bancaria'),
        (METODO_MERCADOPAGO,   'MercadoPago'),
    ]

    # ── Tipo de comprobante (Paraguay SET) ────────────────────────────────────
    TIPO_ELECTRONICA = 'electronica'
    TIPO_MANUAL      = 'manual'
    TIPOS_COMPROBANTE = [
        (TIPO_ELECTRONICA, 'e-Factura SIFEN'),
        (TIPO_MANUAL,      'Factura Manual (timbrado)'),
    ]

    # ── Estado SIFEN (solo e-Factura) ─────────────────────────────────────────
    SIFEN_PENDIENTE  = 'pendiente'
    SIFEN_APROBADA   = 'aprobada'
    SIFEN_RECHAZADA  = 'rechazada'
    ESTADOS_SIFEN = [
        (SIFEN_PENDIENTE, 'Pendiente'),
        (SIFEN_APROBADA,  'Aprobada'),
        (SIFEN_RECHAZADA, 'Rechazada'),
    ]

    # ── Condición del cliente ─────────────────────────────────────────────────
    COND_CONTRIBUYENTE    = 'contribuyente'
    COND_NO_CONTRIBUYENTE = 'no_contribuyente'
    COND_EXTRANJERO       = 'extranjero'
    CONDICIONES_CLIENTE = [
        (COND_CONTRIBUYENTE,    'Contribuyente'),
        (COND_NO_CONTRIBUYENTE, 'No contribuyente'),
        (COND_EXTRANJERO,       'Extranjero'),
    ]

    # ── Relaciones ────────────────────────────────────────────────────────────
    turno = models.OneToOneField(
        'turnos.Turno',
        null=True, blank=True,
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

    # ── Comprobante Paraguay ──────────────────────────────────────────────────
    tipo_comprobante = models.CharField(
        max_length=15, choices=TIPOS_COMPROBANTE, default=TIPO_MANUAL,
    )
    numero_factura = models.CharField(
        max_length=15, blank=True,
        help_text='Formato: 001-001-0000001',
    )
    numero_timbrado = models.CharField(
        max_length=20, blank=True,
        help_text='N° timbrado vigente (solo factura manual)',
    )
    cdc = models.CharField(
        max_length=44, blank=True,
        help_text='CDC de 44 dígitos (solo e-Factura SIFEN)',
    )
    estado_sifen = models.CharField(
        max_length=15, choices=ESTADOS_SIFEN,
        default=SIFEN_PENDIENTE, blank=True,
    )

    # ── Datos del cliente (para la factura impresa) ───────────────────────────
    cliente_ruc_ci = models.CharField(
        max_length=20, blank=True,
        help_text='RUC+DV o CI del cliente',
    )
    condicion_cliente = models.CharField(
        max_length=20, choices=CONDICIONES_CLIENTE,
        default=COND_NO_CONTRIBUYENTE,
    )

    # ── Importes (en Guaraníes, sin decimales reales pero con 2 por precisión) ─
    subtotal_bruto   = models.DecimalField(max_digits=14, decimal_places=2, default=0)  # sum items antes descuentos
    descuento_detalle = models.DecimalField(max_digits=14, decimal_places=2, default=0) # descuentos a nivel ítem
    # Descuento promocional (cabecera)
    codigo_promocion    = models.CharField(max_length=50, blank=True)
    descuento_promocion = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    subtotal_neto    = models.DecimalField(max_digits=14, decimal_places=2, default=0)  # después de todos los descuentos

    # IVA desglosado (Ley 6380/2019)
    base_iva_10 = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    iva_10      = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    base_iva_5  = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    iva_5       = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    exentas     = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Campos heredados (compatibilidad)
    subtotal  = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    descuento = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    impuesto  = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total     = models.DecimalField(max_digits=14, decimal_places=2)

    metodo_pago = models.CharField(max_length=20, choices=METODOS_PAGO, default=METODO_EFECTIVO)
    anulada     = models.BooleanField(default=False)
    pagado_en   = models.DateTimeField(null=True, blank=True)
    creado_en   = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Factura'
        verbose_name_plural = 'Facturas'
        ordering = ['-creado_en']

    def __str__(self):
        ref = self.numero_factura or f'#{self.id}'
        return f'Factura {ref} — {self.cliente} — Gs. {self.total:,.0f}'

    def calcular_iva(self):
        """Recalcula los campos de IVA desde los ítems y actualiza el objeto (sin guardar)."""
        base10 = base5 = exentas = 0
        for item in self.items.all():
            neto = float(item.subtotal_neto)
            if item.tasa_iva == 10:
                base10 += neto / 1.10
            elif item.tasa_iva == 5:
                base5 += neto / 1.05
            else:
                exentas += neto
        self.base_iva_10 = round(base10, 2)
        self.iva_10      = round(float(self.subtotal_neto) - base10 - base5 - exentas, 2) if base5 == 0 and exentas == 0 else round(base10 * 0.10 / 1.0, 2)
        # Simplificado: IVA = precio_final - base
        self.base_iva_10 = round(base10, 2)
        self.iva_10      = round(base10 * 10 / 100, 2)
        self.base_iva_5  = round(base5, 2)
        self.iva_5       = round(base5 * 5 / 100, 2)
        self.exentas     = round(exentas, 2)


class ItemFactura(models.Model):
    TASA_10    = 10
    TASA_5     = 5
    TASA_EXENTA = 0
    TASAS_IVA = [
        (TASA_10,    'IVA 10%'),
        (TASA_5,     'IVA 5%'),
        (TASA_EXENTA,'Exento'),
    ]

    factura = models.ForeignKey(
        Factura,
        on_delete=models.CASCADE,
        related_name='items',
    )
    servicio = models.ForeignKey(
        'servicios.Servicio',
        null=True, blank=True,
        on_delete=models.SET_NULL,
    )
    producto = models.ForeignKey(
        'inventario.Producto',
        null=True, blank=True,
        on_delete=models.SET_NULL,
    )
    descripcion     = models.CharField(max_length=200)
    cantidad        = models.DecimalField(max_digits=8,  decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=14, decimal_places=2)

    # Descuento a nivel ítem (excluyentes: usar uno o el otro)
    descuento_monto      = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    descuento_porcentaje = models.DecimalField(max_digits=5,  decimal_places=2, default=0)

    subtotal      = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    subtotal_neto = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tasa_iva      = models.IntegerField(choices=TASAS_IVA, default=TASA_10)

    class Meta:
        verbose_name = 'Item de Factura'
        verbose_name_plural = 'Items de Factura'

    def save(self, *args, **kwargs):
        self.subtotal = self.cantidad * self.precio_unitario
        if self.descuento_porcentaje:
            desc = self.subtotal * self.descuento_porcentaje / 100
        else:
            desc = self.descuento_monto
        self.subtotal_neto = self.subtotal - desc
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.descripcion} x{self.cantidad} = Gs. {self.subtotal_neto:,.0f}'


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
    monto     = models.DecimalField(max_digits=14, decimal_places=2)
    periodo   = models.CharField(max_length=7)  # "2026-05"
    liquidada = models.BooleanField(default=False)
    liquidada_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Comisión'
        verbose_name_plural = 'Comisiones'
        ordering = ['-factura__creado_en']

    def __str__(self):
        return f'Comisión {self.barbero} — Gs. {self.monto:,.0f} ({self.periodo})'
