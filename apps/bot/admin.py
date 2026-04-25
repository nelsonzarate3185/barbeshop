from django.contrib import admin
from .models import ConversacionBot, MensajeBot


class MensajeBotInline(admin.TabularInline):
    model = MensajeBot
    extra = 0
    readonly_fields = ('rol', 'contenido', 'creado_en')
    can_delete = False


@admin.register(ConversacionBot)
class ConversacionBotAdmin(admin.ModelAdmin):
    list_display = ('telefono', 'nombre_contacto', 'estado', 'creada_en', 'actualizada_en')
    list_filter = ('estado',)
    search_fields = ('telefono', 'nombre_contacto')
    readonly_fields = ('creada_en', 'actualizada_en')
    inlines = [MensajeBotInline]
