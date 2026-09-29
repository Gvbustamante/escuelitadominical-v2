# Tareas — Escuelita Dominical

Marca `[x]` cuando se complete.

## ✅ Hecho
- [x] Bloquear acceso por URL a módulos desactivados (antes solo se ocultaban del menú).
- [x] Agregar columna `modulos_activos` a `schema.sql` + migración `supabase/actualizacion_modulos_activos.sql`.
- [x] Ajustes → Módulos: si nunca se configuró, mostrar todos como activos (antes aparecían apagados y al guardar se ocultaba todo).
- [x] Ajustes → Módulos: mostrar error si falla al guardar.

## 🔧 Pendiente inmediato
- [ ] Correr `supabase/actualizacion_modulos_activos.sql` en cada proyecto Supabase de iglesia existente.

## 🏗️ Técnico / escalabilidad
- [ ] Migrar a **multi-tenant**: un solo proyecto Supabase + un solo deploy, columna `iglesia_id` en todas las tablas + RLS por iglesia.
- [ ] Plan para mover las iglesias existentes (una base por iglesia) al proyecto único.
- [ ] Alta automática de iglesia nueva (formulario, sin SQL manual).
- [ ] Tabla `planes` → módulos incluidos por plan; la iglesia solo apaga lo que su plan incluye.
- [ ] Bloquear también datos de módulos fuera del plan vía RLS (opcional).
- [ ] Separar Escuelita, Bumblebee y Dear Guest en proyectos Supabase distintos.
- [ ] Pasar a Supabase Pro ($25/mes) con el primer cliente de pago (backups diarios, sin pausa por inactividad).

## 💰 Negocio — decidir modelo de cobro
- [ ] ¿Cobrar por **módulos**, por **docentes**, por **niños**, o combinación (plan base + límite de niños/docentes)?
- [ ] ¿Periodo: **mensual, trimestral, semestral o anual**? ¿Descuento por pago anual (ej. 2 meses gratis)?
- [ ] **Demo gratis**: ¿cuántos días (14 / 30)? ¿con todos los módulos? ¿qué pasa con los datos al terminar?
- [ ] Definir precios y nombres de planes (ej. Básico / Pro).
- [ ] Método de cobro (Stripe, Mercado Pago, transferencia).
- [ ] Calcular costo real por iglesia vs. precio (margen).

## 🎨 UI/UX
- [ ] Leer *Don't Make Me Think* (Steve Krug).
- [ ] Leer *Refactoring UI* (Wathan & Schoger).
- [ ] Leer *The Design of Everyday Things* (Don Norman).
- [ ] Prueba con 3 docentes reales: observar sin ayudar y anotar dónde se traban.
