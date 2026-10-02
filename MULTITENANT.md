# Multi-tenant (una base y un sitio para todas las iglesias)

## Decisiones (30 sep 2026, Gisella)
- **1 cuenta = 1 iglesia.** Quien sirve en 2 iglesias tiene 2 cuentas.
- **Un solo sitio para todas.** La iglesia se sabe por el usuario. Subdominios, más adelante si hace falta.
- **Boston Kids se queda aparte por ahora.** Primero se prueba con Sharat y la iglesia de Henry.

## Diseño
- Tabla **`iglesias`**: nombre, estado (`demo` / `activa` / `suspendida`), `demo_hasta`, plan, fecha de alta.
- **`profiles.iglesia_id`**: a qué iglesia pertenece cada cuenta.
- Función **`mi_iglesia()`**: devuelve la iglesia del usuario conectado.
- Cada tabla de datos lleva **`iglesia_id` con valor por defecto `mi_iglesia()`**.
  - La app no tiene que mandar la iglesia al guardar: la base la pone sola.
  - Esto evita cambiar cientos de pantallas.
- Permisos (RLS): se agrega **`iglesia_id = mi_iglesia()`** a las 103 políticas.
- **Dueña de la plataforma** (Gisella): tabla aparte `plataforma_admins`. Puede ver todas las iglesias, crearlas, suspenderlas y cambiar planes.
- Datos que hoy son "únicos en toda la base" pasan a ser únicos **por iglesia**:
  - `dias_clase` (hoy la llave es el día) → (iglesia, día)
  - `citas_biblicas.fecha_mostrar` → (iglesia, fecha)
  - `permisos_rol` (rol, permiso) → (iglesia, rol, permiso)
  - `config_iglesia` → una fila por iglesia
  - `profiles.cedula` sigue única global (1 cuenta = 1 iglesia)
- Archivos (storage): rutas con la iglesia al inicio (`<iglesia_id>/…`) para archivos nuevos.
- Funciones que crean usuarios (`admin_create_invited_user`, etc.): el usuario nuevo queda en la iglesia de quien lo crea.
- **Prueba de aislamiento automática**: 2 iglesias de prueba; se verifica que ninguna ve ni modifica datos de la otra en todas las tablas.

## Fase 1 — cómo quedó (2 oct 2026)
- Archivos: `supabase/multitenant_fase1.sql` (migración) y `supabase/multitenant_prueba_aislamiento.sql` (prueba, no guarda nada).
- Aislamiento con **una política RESTRICTIVA por tabla** ("aislamiento iglesia"): las políticas que ya existían no se tocaron.
- Datos actuales → iglesia `a0000000-0000-4000-8000-000000000001` (Sharat, plan Completo).
- Planes: `gratis` (2 docentes = docente + coordinador activos, 25 niños activos, 5 módulos) y `completo` (sin límites). Límite en la base (trigger `limite_plan`, error `LIMITE_PLAN:`).
- Dueña: `plataforma_admins` (Gisella). `resumen_iglesias()` = lista con conteos; `entrar_iglesia(id)` = toda la app muestra esa iglesia; `entrar_iglesia(null)` = volver. `crear_iglesia(nombre, plan, días demo)` + `sembrar_iglesia` (días, permisos, estrellas, motivos, horario, config).
- Respaldo previo: schema `respaldo_mt_fase1`.
- Pendiente fase 2: archivos (storage) por iglesia, registro "Crea tu escuelita", módulos según plan en la app, aviso de demo.

## Fases (todo primero en la base de PRUEBAS)
1. **Base de datos**: `iglesias`, `iglesia_id` en las 36 tablas, `mi_iglesia()`, permisos nuevos, únicos por iglesia, prueba de aislamiento. Los datos actuales de pruebas quedan en la iglesia "Sharat".
2. **App**: registro de iglesia nueva ("Crea tu escuelita") con demo, configuración por iglesia, archivos por iglesia, aviso de demo por vencer.
3. **Panel de la dueña**: lista de iglesias, estado, plan, días de demo, suspender/activar.
4. **Boston Kids**: exportar su base y pasarla como una iglesia más (cuando se decida).

## Pendiente de negocio (define precios y demo)
- Días de demo (propuesta: 30), qué pasa al vencer (solo lectura), precio y planes.
