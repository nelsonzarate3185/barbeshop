from django.db.models import F
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.mixins import BajaLogicaMixin
from common.permissions import SoloLecturaOAdministrador
from .models import CategoriaProducto, MovimientoStock, Producto, ServicioProducto
from .serializers import (
    CategoriaProductoSerializer,
    MovimientoStockSerializer,
    ProductoSerializer,
    ServicioProductoSerializer,
)


class CategoriaProductoViewSet(viewsets.ModelViewSet):
    queryset = CategoriaProducto.objects.all()
    serializer_class = CategoriaProductoSerializer
    permission_classes = [IsAuthenticated, SoloLecturaOAdministrador]


class ProductoViewSet(BajaLogicaMixin, viewsets.ModelViewSet):
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticated, SoloLecturaOAdministrador]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activo', 'categoria']
    search_fields = ['nombre', 'sku']
    ordering_fields = ['nombre', 'stock_actual', 'precio_venta']

    def get_queryset(self):
        return Producto.objects.select_related('categoria').filter(activo=True)

    @action(detail=False, methods=['get'], url_path='bajo-stock')
    def bajo_stock(self, request):
        qs = self.get_queryset().filter(stock_actual__lte=F('stock_minimo'))
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'], url_path='movimientos')
    def movimientos(self, request, pk=None):
        producto = self.get_object()

        if request.method == 'GET':
            qs = MovimientoStock.objects.filter(producto=producto)
            return Response(MovimientoStockSerializer(qs, many=True).data)

        serializer = MovimientoStockSerializer(
            data={**request.data, 'producto': producto.id},
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ServicioProductoViewSet(viewsets.ModelViewSet):
    queryset = ServicioProducto.objects.select_related('servicio', 'producto')
    serializer_class = ServicioProductoSerializer
    permission_classes = [IsAuthenticated, SoloLecturaOAdministrador]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['servicio', 'producto']
