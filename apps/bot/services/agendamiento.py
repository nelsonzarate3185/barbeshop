"""
Herramientas que el agente IA puede invocar para consultar y crear turnos.
Cada función retorna un dict serializable a JSON.
"""
from datetime import datetime, timedelta, date

from django.apps import apps


def listar_servicios_simple() -> list[dict]:
    Servicio = apps.get_model('servicios', 'Servicio')
    qs = Servicio.objects.filter(activo=True).select_related('categoria')
    return [
        {
            'id': s.id,
            'nombre': s.nombre,
            'duracion_minutos': s.duracion_minutos,
            'precio_base': float(s.precio_base),
            'categoria': s.categoria.nombre if s.categoria else None,
        }
        for s in qs
    ]


def listar_barberos() -> list[dict]:
    """Retorna barberos activos con id y nombre."""
    PerfilBarbero = apps.get_model('barberos', 'PerfilBarbero')
    qs = PerfilBarbero.objects.filter(activo=True).select_related('usuario')
    return [
        {
            'id': b.id,
            'nombre': f"{b.usuario.first_name} {b.usuario.last_name}".strip(),
            'especialidad': b.especialidad,
        }
        for b in qs
    ]


def consultar_disponibilidad(barbero_id: int, fecha: str) -> dict:
    """
    Retorna los slots libres de 30 min para el barbero en la fecha dada.
    fecha: 'YYYY-MM-DD'
    """
    PerfilBarbero = apps.get_model('barberos', 'PerfilBarbero')
    HorarioBarbero = apps.get_model('barberos', 'HorarioBarbero')
    AusenciaBarbero = apps.get_model('barberos', 'AusenciaBarbero')
    Turno = apps.get_model('turnos', 'Turno')

    try:
        barbero = PerfilBarbero.objects.get(id=barbero_id, activo=True)
    except PerfilBarbero.DoesNotExist:
        return {'error': f'Barbero {barbero_id} no existe o no está activo'}

    try:
        fecha_dt = date.fromisoformat(fecha)
    except ValueError:
        return {'error': 'Formato de fecha inválido. Usa YYYY-MM-DD'}

    dia_semana = fecha_dt.weekday()

    # Verificar ausencia
    ausencia = AusenciaBarbero.objects.filter(
        barbero=barbero,
        fecha_inicio__date__lte=fecha_dt,
        fecha_fin__date__gte=fecha_dt,
    ).exists()
    if ausencia:
        return {'disponible': False, 'motivo': 'El barbero tiene ausencia ese día', 'slots': []}

    try:
        horario = HorarioBarbero.objects.get(
            barbero=barbero, dia_semana=dia_semana, disponible=True
        )
    except HorarioBarbero.DoesNotExist:
        return {'disponible': False, 'motivo': 'El barbero no trabaja ese día', 'slots': []}

    # Generar slots de 30 minutos
    inicio = datetime.combine(fecha_dt, horario.hora_inicio)
    fin = datetime.combine(fecha_dt, horario.hora_fin)

    turnos_del_dia = Turno.objects.filter(
        barbero=barbero,
        fecha_inicio__date=fecha_dt,
        estado__in=['pendiente', 'confirmado', 'en_curso'],
    ).values('fecha_inicio', 'fecha_fin')

    slots_libres = []
    slot = inicio
    while slot + timedelta(minutes=30) <= fin:
        slot_fin = slot + timedelta(minutes=30)
        ocupado = any(
            t['fecha_inicio'] < slot_fin and t['fecha_fin'] > slot
            for t in turnos_del_dia
        )
        if not ocupado:
            slots_libres.append(slot.strftime('%H:%M'))
        slot += timedelta(minutes=30)

    return {
        'disponible': True,
        'fecha': fecha,
        'barbero_id': barbero_id,
        'horario': f"{horario.hora_inicio.strftime('%H:%M')} - {horario.hora_fin.strftime('%H:%M')}",
        'slots': slots_libres,
    }


def crear_turno(
    telefono_cliente: str,
    nombre_cliente: str,
    barbero_id: int,
    servicio_id: int,
    fecha_hora: str,
) -> dict:
    """
    Crea un turno para el cliente. Si el cliente no existe, lo crea.
    fecha_hora: 'YYYY-MM-DDTHH:MM'
    """
    Cliente = apps.get_model('clientes', 'Cliente')
    PerfilBarbero = apps.get_model('barberos', 'PerfilBarbero')
    Servicio = apps.get_model('servicios', 'Servicio')
    Turno = apps.get_model('turnos', 'Turno')

    try:
        fecha_inicio = datetime.fromisoformat(fecha_hora)
    except ValueError:
        return {'error': 'Formato de fecha/hora inválido. Usa YYYY-MM-DDTHH:MM'}

    try:
        barbero = PerfilBarbero.objects.get(id=barbero_id, activo=True)
    except PerfilBarbero.DoesNotExist:
        return {'error': f'Barbero {barbero_id} no encontrado'}

    try:
        servicio = Servicio.objects.get(id=servicio_id, activo=True)
    except Servicio.DoesNotExist:
        return {'error': f'Servicio {servicio_id} no encontrado'}

    # Obtener o crear cliente
    partes = nombre_cliente.strip().split(' ', 1)
    nombre = partes[0]
    apellido = partes[1] if len(partes) > 1 else ''

    cliente, _ = Cliente.objects.get_or_create(
        telefono=telefono_cliente,
        defaults={'nombre': nombre, 'apellido': apellido, 'activo': True},
    )

    fecha_fin = fecha_inicio + timedelta(minutes=servicio.duracion_minutos)

    # Verificar solapamiento
    solapado = Turno.objects.filter(
        barbero=barbero,
        estado__in=['pendiente', 'confirmado', 'en_curso'],
        fecha_inicio__lt=fecha_fin,
        fecha_fin__gt=fecha_inicio,
    ).exists()

    if solapado:
        return {'error': 'El horario solicitado ya no está disponible. Por favor elige otro.'}

    turno = Turno.objects.create(
        cliente=cliente,
        barbero=barbero,
        servicio=servicio,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        estado='pendiente',
        origen='whatsapp',
    )

    return {
        'turno_id': turno.id,
        'cliente': cliente.nombre_completo,
        'barbero': f"{barbero.usuario.first_name} {barbero.usuario.last_name}".strip(),
        'servicio': servicio.nombre,
        'fecha_inicio': fecha_inicio.strftime('%d/%m/%Y %H:%M'),
        'fecha_fin': fecha_fin.strftime('%H:%M'),
        'duracion_minutos': servicio.duracion_minutos,
        'precio_base': float(servicio.precio_base),
        'estado': 'pendiente',
    }


def cancelar_turno(turno_id: int, telefono_cliente: str) -> dict:
    """Cancela un turno verificando que pertenezca al cliente."""
    Turno = apps.get_model('turnos', 'Turno')

    try:
        turno = Turno.objects.select_related('cliente').get(id=turno_id)
    except Turno.DoesNotExist:
        return {'error': f'Turno #{turno_id} no encontrado'}

    if turno.cliente.telefono != telefono_cliente:
        return {'error': 'No tienes permiso para cancelar este turno'}

    if turno.estado not in ('pendiente', 'confirmado'):
        return {'error': f'El turno en estado "{turno.estado}" no puede cancelarse'}

    turno.estado = 'cancelado'
    turno.save(update_fields=['estado'])

    return {
        'turno_id': turno_id,
        'cancelado': True,
        'mensaje': f'Turno del {turno.fecha_inicio.strftime("%d/%m/%Y %H:%M")} cancelado correctamente',
    }


def consultar_mis_turnos(telefono_cliente: str) -> list[dict]:
    """Retorna los próximos turnos activos del cliente."""
    Turno = apps.get_model('turnos', 'Turno')
    from django.utils import timezone

    ahora = timezone.now()
    turnos = Turno.objects.filter(
        cliente__telefono=telefono_cliente,
        estado__in=['pendiente', 'confirmado'],
        fecha_inicio__gte=ahora,
    ).select_related('servicio', 'barbero__usuario').order_by('fecha_inicio')[:5]

    return [
        {
            'turno_id': t.id,
            'servicio': t.servicio.nombre,
            'barbero': f"{t.barbero.usuario.first_name} {t.barbero.usuario.last_name}".strip(),
            'fecha_inicio': t.fecha_inicio.strftime('%d/%m/%Y %H:%M'),
            'estado': t.estado,
        }
        for t in turnos
    ]
