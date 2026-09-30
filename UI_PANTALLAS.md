# Revisión de pantallas (UI) — celular, tablet y PC

Revisado con la app abierta en 390 px (celular), 820 px (tablet) y 1366 px (PC), 30 sep 2026.

## Problemas que se repiten en todas las pantallas
1. **Cada pantalla ordena distinto** el título, las pestañas, los filtros y el botón principal. El usuario tiene que "aprender" cada una.
2. **En celular los filtros ocupan media pantalla** (Devocionales: 5 filas de filtros antes del primer devocional).
3. **Fechas en inglés**: los selectores de fecha y mes del navegador muestran "September 2026" o "09/30/2026" (18 lugares).
4. **Botones de solo ícono agrupados** (👁 ✏️ 👪 ⏸ 🚫): hay que adivinar qué hace cada uno.
5. **Tablet**: el menú lateral completo (250 px) le quita mucho espacio al contenido.
6. **Celular**: el menú solo se abre con ☰. Lo que más se usa el domingo (Asistencia) queda a 2 toques.
7. **Títulos con emoji** (🧒 🙏 📆) que no coinciden con los íconos de color del menú.

## Estructura única para todas las pantallas
```
[Ícono de color + Título]                        [Botón principal]
Subtítulo corto
[Pestañas]                    (si la pantalla tiene secciones)
[Barra de filtros en UNA línea: buscar · nivel · ‹ mes › · vista]
Contenido
```
- **Celular**: el botón principal pasa a botón flotante "+" abajo a la derecha. Los filtros se juntan en un botón **"Filtros (2)"** que abre un panel desde abajo; el buscador queda visible.
- **Tablet**: menú lateral angosto, solo íconos con color (72 px), que se expande al tocar ☰.
- **PC**: igual que hoy, con el menú completo.
- **Navegación inferior en celular** (docentes y admin): Inicio · Asistencia · Planeación · Niños · Más.
- **Selector de fecha propio en español**: ‹ Septiembre 2026 › y un botón "Hoy", igual que en Planeación.
- **Acciones de fila**: la acción principal visible y las demás en un menú **⋯** con texto.

## Pantalla por pantalla

### Inicio
- **Hoy**: más de 10 bloques apilados; en celular mide 2.600 px y lo importante no se ve al entrar.
- **Propuesta**:
  - Arriba, **"Próxima clase"**: por nivel, asistencia tomada ✓/✗, preparación E·A·P y docentes. Un toque abre "Preparar clase" o "Tomar asistencia".
  - Luego una fila de 4 números (niños, niveles, equipo, asistencia).
  - "Primeros pasos" en versión compacta ("Vas 4 de 9 → Siguiente: …") una vez empezado.
  - Quitar las tarjetas "Gestionar niños / niveles / docentes", porque repiten el menú.
  - **PC**: 2 columnas (izquierda: Próxima clase + cronograma de la semana; derecha: agenda, versículo, peticiones). **Tablet**: 1 columna, números en 2×2.

### Planeación
- Es la mejor pantalla hoy.
- **Propuesta**: en celular, el calendario del mes va plegado a una tira de la semana, así la clase del día se ve sin bajar. En PC, un Cronograma más ancho sin menú (modo ancho completo).

### Devocionales
- **Hoy**: pestañas + contador + 4 filtros + vista, desordenados. El mes sale en inglés.
- **Propuesta**:
  - Barra única: 🔍 buscar · Nivel · ‹ Mes › · Todos · vista.
  - En celular, "Filtros" en un panel.
  - "Versículos" como pestaña al mismo nivel, no como botón aparte.
  - PC: 3 tarjetas por fila (hoy 1 tarjeta deja mucho vacío).

### Actividades
- **Hoy**: la lista del nivel en un desplegable dentro de las pestañas; los íconos 📋 ✏️ 🗑️ no tienen texto.
- **Propuesta**: niveles como chips (1 toque); la lista agrupada por fecha con la foto; ⋯ con Duplicar / Editar / Eliminar.

### Asistencia
- **Hoy**: el nivel se elige en un desplegable; la fecha sale en inglés (09/30/2026). En PC la lista ocupa todo el ancho con poco contenido.
- **Propuesta**:
  - Niveles como chips con el conteo ("Tweens 8/12").
  - Fecha ‹ domingo 27 sep ›.
  - PC: lista a la izquierda y resumen del mes / ausencias a la derecha.
  - Celular: barra fija abajo con "8 de 12 presentes · ✓ Guardado".

### Bitácora
- **Hoy**: el estado vacío no tiene botón; "Exportar" parece desactivado; el mes sale en inglés.
- **Propuesta**: estado vacío con "+ Registrar bitácora de hoy"; ‹ Mes ›; Materiales como pestaña con el mismo orden.

### Niños
- **Hoy**: 5 íconos por fila sin texto; en PC hay mucho espacio vacío sin información útil.
- **Propuesta**:
  - Tocar la fila abre la ficha del niño; ⋯ para Editar / Vincular padre / Pausar / Desactivar.
  - PC: columnas Nivel · Edad · Padres · Asistencia del mes · ⭐.
  - Celular: tarjeta con nombre, nivel, edad, ⚠️ alergia visible y padre (o "Sin padre" en rojo).

### Niveles
- **Propuesta**: tarjetas por nivel (color, edades, docentes con avatar, cantidad de niños) en lugar de tabla; ordenar arrastrando.

### Equipo
- **Hoy**: en celular cada persona ocupa 300 px (etiquetas ROL / USUARIO / NIVEL / ESTADO). Padres y docentes están mezclados.
- **Propuesta**:
  - Tarjeta compacta: avatar · nombre · rol · niveles · punto de estado; ⋯ para acciones.
  - Pestañas **Equipo** (admin, coordinadores, docentes) y **Familias** (padres).

### Agenda
- **Propuesta**: lista "Próximos eventos" arriba y el calendario abajo (en celular) o al lado (en PC); mismo selector ‹ Mes ›.

### Comunidad (hoy "Nuestra comunidad")
- **Propuesta**: nombre corto "Comunidad" (en el menú ocupa 2 líneas); temas como lista con el último mensaje y un contador de no leídos.

### Drive
- **Hoy**: 3 botones arriba compiten entre sí.
- **Propuesta**: un solo botón "+ Nuevo" (carpeta / subir) y Papelera dentro de ⋯.

### Reporte docentes
- Bien organizado.
- **Propuesta**: en celular, 2 números por fila en vez de 4; solo mostrar roles de equipo.

### Ajustes
- **Hoy**: 5 pestañas; en PC el contenido ocupa la mitad y deja vacío el resto.
- **Propuesta**:
  - PC: submenú a la izquierda (Escuelita · Días y horarios · Módulos · Menú · Estrellas · Roles y permisos · Mi cuenta · Ayuda) y el formulario a la derecha.
  - Celular: la lista del submenú; cada opción abre su pantalla.

## Orden recomendado para implementarlo
1. **Base común**: título de página, barra de filtros, selector ‹ Mes › en español, menú ⋯, botón flotante en celular.
2. **Navegación**: barra inferior en celular y menú de íconos en tablet.
3. **Inicio** con "Próxima clase".
4. **Niños y Equipo** (filas con ⋯, Familias aparte).
5. **Asistencia, Devocionales, Actividades, Bitácora** con la barra común.
6. **Ajustes, Agenda, Drive, Comunidad.**
