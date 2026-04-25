"""
Agente IA usando Claude con tool use para agendar turnos vía WhatsApp.
"""
import json
import logging
from django.conf import settings

import anthropic

from .agendamiento import (
    cancelar_turno,
    consultar_disponibilidad,
    consultar_mis_turnos,
    crear_turno,
    listar_barberos,
    listar_servicios_simple,
)

logger = logging.getLogger(__name__)

# ─── Definición de herramientas ───────────────────────────────────────────────

HERRAMIENTAS = [
    {
        'name': 'listar_servicios',
        'description': (
            'Lista todos los servicios disponibles en la barbería con su duración y precio. '
            'Úsala cuando el cliente pregunte qué servicios ofrecemos.'
        ),
        'input_schema': {
            'type': 'object',
            'properties': {},
            'required': [],
        },
    },
    {
        'name': 'listar_barberos',
        'description': (
            'Lista los barberos disponibles con su nombre y especialidad. '
            'Úsala cuando el cliente quiera elegir un barbero.'
        ),
        'input_schema': {
            'type': 'object',
            'properties': {},
            'required': [],
        },
    },
    {
        'name': 'consultar_disponibilidad',
        'description': (
            'Muestra los horarios libres de un barbero en una fecha concreta. '
            'Úsala antes de crear un turno para confirmar disponibilidad.'
        ),
        'input_schema': {
            'type': 'object',
            'properties': {
                'barbero_id': {
                    'type': 'integer',
                    'description': 'ID del barbero a consultar',
                },
                'fecha': {
                    'type': 'string',
                    'description': 'Fecha en formato YYYY-MM-DD',
                },
            },
            'required': ['barbero_id', 'fecha'],
        },
    },
    {
        'name': 'crear_turno',
        'description': (
            'Crea un turno para el cliente. Requiere nombre, barbero, servicio y fecha/hora. '
            'Siempre confirma los datos con el cliente antes de llamar esta herramienta.'
        ),
        'input_schema': {
            'type': 'object',
            'properties': {
                'telefono_cliente': {
                    'type': 'string',
                    'description': 'Número de teléfono del cliente (se obtiene automáticamente)',
                },
                'nombre_cliente': {
                    'type': 'string',
                    'description': 'Nombre completo del cliente',
                },
                'barbero_id': {
                    'type': 'integer',
                    'description': 'ID del barbero elegido',
                },
                'servicio_id': {
                    'type': 'integer',
                    'description': 'ID del servicio elegido',
                },
                'fecha_hora': {
                    'type': 'string',
                    'description': 'Fecha y hora en formato YYYY-MM-DDTHH:MM',
                },
            },
            'required': [
                'telefono_cliente', 'nombre_cliente',
                'barbero_id', 'servicio_id', 'fecha_hora',
            ],
        },
    },
    {
        'name': 'cancelar_turno',
        'description': 'Cancela un turno existente del cliente.',
        'input_schema': {
            'type': 'object',
            'properties': {
                'turno_id': {
                    'type': 'integer',
                    'description': 'ID del turno a cancelar',
                },
                'telefono_cliente': {
                    'type': 'string',
                    'description': 'Teléfono del cliente para verificar propiedad',
                },
            },
            'required': ['turno_id', 'telefono_cliente'],
        },
    },
    {
        'name': 'consultar_mis_turnos',
        'description': (
            'Muestra los próximos turnos activos del cliente. '
            'Úsala cuando pregunte "mis turnos", "mis citas" o quiera ver/cancelar algo.'
        ),
        'input_schema': {
            'type': 'object',
            'properties': {
                'telefono_cliente': {
                    'type': 'string',
                    'description': 'Teléfono del cliente',
                },
            },
            'required': ['telefono_cliente'],
        },
    },
]

# Mapa nombre → función
_DISPATCH: dict = {
    'listar_servicios': lambda args: listar_servicios_simple(),
    'listar_barberos': lambda args: listar_barberos(),
    'consultar_disponibilidad': lambda args: consultar_disponibilidad(**args),
    'crear_turno': lambda args: crear_turno(**args),
    'cancelar_turno': lambda args: cancelar_turno(**args),
    'consultar_mis_turnos': lambda args: consultar_mis_turnos(**args),
}

SYSTEM_PROMPT = """\
Eres el asistente virtual de {nombre_barberia}, una barbería profesional.
Tu rol es ayudar a los clientes a agendar, consultar y cancelar turnos por WhatsApp.

REGLAS:
- Sé amable, conciso y profesional. Usa español rioplatense informal (vos, che).
- Nunca inventes información sobre precios, horarios o barberos: usa las herramientas.
- Para agendar un turno necesitas: nombre del cliente, servicio, barbero y fecha/hora.
- Antes de crear el turno, muestra el resumen y pide confirmación.
- Si el slot ya no está disponible, ofrece alternativas consultando disponibilidad.
- No discutas temas fuera de la barbería.
- Responde siempre en texto plano sin markdown (el cliente lee por WhatsApp).
"""


def _ejecutar_herramienta(nombre: str, argumentos: dict) -> str:
    fn = _DISPATCH.get(nombre)
    if fn is None:
        return json.dumps({'error': f'Herramienta desconocida: {nombre}'})
    try:
        resultado = fn(argumentos)
        return json.dumps(resultado, ensure_ascii=False, default=str)
    except Exception as exc:
        logger.exception('Error ejecutando herramienta %s', nombre)
        return json.dumps({'error': str(exc)})


def procesar_mensaje(telefono: str, texto: str, historial: list[dict]) -> str:
    """
    Ejecuta el loop de tool use de Claude y retorna la respuesta final en texto.

    historial: lista de dicts {'role': 'user'|'assistant', 'content': str}
    """
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    nombre_barberia = getattr(settings, 'NOMBRE_BARBERIA', 'Barbería')

    system = SYSTEM_PROMPT.format(nombre_barberia=nombre_barberia)

    # Historial + mensaje nuevo
    messages = list(historial) + [{'role': 'user', 'content': texto}]

    # Loop agentico manual
    MAX_ITERACIONES = 10
    for _ in range(MAX_ITERACIONES):
        response = client.messages.create(
            model='claude-opus-4-7',
            max_tokens=1024,
            thinking={'type': 'adaptive'},
            system=[
                {
                    'type': 'text',
                    'text': system,
                    'cache_control': {'type': 'ephemeral'},
                }
            ],
            tools=HERRAMIENTAS,
            messages=messages,
        )

        # Agregar respuesta del asistente al historial en curso
        messages.append({'role': 'assistant', 'content': response.content})

        if response.stop_reason == 'end_turn':
            # Extraer el último bloque de texto
            for bloque in response.content:
                if bloque.type == 'text':
                    return bloque.text
            return ''

        if response.stop_reason != 'tool_use':
            break

        # Ejecutar herramientas y agregar resultados
        resultados_tools = []
        for bloque in response.content:
            if bloque.type == 'tool_use':
                resultado = _ejecutar_herramienta(bloque.name, bloque.input)
                logger.info('Tool %s → %s', bloque.name, resultado[:200])
                resultados_tools.append({
                    'type': 'tool_result',
                    'tool_use_id': bloque.id,
                    'content': resultado,
                })

        messages.append({'role': 'user', 'content': resultados_tools})

    return 'Ocurrió un error procesando tu mensaje. Por favor intentá de nuevo.'
