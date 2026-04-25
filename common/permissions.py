from rest_framework.permissions import BasePermission, SAFE_METHODS


class EsAdministrador(BasePermission):
    message = 'Se requiere rol de Administrador.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.es_administrador
        )


class EsAdministradorORecepcionista(BasePermission):
    message = 'Se requiere rol de Administrador o Recepcionista.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.es_administrador or request.user.es_recepcionista)
        )


class EsBarberoOAdministrador(BasePermission):
    message = 'Se requiere rol de Barbero o Administrador.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.es_administrador or request.user.es_barbero)
        )


class SoloLecturaOAdministrador(BasePermission):
    """Lectura libre para autenticados; escritura solo para administradores."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.es_administrador


class EsPropietarioOAdministrador(BasePermission):
    """El objeto pertenece al usuario autenticado o el usuario es administrador."""

    def has_object_permission(self, request, view, obj):
        if request.user.es_administrador:
            return True
        if hasattr(obj, 'usuario'):
            return obj.usuario == request.user
        return obj == request.user
