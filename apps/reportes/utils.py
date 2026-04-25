from datetime import date


def rango_fechas(request):
    """Devuelve (desde, hasta) como strings YYYY-MM-DD. Por defecto: mes actual."""
    hoy = date.today()
    desde = request.query_params.get('desde', hoy.replace(day=1).isoformat())
    hasta = request.query_params.get('hasta', hoy.isoformat())
    return desde, hasta


def limit_param(request, default=10, maximo=100):
    try:
        return min(int(request.query_params.get('limit', default)), maximo)
    except (ValueError, TypeError):
        return default
