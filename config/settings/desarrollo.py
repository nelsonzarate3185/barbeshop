from .base import *  # noqa: F401, F403

DEBUG = True
ALLOWED_HOSTS = ['*']
CORS_ALLOW_ALL_ORIGINS = True

try:
    import debug_toolbar  # noqa: F401
    INSTALLED_APPS = INSTALLED_APPS + ['debug_toolbar']  # noqa: F405
    MIDDLEWARE = ['debug_toolbar.middleware.DebugToolbarMiddleware'] + MIDDLEWARE  # noqa: F405
except ImportError:
    pass

INTERNAL_IPS = ['127.0.0.1']

# En desarrollo usar caché en memoria si Redis no está disponible
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# Celery en modo eager (sin broker) para desarrollo
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
