import hashlib
import hmac
import logging

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .services.whatsapp import normalizar_telefono
from .tareas import procesar_mensaje_whatsapp

logger = logging.getLogger(__name__)


# ─── Webhook Twilio ───────────────────────────────────────────────────────────

@csrf_exempt
@require_POST
def webhook_twilio(request):
    """
    Recibe mensajes de WhatsApp vía Twilio.
    Twilio envía POST con campos From y Body.
    """
    from_raw = request.POST.get('From', '')
    body = request.POST.get('Body', '').strip()

    if not from_raw or not body:
        return HttpResponse(status=400)

    telefono = normalizar_telefono(from_raw)
    logger.info('Mensaje Twilio de %s: %s', telefono, body[:80])

    procesar_mensaje_whatsapp.delay(telefono, body)

    # Twilio espera una respuesta TwiML vacía para no enviar nada adicional
    return HttpResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        content_type='application/xml',
    )


# ─── Webhook Meta (WhatsApp Cloud API) ───────────────────────────────────────

@csrf_exempt
def webhook_meta(request):
    """
    Endpoint dual:
    - GET: verificación del webhook por Meta (modo challenge).
    - POST: recepción de mensajes entrantes.
    """
    if request.method == 'GET':
        return _verificar_meta(request)
    if request.method == 'POST':
        return _recibir_meta(request)
    return HttpResponse(status=405)


def _verificar_meta(request):
    verify_token = getattr(settings, 'META_VERIFY_TOKEN', '')
    mode = request.GET.get('hub.mode')
    token = request.GET.get('hub.verify_token')
    challenge = request.GET.get('hub.challenge')

    if mode == 'subscribe' and token == verify_token:
        logger.info('Webhook Meta verificado correctamente')
        return HttpResponse(challenge, content_type='text/plain')

    logger.warning('Fallo en verificación webhook Meta')
    return HttpResponse(status=403)


def _recibir_meta(request):
    import json

    # Validar firma HMAC-SHA256
    app_secret = getattr(settings, 'META_APP_SECRET', '')
    if app_secret:
        sig_header = request.headers.get('X-Hub-Signature-256', '')
        mac = hmac.new(app_secret.encode(), request.body, hashlib.sha256)  # noqa: hmac.new → built-in alias
        expected = 'sha256=' + mac.hexdigest()
        if not hmac.compare_digest(sig_header, expected):
            logger.warning('Firma Meta inválida')
            return HttpResponse(status=403)

    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return HttpResponse(status=400)

    # Iterar sobre entradas del payload
    for entry in payload.get('entry', []):
        for change in entry.get('changes', []):
            value = change.get('value', {})
            for msg in value.get('messages', []):
                if msg.get('type') != 'text':
                    continue
                telefono = normalizar_telefono(msg.get('from', ''))
                texto = msg.get('text', {}).get('body', '').strip()
                if telefono and texto:
                    logger.info('Mensaje Meta de %s: %s', telefono, texto[:80])
                    procesar_mensaje_whatsapp.delay(telefono, texto)

    return HttpResponse(status=200)


# ─── API interna: probar bot desde panel admin ────────────────────────────────

class PruebaBotView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        telefono = request.data.get('telefono', '+5491100000000')
        texto = request.data.get('mensaje', '')

        if not texto:
            return Response({'error': 'El campo "mensaje" es requerido'}, status=400)

        from .services.agente_ia import procesar_mensaje
        from .models import ConversacionBot

        conversacion = (
            ConversacionBot.objects.filter(
                telefono=telefono,
                estado__in=['activa', 'esperando'],
            )
            .order_by('-actualizada_en')
            .first()
        )

        historial = []
        if conversacion:
            historial = conversacion.mensajes_para_api

        respuesta = procesar_mensaje(telefono, texto, historial)
        return Response({'telefono': telefono, 'respuesta': respuesta})
