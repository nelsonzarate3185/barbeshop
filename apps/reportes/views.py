from datetime import date

from django.db.models import Avg, Count, F, Max, Q, Sum
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.barberos.models import PerfilBarbero
from apps.clientes.models import Cliente
from apps.facturacion.models import Comision, Factura, ItemFactura
from apps.inventario.models import MovimientoStock, Producto
from apps.turnos.models import Turno
from common.permissions import EsAdministrador, EsBarberoOAdministrador
from .utils import limit_param, rango_fechas


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard general
# ─────────────────────────────────────────────────────────────────────────────

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoy = date.today()
        inicio_mes = hoy.replace(day=1)

        # ── Turnos de hoy ────────────────────────────────────────────────────
        turnos_hoy = Turno.objects.filter(fecha_inicio__date=hoy)
        resumen_turnos = turnos_hoy.aggregate(
            total=Count('id'),
            pendientes=Count('id', filter=Q(estado='pendiente')),
            confirmados=Count('id', filter=Q(estado='confirmado')),
            en_curso=Count('id', filter=Q(estado='en_curso')),
            completados=Count('id', filter=Q(estado='completado')),
            cancelados=Count('id', filter=Q(estado='cancelado')),
        )

        # ── Ingresos del día y del mes ────────────────────────────────────────
        ingresos_hoy = Factura.objects.filter(
            creado_en__date=hoy
        ).aggregate(total=Sum('total'), cantidad=Count('id'))

        ingresos_mes = Factura.objects.filter(
            creado_en__date__gte=inicio_mes,
            creado_en__date__lte=hoy,
        ).aggregate(total=Sum('total'), cantidad=Count('id'))

        # ── Alertas de stock bajo ─────────────────────────────────────────────
        productos_bajo_stock = list(
            Producto.objects.filter(
                activo=True,
                stock_actual__lte=F('stock_minimo'),
            ).values('id', 'nombre', 'sku', 'stock_actual', 'stock_minimo', 'unidad')
        )

        # ── Próximos turnos del día ───────────────────────────────────────────
        from apps.turnos.serializers import TurnoSerializer
        proximos = Turno.objects.filter(
            fecha_inicio__date=hoy,
            estado__in=['pendiente', 'confirmado'],
        ).select_related(
            'cliente', 'barbero__usuario', 'servicio'
        ).order_by('fecha_inicio')[:8]

        # ── Top barberos del mes ──────────────────────────────────────────────
        top_barberos = list(
            PerfilBarbero.objects.filter(activo=True).annotate(
                turnos_mes=Count(
                    'turnos',
                    filter=Q(
                        turnos__estado='completado',
                        turnos__fecha_inicio__date__gte=inicio_mes,
                    ),
                ),
                ingresos_mes=Sum(
                    'facturas__total',
                    filter=Q(facturas__creado_en__date__gte=inicio_mes),
                ),
            ).values(
                'id',
                'usuario__first_name',
                'usuario__last_name',
                'turnos_mes',
                'ingresos_mes',
            ).order_by('-turnos_mes')[:5]
        )

        return Response({
            'fecha': hoy,
            'turnos_hoy': resumen_turnos,
            'ingresos_hoy': {
                'total': ingresos_hoy['total'] or 0,
                'cantidad_facturas': ingresos_hoy['cantidad'] or 0,
            },
            'ingresos_mes': {
                'total': ingresos_mes['total'] or 0,
                'cantidad_facturas': ingresos_mes['cantidad'] or 0,
            },
            'alertas_stock': {
                'cantidad': len(productos_bajo_stock),
                'productos': productos_bajo_stock,
            },
            'proximos_turnos': TurnoSerializer(proximos, many=True).data,
            'top_barberos_mes': top_barberos,
        })


# ─────────────────────────────────────────────────────────────────────────────
# Ingresos por período
# ─────────────────────────────────────────────────────────────────────────────

class IngresosPorPeriodoView(APIView):
    permission_classes = [IsAuthenticated, EsAdministrador]

    TRUNC_MAP = {
        'dia': TruncDay,
        'semana': TruncWeek,
        'mes': TruncMonth,
    }

    def get(self, request):
        desde, hasta = rango_fechas(request)
        agrupar = request.query_params.get('agrupar_por', 'dia')
        sucursal_id = request.query_params.get('sucursal')

        qs = Factura.objects.filter(
            creado_en__date__gte=desde,
            creado_en__date__lte=hasta,
        )
        if sucursal_id:
            qs = qs.filter(sucursal_id=sucursal_id)

        trunc_fn = self.TRUNC_MAP.get(agrupar, TruncDay)

        por_periodo = list(
            qs.annotate(periodo=trunc_fn('creado_en'))
            .values('periodo')
            .annotate(
                ingresos=Sum('total'),
                cantidad_facturas=Count('id'),
                promedio_factura=Avg('total'),
            )
            .order_by('periodo')
        )

        totales = qs.aggregate(
            total_ingresos=Sum('total'),
            total_facturas=Count('id'),
            promedio_factura=Avg('total'),
        )

        # Desglose por método de pago
        por_metodo = list(
            qs.values('metodo_pago')
            .annotate(total=Sum('total'), cantidad=Count('id'))
            .order_by('-total')
        )

        return Response({
            'desde': desde,
            'hasta': hasta,
            'agrupar_por': agrupar,
            'totales': {k: v or 0 for k, v in totales.items()},
            'por_periodo': por_periodo,
            'por_metodo_pago': por_metodo,
        })


# ─────────────────────────────────────────────────────────────────────────────
# Servicios más realizados
# ─────────────────────────────────────────────────────────────────────────────

class ServiciosPopularesView(APIView):
    permission_classes = [IsAuthenticated, EsAdministrador]

    def get(self, request):
        desde, hasta = rango_fechas(request)
        limit = limit_param(request)

        datos = list(
            Turno.objects.filter(
                estado='completado',
                fecha_inicio__date__gte=desde,
                fecha_inicio__date__lte=hasta,
            )
            .values(
                'servicio__id',
                'servicio__nombre',
                'servicio__categoria__nombre',
                'servicio__precio_base',
            )
            .annotate(
                veces_realizado=Count('id'),
                ingresos_generados=Sum('factura__total'),
            )
            .order_by('-veces_realizado')[:limit]
        )

        return Response({
            'desde': desde,
            'hasta': hasta,
            'datos': datos,
        })


# ─────────────────────────────────────────────────────────────────────────────
# Productos más utilizados
# ─────────────────────────────────────────────────────────────────────────────

class ProductosUtilizadosView(APIView):
    permission_classes = [IsAuthenticated, EsAdministrador]

    def get(self, request):
        desde, hasta = rango_fechas(request)
        limit = limit_param(request)

        datos = list(
            MovimientoStock.objects.filter(
                tipo='salida',
                creado_en__date__gte=desde,
                creado_en__date__lte=hasta,
            )
            .values(
                'producto__id',
                'producto__nombre',
                'producto__unidad',
                'producto__sku',
            )
            .annotate(
                cantidad_total=Sum('cantidad'),
                movimientos=Count('id'),
            )
            .order_by('-cantidad_total')[:limit]
        )

        return Response({
            'desde': desde,
            'hasta': hasta,
            'datos': datos,
        })


# ─────────────────────────────────────────────────────────────────────────────
# Rendimiento por barbero
# ─────────────────────────────────────────────────────────────────────────────

class RendimientoBarberosView(APIView):
    permission_classes = [IsAuthenticated, EsBarberoOAdministrador]

    def get(self, request):
        desde, hasta = rango_fechas(request)
        barbero_id = request.query_params.get('barbero')

        qs = PerfilBarbero.objects.filter(activo=True)

        # Barbero solo puede ver sus propios datos
        if request.user.es_barbero:
            qs = qs.filter(usuario=request.user)
        elif barbero_id:
            qs = qs.filter(id=barbero_id)

        filtro_fecha_turno = Q(
            turnos__fecha_inicio__date__gte=desde,
            turnos__fecha_inicio__date__lte=hasta,
        )
        filtro_fecha_factura = Q(
            facturas__creado_en__date__gte=desde,
            facturas__creado_en__date__lte=hasta,
        )

        datos = list(
            qs.annotate(
                turnos_completados=Count(
                    'turnos',
                    filter=filtro_fecha_turno & Q(turnos__estado='completado'),
                ),
                turnos_cancelados=Count(
                    'turnos',
                    filter=filtro_fecha_turno & Q(turnos__estado='cancelado'),
                ),
                turnos_ausentes=Count(
                    'turnos',
                    filter=filtro_fecha_turno & Q(turnos__estado='ausente'),
                ),
                ingresos_generados=Sum(
                    'facturas__total',
                    filter=filtro_fecha_factura,
                ),
                comisiones_generadas=Sum(
                    'comisiones__monto',
                    filter=Q(
                        comisiones__factura__creado_en__date__gte=desde,
                        comisiones__factura__creado_en__date__lte=hasta,
                    ),
                ),
                promedio_por_turno=Avg(
                    'facturas__total',
                    filter=filtro_fecha_factura,
                ),
            )
            .values(
                'id',
                'usuario__first_name',
                'usuario__last_name',
                'especialidad',
                'tipo_comision',
                'valor_comision',
                'turnos_completados',
                'turnos_cancelados',
                'turnos_ausentes',
                'ingresos_generados',
                'comisiones_generadas',
                'promedio_por_turno',
            )
            .order_by('-turnos_completados')
        )

        # Reemplazar None por 0
        for item in datos:
            for campo in ('ingresos_generados', 'comisiones_generadas', 'promedio_por_turno'):
                item[campo] = item[campo] or 0

        return Response({
            'desde': desde,
            'hasta': hasta,
            'datos': datos,
        })


# ─────────────────────────────────────────────────────────────────────────────
# Comisiones generadas
# ─────────────────────────────────────────────────────────────────────────────

class ComisionesReporteView(APIView):
    permission_classes = [IsAuthenticated, EsAdministrador]

    def get(self, request):
        hoy = date.today()
        periodo = request.query_params.get('periodo', hoy.strftime('%Y-%m'))
        barbero_id = request.query_params.get('barbero')

        qs = Comision.objects.filter(periodo=periodo)
        if barbero_id:
            qs = qs.filter(barbero_id=barbero_id)

        por_barbero = list(
            qs.values(
                'barbero__id',
                'barbero__usuario__first_name',
                'barbero__usuario__last_name',
            )
            .annotate(
                total=Sum('monto'),
                cantidad=Count('id'),
                liquidado=Sum('monto', filter=Q(liquidada=True)),
                pendiente=Sum('monto', filter=Q(liquidada=False)),
            )
            .order_by('-total')
        )

        totales = qs.aggregate(
            total_comisiones=Sum('monto'),
            total_liquidadas=Sum('monto', filter=Q(liquidada=True)),
            total_pendientes=Sum('monto', filter=Q(liquidada=False)),
            cantidad_total=Count('id'),
        )

        return Response({
            'periodo': periodo,
            'totales': {k: v or 0 for k, v in totales.items()},
            'por_barbero': por_barbero,
        })


# ─────────────────────────────────────────────────────────────────────────────
# Clientes frecuentes
# ─────────────────────────────────────────────────────────────────────────────

class ClientesFrecuentesView(APIView):
    permission_classes = [IsAuthenticated, EsAdministrador]

    def get(self, request):
        desde, hasta = rango_fechas(request)
        limit = limit_param(request)
        sucursal_id = request.query_params.get('sucursal')

        qs = Cliente.objects.filter(activo=True)
        if sucursal_id:
            qs = qs.filter(sucursal_id=sucursal_id)

        datos = list(
            qs.annotate(
                turnos_completados=Count(
                    'turnos',
                    filter=Q(
                        turnos__estado='completado',
                        turnos__fecha_inicio__date__gte=desde,
                        turnos__fecha_inicio__date__lte=hasta,
                    ),
                ),
                total_gastado=Sum(
                    'facturas__total',
                    filter=Q(
                        facturas__creado_en__date__gte=desde,
                        facturas__creado_en__date__lte=hasta,
                    ),
                ),
                ultima_visita=Max(
                    'turnos__fecha_inicio',
                    filter=Q(turnos__estado='completado'),
                ),
            )
            .filter(turnos_completados__gt=0)
            .values(
                'id', 'nombre', 'apellido', 'telefono', 'email',
                'turnos_completados', 'total_gastado', 'ultima_visita',
            )
            .order_by('-turnos_completados', '-total_gastado')[:limit]
        )

        for item in datos:
            item['total_gastado'] = item['total_gastado'] or 0

        return Response({
            'desde': desde,
            'hasta': hasta,
            'datos': datos,
        })


# ─────────────────────────────────────────────────────────────────────────────
# Detalle de servicios por barbero y cliente
# ─────────────────────────────────────────────────────────────────────────────

class DetalleServiciosView(APIView):
    permission_classes = [IsAuthenticated, EsAdministrador]

    def get(self, request):
        desde, hasta = rango_fechas(request)
        barbero_id = request.query_params.get('barbero')
        cliente_q  = request.query_params.get('cliente_q', '').strip()

        qs = (
            ItemFactura.objects
            .select_related(
                'factura',
                'factura__barbero__usuario',
                'factura__cliente',
                'servicio',
            )
            .filter(
                servicio__isnull=False,
                factura__creado_en__date__gte=desde,
                factura__creado_en__date__lte=hasta,
            )
        )

        if barbero_id:
            qs = qs.filter(factura__barbero_id=barbero_id)

        if cliente_q:
            qs = qs.filter(
                Q(factura__cliente__nombre__icontains=cliente_q)
                | Q(factura__cliente__apellido__icontains=cliente_q)
                | Q(factura__cliente__telefono__icontains=cliente_q)
            )

        qs = qs.order_by('factura__creado_en')

        datos = []
        for item in qs:
            f = item.factura
            u = f.barbero.usuario
            c = f.cliente
            datos.append({
                'fecha':            f.creado_en.date().isoformat(),
                'barbero_nombre':   f'{u.first_name} {u.last_name}'.strip(),
                'cliente_nombre':   f'{c.nombre} {c.apellido}'.strip(),
                'cliente_telefono': c.telefono or '',
                'servicio_nombre':  item.servicio.nombre,
                'cantidad':         str(item.cantidad),
                'precio_unitario':  str(item.precio_unitario),
                'subtotal':         str(item.subtotal),
                'metodo_pago':      f.metodo_pago,
                'factura_id':       f.id,
            })

        return Response({'desde': desde, 'hasta': hasta, 'total': len(datos), 'datos': datos})
