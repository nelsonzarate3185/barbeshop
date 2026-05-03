"""
Carga datos iniciales: superusuario, sucursal, servicios, barberos, clientes, inventario.
Uso: python manage.py shell < scripts/datos_iniciales.py
  o: docker compose exec web python manage.py shell < scripts/datos_iniciales.py
"""
from decimal import Decimal
from apps.cuentas.models import Usuario, Sucursal
from apps.servicios.models import CategoriaServicio, Servicio
from apps.barberos.models import PerfilBarbero, HorarioBarbero, ServicioBarbero
from apps.clientes.models import Cliente
from apps.inventario.models import CategoriaProducto, Producto

sucursal, _ = Sucursal.objects.get_or_create(
    nombre='Sucursal Principal',
    defaults={'direccion': 'Av. Corrientes 1234, CABA', 'telefono': '+5491112345678', 'activa': True}
)
print(f'Sucursal: {sucursal.nombre}')

if not Usuario.objects.filter(email='admin@barberia.com').exists():
    admin = Usuario.objects.create_superuser(
        email='admin@barberia.com', password='Admin1234!',
        first_name='Admin', last_name='Barberia',
    )
    admin.rol = 'administrador'
    admin.save()
    print('Superusuario creado: admin@barberia.com / Admin1234!')
else:
    print('Superusuario ya existe')

cat_corte, _ = CategoriaServicio.objects.get_or_create(nombre='Cortes', defaults={'orden': 1})
cat_barba, _ = CategoriaServicio.objects.get_or_create(nombre='Barba', defaults={'orden': 2})
cat_combo, _ = CategoriaServicio.objects.get_or_create(nombre='Combos', defaults={'orden': 3})

for nombre, cat, dur, precio in [
    ('Corte clasico',      cat_corte, 30, '3500.00'),
    ('Corte degradado',    cat_corte, 45, '4500.00'),
    ('Corte navaja',       cat_corte, 40, '4000.00'),
    ('Arreglo de barba',   cat_barba, 20, '2000.00'),
    ('Barba completa',     cat_barba, 30, '3000.00'),
    ('Combo corte + barba',cat_combo, 60, '6500.00'),
]:
    s, c = Servicio.objects.get_or_create(nombre=nombre, defaults={'categoria': cat, 'duracion_minutos': dur, 'precio_base': Decimal(precio), 'activo': True})
    print(f'Servicio {"creado" if c else "existente"}: {s.nombre}')

for email, nombre, apellido, esp in [
    ('carlos@barberia.com', 'Carlos', 'Gomez',  'Cortes modernos'),
    ('martin@barberia.com', 'Martin', 'Lopez',  'Barba y degradados'),
]:
    u, created = Usuario.objects.get_or_create(email=email, defaults={'first_name': nombre, 'last_name': apellido, 'rol': 'barbero', 'username': email})
    if created:
        u.set_password('Barbero1234!')
        u.save()
    perfil, _ = PerfilBarbero.objects.get_or_create(usuario=u, defaults={'especialidad': esp, 'tipo_comision': 'porcentaje', 'valor_comision': Decimal('40.00'), 'activo': True})
    for dia in range(6):
        HorarioBarbero.objects.get_or_create(barbero=perfil, dia_semana=dia, defaults={'hora_inicio': '09:00', 'hora_fin': '19:00', 'disponible': True})
    for s in Servicio.objects.filter(activo=True):
        ServicioBarbero.objects.get_or_create(barbero=perfil, servicio=s)
    print(f'Barbero {"creado" if created else "existente"}: {nombre} {apellido}')

for nombre, apellido, tel in [
    ('Juan',  'Perez',     '+5491122334455'),
    ('Lucas', 'Rodriguez', '+5491133445566'),
    ('Diego', 'Martinez',  '+5491144556677'),
]:
    c, created = Cliente.objects.get_or_create(telefono=tel, defaults={'nombre': nombre, 'apellido': apellido, 'sucursal': sucursal, 'activo': True})
    print(f'Cliente {"creado" if created else "existente"}: {c.nombre_completo}')

cat_prod, _ = CategoriaProducto.objects.get_or_create(nombre='Productos de peluqueria')
for nombre, sku, stock, minimo, unidad, costo, venta in [
    ('Cera moldeadora',    'CERA-001', 50, 5, 'unidad', '800.00',  '1500.00'),
    ('Pomada mate',        'POMA-001', 30, 5, 'unidad', '900.00',  '1800.00'),
    ('Aceite barba',       'ACE-001',  20, 3, 'unidad', '1200.00', '2500.00'),
    ('Shampoo profesional','SHAM-001', 10, 2, 'litro',  '1500.00', '3000.00'),
]:
    p, c = Producto.objects.get_or_create(sku=sku, defaults={'nombre': nombre, 'categoria': cat_prod, 'stock_actual': stock, 'stock_minimo': minimo, 'unidad': unidad, 'precio_costo': Decimal(costo), 'precio_venta': Decimal(venta), 'activo': True})
    print(f'Producto {"creado" if c else "existente"}: {p.nombre}')

print('\nDatos iniciales cargados correctamente.')
