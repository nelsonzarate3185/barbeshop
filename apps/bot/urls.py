from django.urls import path
from .views import PruebaBotView, webhook_meta, webhook_twilio

urlpatterns = [
    path('twilio/', webhook_twilio, name='bot-webhook-twilio'),
    path('meta/', webhook_meta, name='bot-webhook-meta'),
    path('prueba/', PruebaBotView.as_view(), name='bot-prueba'),
]
