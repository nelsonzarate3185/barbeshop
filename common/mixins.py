from rest_framework import status
from rest_framework.response import Response


class BajaLogicaMixin:
    """Reemplaza DELETE por baja lógica (activo=False)."""

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.activo = False
        instance.save(update_fields=['activo'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class SucursalFilterMixin:
    """Filtra automáticamente el queryset por la sucursal del usuario autenticado."""

    def get_queryset(self):
        qs = super().get_queryset()
        usuario = self.request.user
        if not usuario.es_administrador and usuario.sucursal:
            qs = qs.filter(sucursal=usuario.sucursal)
        return qs
