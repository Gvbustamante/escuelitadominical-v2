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
- [x] **Drive privado** (enlaces firmados de 1 h). Base de prueba ✅.
- [x] **Planeación con varios archivos** (PDF, Word, PowerPoint, imágenes). Base de prueba ✅.
- [x] **PDF de planeación privados** (bucket `planeaciones`, solo equipo). Base de prueba ✅.
- [x] Pantallas unificadas: Equipo = pestañas Equipo / Familias (hoja de vida en el detalle); Planeación = Cronograma + "Quién enseña" (cobertura) + Horario semanal.
- [ ] Bumblebee usa el bucket `bumblebee-images` dentro del proyecto de Escuelita → moverlo a su propio proyecto.

## 🗄️ SQL pendiente en PRODUCCIÓN (lo corre Gisella/Carlos)
- [ ] `supabase/actualizacion_planeacion_archivos.sql` — después del de abajo (planeaciones_privado). Varios archivos por planeación.
- [ ] `supabase/actualizacion_planeaciones_privado.sql` — igual: solo cuando Boston reciba este código. La app mueve sola los PDF viejos la primera vez que un admin abre Planeación.
- [ ] `supabase/actualizacion_drive_privado.sql` — solo cuando Boston reciba el código del Drive privado (si no, sus archivos del Drive dejan de abrir).
- [x] `supabase/actualizacion_modulos_activos.sql`
- [x] `supabase/actualizacion_planeacion_clase.sql`

## 🏗️ Técnico / escalabilidad
- [ ] Migrar a **multi-tenant** (ver MULTITENANT.md — decisiones tomadas 30/sep: 1 cuenta = 1 iglesia, un solo sitio, Boston Kids aparte por ahora).
  - [ ] Fase 1: base de datos + prueba de aislamiento (en pruebas)
  - [ ] Fase 2: app (registro de iglesia, demo, archivos por iglesia)
  - [ ] Fase 3: panel de la dueña
  - [ ] Fase 4: pasar Boston Kids
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

## 🧭 Flujos (ver FLUJOS_UX.md)
- [x] Renombrar "Clase" → "Nivel" en pantallas (grupo = Nivel, sesión = Clase).
- [x] Asistencia: guardado automático + ⭐ en la fila + "⭐ a todos" + deshacer.
- [x] Nuevo niño → sigue directo a vincular padre/madre (omitible) → WhatsApp con datos → "Registrar otro niño".
- [x] Nueva cuenta docente con niveles (varios); asignar/quitar desde la lista de Niveles; horario en "Avanzado".
- [x] "Preparar clase": Enseñanza + Actividad + Planeación en una ventana con fecha y nivel puestos; avanza sola; guía con versículo/historia/actividad.
- [x] Cronograma (niveles × días) con docentes y estado E·A·P; Mes / Semana / Hoy; día de clase elegido solo.

## 🖥️ Reorganización de pantallas (ver UI_PANTALLAS.md)
- [x] Base común: título de página, barra de filtros, ‹ Mes › en español, menú ⋯, botón flotante en celular (aplicado: títulos, fechas, botón flotante; filtros en Devocionales)
- [x] Navegación: barra inferior en celular, menú de íconos en tablet, menú PC compacto
- [x] Inicio por rol: admin/coordinador/superadmin (pendientes + Próxima clase + números), docente (sus niveles + alergias), padre (tarjeta por hijo)
- [ ] Niños y Equipo (filas con ⋯, Familias aparte)
- [ ] Asistencia, Devocionales, Actividades, Bitácora con barra común
- [ ] Ajustes, Agenda, Drive, Comunidad

## 🎨 UI/UX — hallazgos en el código
- [x] 43 textos con tamaño < 12px (`text-[0.6rem]` etc.) → mínimo 12px, 16px en inputs (evita zoom en iPhone).
- [x] ~290 textos gris claro (`text-ink/30`, `/40`) → bajo contraste (WCAG AA); subir a `/60` mínimo.
- [x] Colores accesibles: botones con texto blanco en tonos 600 (contraste ≥4.5:1), texto oscuro sobre amarillo, planeación = morado, coral solo alertas, tonos 800/900 añadidos.
- [x] Botones de solo ícono con nombre (aria-label + tooltip) en ~45 botones.
- [x] Tablas → tarjetas en celular (Equipo, Clases, Materiales, Citas, Progreso, Cobertura). Asistencia mensual y Tomar asistencia quedan como tabla.
- [x] "Primeros pasos" en Inicio del admin (9 pasos con check automático y botón Ir).
- [x] Pantallas vacías con explicación y botón (sin clases, sin niños, días de clase).
- [ ] Pedir a Henry 3–5 momentos exactos donde se perdió.
- [x] Menú por secciones (Enseñanza, Día de clase, Personas, Comunidad, Gestión) cuando la iglesia no armó uno propio.
- [x] Menú con íconos Lucide (iguales en Android/iPhone/PC) y color por sección.
- [ ] Íconos Lucide en el resto de la app (botones, títulos) — hoy siguen emojis.
- [ ] Revisión visual real con la app abierta (celular + PC) con usuario de prueba.

## 📚 UI/UX — formación
- [ ] Leer *Don't Make Me Think* (Steve Krug).
- [ ] Leer *Refactoring UI* (Wathan & Schoger).
- [ ] Leer *The Design of Everyday Things* (Don Norman).
- [ ] Prueba con 3 docentes reales: observar sin ayudar y anotar dónde se traban.
