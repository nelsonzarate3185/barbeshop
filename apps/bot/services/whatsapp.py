"""
Abstracción para enviar mensajes por WhatsApp.
Soporta Twilio y modo simulado (para desarrollo/tests).
"""
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def enviar_mensaje(telefono: str, texto: str) -> bool:
    """
    Envía un mensaje de WhatsApp al número indicado.
    Retorna True si se envió correctamente.

    telefono: formato E.164 sin prefijo 'whatsapp:', ej '+5491123456789'
    """
    proveedor = getattr(settings, 'WHATSAPP_PROVEEDOR', 'simulado')

    if proveedor == 'twilio':
        return _enviar_twilio(telefono, texto)

    # Modo simulado: solo loguear
    logger.info('[WhatsApp simulado] → %s: %s', telefono, texto[:100])
    return True


def _enviar_twilio(telefono: str, texto: str) -> bool:
    try:
        from twilio.rest import Client as TwilioClient
    except ImportError:
        logger.error('twilio no instalado. Ejecutá: pip install twilio')
        return False

    account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    from_number = getattr(settings, 'TWILIO_WHATSAPP_NUMBER', '')

    if not all([account_sid, auth_token, from_number]):
        logger.error('Credenciales Twilio no configuradas en settings')
        return False

    try:
        client = TwilioClient(account_sid, auth_token)
        client.messages.create(
            from_=f'whatsapp:{from_number}',
            to=f'whatsapp:{telefono}',
            body=texto,
        )
        return True
    except Exception as exc:
        logger.exception('Error enviando mensaje Twilio a %s: %s', telefono, exc)
        return False


def normalizar_telefono(raw: str) -> str:
    """
    Convierte distintos formatos al formato E.164 sin el prefijo 'whatsapp:'.
    Twilio envía 'whatsapp:+5491123456789', Meta envía '5491123456789'.
    """
    telefono = raw.replace('whatsapp:', '').strip()
    if not telefono.startswith('+'):
        telefono = '+' + telefono
    return telefono
