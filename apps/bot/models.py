from django.db import models


class ConversacionBot(models.Model):
    ESTADOS = [
        ('activa', 'Activa'),
        ('esperando', 'Esperando confirmación'),
        ('completada', 'Completada'),
        ('abandonada', 'Abandonada'),
    ]

    telefono = models.CharField(max_length=20, db_index=True)
    nombre_contacto = models.CharField(max_length=100, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='activa')
    # Datos recolectados durante la conversación
    datos_turno = models.JSONField(default=dict, blank=True)
    creada_en = models.DateTimeField(auto_now_add=True)
    actualizada_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-actualizada_en']
        verbose_name = 'Conversación Bot'
        verbose_name_plural = 'Conversaciones Bot'

    def __str__(self):
        return f"Conversación {self.telefono} ({self.estado})"

    @property
    def mensajes_para_api(self):
        """Retorna el historial en formato messages de la API de Claude."""
        return [
            {'role': m.rol, 'content': m.contenido}
            for m in self.mensajes.order_by('creado_en')
        ]


class MensajeBot(models.Model):
    ROLES = [
        ('user', 'Usuario'),
        ('assistant', 'Asistente'),
    ]

    conversacion = models.ForeignKey(
        ConversacionBot,
        on_delete=models.CASCADE,
        related_name='mensajes',
    )
    rol = models.CharField(max_length=10, choices=ROLES)
    contenido = models.TextField()
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['creado_en']
        verbose_name = 'Mensaje Bot'
        verbose_name_plural = 'Mensajes Bot'

    def __str__(self):
        return f"{self.rol}: {self.contenido[:60]}"
