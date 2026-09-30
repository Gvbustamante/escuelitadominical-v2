# Análisis de flujos (UX)

Conteo de clics revisando el código actual. "Pantallas" = veces que la persona cambia de pantalla o abre una ventana.

## Nombres: Clase → Nivel
- Hoy "clase" significa dos cosas: el **grupo** (Pequeños Héroes) y la **sesión del domingo** ("día de clase", "planeación de la clase").
- Propuesta: **Nivel** = el grupo. **Clase** = la sesión de un día.
- En la base de datos ya se llama `niveles`. Solo cambian los textos de pantalla.

---

## Flujo 1 — Preparar el domingo de un nivel (enseñanza + actividad + planeación)

**Hoy (≈16 clics, 5 pantallas):**
1. Menú → Planeación → elegir día.
2. "+ Crear devocional" → lleva a la lista de Devocionales **sin la fecha ni el nivel**.
3. "+ Nuevo devocional" → escribir → **volver a elegir fecha y nivel** → Guardar.
4. Menú → Planeación → **volver a elegir el día**.
5. "+ Agregar" actividad → formulario → Guardar.
6. "+ Escribir o subir PDF" → planeación → Guardar.

**Problemas:** se pierde el contexto (fecha y nivel) al ir a Devocionales. Hay 3 formularios separados y no se ve el avance.

**Propuesta: "Preparar clase" (≈7 clics, 1 pantalla)**
- Desde el día en Planeación (o desde el cronograma): botón **Preparar clase** del nivel.
- Una sola ventana con 3 pestañas: **① Enseñanza · ② Actividad · ③ Planeación**, con fecha y nivel ya puestos.
- Checklist arriba (✅/⬜) y un botón "Siguiente →" entre pestañas.
- La enseñanza puede ser "para todos los niveles" o solo para este.

## Flujo 2 — Asistencia y estrellitas (ej. 15 niños, 5 estrellas)

**Hoy (≈25–35 clics):**
1. Menú → Asistencia → elegir nivel en la lista.
2. Tocar a cada niño presente (o "Marcar todos" y desmarcar).
3. **"Guardar asistencia"**: si sales antes, se pierde.
4. Por cada estrella: "Progreso" → ventana → elegir motivo → cerrar (3–4 clics por niño).

**Problemas:** hay que acordarse de guardar, cada estrella abre una ventana y el docente con un solo nivel igual tiene que elegirlo.

**Propuesta (≈21 clics, 0 ventanas):**
- Nivel del docente elegido solo, si tiene uno.
- **Se guarda solo** al tocar a cada niño (indicador "Guardado ✓").
- Botón **⭐ en la fila** de cada presente: 1 toque da la estrella, con el motivo opcional en chips.
- "⭐ a todos los presentes" para premiar asistencia.
- "Progreso" (notas) queda como opción aparte.

## Flujo 3 — Niño + padre, docentes y niveles

### 3a. Registrar niño y vincular padre
**Hoy (≈7 clics, 2 ventanas + búsqueda):** Niños → + Nuevo → Guardar → **buscar al niño en la lista** → 👪 → Nuevo/Existente → Crear → copiar datos.
Además hay un **segundo camino** para lo mismo (Equipo → Nueva cuenta → rol Padre → elegir hijo).

**Propuesta (≈4 clics, 1 ventana):**
- En "Nuevo niño", sección opcional **Padre/madre**: buscar uno existente o crear nuevo ahí mismo.
- Un solo Guardar → tarjeta con usuario/contraseña del padre + botón WhatsApp.
- Hermanos: al elegir un padre existente se vincula en 1 clic.

### 3b. Crear docente y asignarlo a niveles (uno o varios docentes por nivel)
**Hoy (≈8 clics por docente, 2 pantallas):** Equipo → Nueva cuenta → Guardar → Clases → editar nivel → marcar docente → Guardar (repetir por cada nivel).
Hay **3 formas distintas de asignar**: docentes del nivel (Clases), "docente fijo por horario" (Clases/Ajustes) y "Cubre hoy" (Planeación). Confunde.

**Propuesta (≈4 clics, 1 pantalla):**
- En "Nueva cuenta" (rol docente): **¿En qué niveles enseña?** con chips de selección múltiple.
- En la lista de Niveles: avatares de los docentes de cada nivel + "+ Asignar" ahí mismo.
- Un solo concepto principal: **Equipo del nivel** (1 o más docentes).
- "Por horario" pasa a "Avanzado" (oculto por defecto). "Cubre hoy" solo en el cronograma.

---

## Planeación: Cronograma y vista semanal
- **Cronograma (estilo timeline/Planner):** filas = niveles, columnas = días de clase (semana o mes).
  - Cada celda muestra los docentes del día y ●●● el estado: enseñanza / actividad / planeación.
  - Tocar la celda abre "Preparar clase". Reemplaza la pestaña "Equipo" actual.
- **Calendario:** botón **Mes / Semana**.

## Orden recomendado
1. Nivel en vez de Clase (textos).
2. Asistencia con guardado automático + ⭐ en la fila.
3. Niño + padre en un solo formulario; docente con niveles al crearlo.
4. "Preparar clase" (3 pestañas).
5. Cronograma + vista semanal.
