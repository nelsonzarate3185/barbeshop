from django.contrib.auth import get_user_model
from rest_framework import generics, status, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from common.permissions import EsAdministrador
from .models import Sucursal
from .serializers import (
    CambiarPasswordSerializer,
    SucursalSerializer,
    TokenPersonalizadoSerializer,
    UsuarioCrearSerializer,
    UsuarioSerializer,
)

Usuario = get_user_model()


class LoginView(TokenObtainPairView):
    serializer_class = TokenPersonalizadoSerializer
    permission_classes = [AllowAny]


class LogoutView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data.get('refresh'))
            token.blacklist()
            return Response({'detalle': 'Sesión cerrada correctamente.'})
        except Exception:
            return Response(
                {'detalle': 'Token inválido o ya expirado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class PerfilView(generics.RetrieveUpdateAPIView):
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class CambiarPasswordView(generics.UpdateAPIView):
    serializer_class = CambiarPasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['password_nuevo'])
        request.user.save(update_fields=['password'])
        return Response({'detalle': 'Contraseña actualizada correctamente.'})


class UsuarioViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        return Usuario.objects.select_related('sucursal').filter(is_active=True)

    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCrearSerializer
        return UsuarioSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.activo = False
        instance.is_active = False
        instance.save(update_fields=['activo', 'is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class SucursalViewSet(viewsets.ModelViewSet):
    queryset = Sucursal.objects.all()
    serializer_class = SucursalSerializer
    permission_classes = [IsAuthenticated, EsAdministrador]
