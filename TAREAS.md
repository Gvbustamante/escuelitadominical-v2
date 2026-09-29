# Tareas — Escuelita Dominical

Marca `[x]` cuando se complete.

## ✅ Hecho
- [x] Bloquear acceso por URL a módulos desactivados (antes solo se ocultaban del menú).
- [x] Agregar columna `modulos_activos` a `schema.sql` + migración `supabase/actualizacion_modulos_activos.sql`.
- [x] Ajustes → Módulos: si nunca se configuró, mostrar todos como activos (antes aparecían apagados y al guardar se ocultaba todo).
- [x] Ajustes → Módulos: mostrar error si falla al guardar.

## 🙋 Pedidos de la iglesia (prioridad 1)
- [x] **Nivel Tweens** — creado en la base (🎧 Tweens, 10–12 años). Ajustar edades en Clases si hace falta.
- [x] **"Vínculo" → "Nivel"** en tabla de Equipo (Docentes.jsx). Padres: mostrar "Hijo (Nivel)".
- [x] **Materiales: permitir PDF** — selector acepta fotos y PDF; columna "Archivos".
- [x] **Edad en vez de fecha de nacimiento** — pedir solo edad, guardar año aproximado para que la edad suba sola cada año. Fecha exacta opcional.
- [x] **Planeación de clase** — en Planeación, cada clase/día: escribir (con guía) y/o subir PDF con vista previa. Tabla `planeacion_clase`.
- [ ] **Planeación con IA (plan Pro)** — subir PDF y que la IA llene título, versículo, historia, objetivos y materiales. Calcular costo por PDF antes.

## 🔧 Pendiente inmediato
- [x] Proyecto "Escuelita Dominical - v2" ya tiene `modulos_activos` (text[]). Correr la migración solo en proyectos de iglesias nuevas/otras.
- [ ] Bumblebee usa el bucket `bumblebee-images` dentro del proyecto de Escuelita → moverlo a su propio proyecto.

## 🗄️ SQL pendiente en PRODUCCIÓN (lo corre Gisella/Carlos)
- [x] `supabase/actualizacion_modulos_activos.sql`
- [x] `supabase/actualizacion_planeacion_clase.sql`

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

## 🎨 UI/UX — hallazgos en el código
- [x] 43 textos con tamaño < 12px (`text-[0.6rem]` etc.) → mínimo 12px, 16px en inputs (evita zoom en iPhone).
- [x] ~290 textos gris claro (`text-ink/30`, `/40`) → bajo contraste (WCAG AA); subir a `/60` mínimo.
- [x] Botones de solo ícono con nombre (aria-label + tooltip) en ~45 botones.
- [x] Tablas → tarjetas en celular (Equipo, Clases, Materiales, Citas, Progreso, Cobertura). Asistencia mensual y Tomar asistencia quedan como tabla.
- [ ] Menú admin con 14 opciones → usar menú por categorías por defecto.
- [ ] Emojis como íconos se ven distinto en Android/iPhone → evaluar set de íconos (ej. Lucide).
- [ ] Revisión visual real con la app abierta (celular + PC) con usuario de prueba.

## 📚 UI/UX — formación
- [ ] Leer *Don't Make Me Think* (Steve Krug).
- [ ] Leer *Refactoring UI* (Wathan & Schoger).
- [ ] Leer *The Design of Everyday Things* (Don Norman).
- [ ] Prueba con 3 docentes reales: observar sin ayudar y anotar dónde se traban.
