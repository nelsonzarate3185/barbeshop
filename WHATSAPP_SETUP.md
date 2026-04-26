# Configuración WhatsApp con Twilio

## Requisitos
- Cuenta Twilio (https://twilio.com) — tiene prueba gratuita
- ngrok instalado para pruebas locales (https://ngrok.com)

## Paso 1 — Credenciales Twilio

1. Entrá a https://console.twilio.com
2. Copiá **Account SID** y **Auth Token** del dashboard
3. Ir a **Messaging → Try it out → Send a WhatsApp message**
4. Activar el sandbox de WhatsApp (escaneás un QR con tu celular)
5. El número del sandbox es `+14155238886`

Completar en `.env` (desarrollo) o `.env.prod` (producción):

```env
WHATSAPP_PROVEEDOR=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=+14155238886
ANTHROPIC_API_KEY=sk-ant-...
```

## Paso 2 — Exponer el servidor local con ngrok

```bash
# Terminal 1: Django corriendo
python manage.py runserver 8000

# Terminal 2: Celery corriendo (procesa mensajes en segundo plano)
celery -A config worker --loglevel=info

# Terminal 3: ngrok expone el puerto 8000
ngrok http 8000
```

ngrok te da una URL pública como `https://abc123.ngrok.io`

## Paso 3 — Configurar webhook en Twilio

1. Ir a **Messaging → Settings → WhatsApp Sandbox Settings**
2. En **"When a message comes in"** poner:

```
https://abc123.ngrok.io/api/v1/webhook/twilio/
```

Método: **HTTP POST**

3. Guardar

## Paso 4 — Probar

Desde tu celular enviá un WhatsApp al número del sandbox.
El bot debería responder en segundos.

También podés probar sin WhatsApp usando el endpoint interno:

```bash
# Primero obtener token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@barberia.com","password":"Admin1234!"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access'])")

# Enviar mensaje al bot
curl -X POST http://localhost:8000/api/v1/webhook/prueba/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"telefono": "+5491123456789", "mensaje": "Hola, quiero sacar turno"}'
```

## Producción con número propio

Para usar un número propio de WhatsApp Business:
1. Ir a **Messaging → Senders → WhatsApp Senders**
2. Registrar tu número de WhatsApp Business
3. Cambiar `TWILIO_WHATSAPP_NUMBER` al número registrado
4. El webhook apunta a tu dominio: `https://tudominio.com/api/v1/webhook/twilio/`
