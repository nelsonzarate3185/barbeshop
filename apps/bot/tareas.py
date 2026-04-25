"""
Tarea Celery para procesar mensajes entrantes de WhatsApp de forma asíncrona.
"""
import logging
from celery import shared_task
from django.db import transaction

logger = logging.getLogger(__name__)

# Tiempo máximo de inactividad antes de considerar la conversación abandonada
MINUTOS_INACTIVIDAD = 60


@shared_task(bind=True, max_retries=2, default_retry_delay=5)
def procesar_mensaje_whatsapp(self, telefono: str, texto: str):
    """
    1. Obtiene o crea la ConversacionBot para el teléfono.
    2. Guarda el mensaje del usuario.
    3. Llama al agente IA con el historial completo.
    4. Guarda la respuesta y la envía por WhatsApp.
    """
    from django.utils import timezone
    from datetime import timedelta

    from .models import ConversacionBot, MensajeBot
    from .services.agente_ia import procesar_mensaje
    from .services.whatsapp import enviar_mensaje

    try:
        with transaction.atomic():
            # Buscar conversación activa reciente
            hace_n = timezone.now() - timedelta(minutes=MINUTOS_INACTIVIDAD)
            conversacion = (
                ConversacionBot.objects.filter(
                    telefono=telefono,
                    estado__in=['activa', 'esperando'],
                    actualizada_en__gte=hace_n,
                )
                .order_by('-actualizada_en')
                .first()
            )

            if conversacion is None:
                conversacion = ConversacionBot.objects.create(
                    telefono=telefono,
                    estado='activa',
                )

            # Guardar mensaje entrante
            MensajeBot.objects.create(
                conversacion=conversacion,
                rol='user',
                contenido=texto,
            )

            # Obtener historial para la API (todos los mensajes anteriores al actual)
            historial = [
                {'role': m.rol, 'content': m.contenido}
                for m in conversacion.mensajes.order_by('creado_en')[:-1]
            ]

        # Llamar al agente (fuera del atomic para no bloquear la DB)
        respuesta = procesar_mensaje(telefono, texto, historial)

        with transaction.atomic():
            MensajeBot.objects.create(
                conversacion=conversacion,
                rol='assistant',
                contenido=respuesta,
            )
            conversacion.save(update_fields=['actualizada_en'])

        enviar_mensaje(telefono, respuesta)

    except Exception as exc:
        logger.exception('Error procesando mensaje de %s', telefono)
        raise self.retry(exc=exc)
