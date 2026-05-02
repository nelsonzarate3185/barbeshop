from django.urls import path

from .views import (
    ClientesFrecuentesView,
    ComisionesReporteView,
    DashboardView,
    DetalleServiciosView,
    IngresosPorPeriodoView,
    ProductosUtilizadosView,
    RendimientoBarberosView,
    ServiciosPopularesView,
)

urlpatterns = [
    path('dashboard/',            DashboardView.as_view(),            name='reporte-dashboard'),
    path('ingresos/',             IngresosPorPeriodoView.as_view(),    name='reporte-ingresos'),
    path('servicios-populares/',  ServiciosPopularesView.as_view(),    name='reporte-servicios'),
    path('productos-utilizados/', ProductosUtilizadosView.as_view(),   name='reporte-productos'),
    path('rendimiento-barberos/', RendimientoBarberosView.as_view(),   name='reporte-barberos'),
    path('comisiones/',           ComisionesReporteView.as_view(),     name='reporte-comisiones'),
    path('clientes-frecuentes/',  ClientesFrecuentesView.as_view(),    name='reporte-clientes'),
    path('detalle-servicios/',    DetalleServiciosView.as_view(),      name='reporte-detalle-servicios'),
]
