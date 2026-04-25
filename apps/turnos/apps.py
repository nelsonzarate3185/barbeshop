from django.apps import AppConfig


class TurnosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.turnos'
    verbose_name = 'Turnos'

    def ready(self):
        import apps.turnos.signals  # noqa: F401
