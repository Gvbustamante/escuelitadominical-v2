# KidsMin — Documentación maestra de la plataforma 📖

Este documento describe **todo** lo que compone la plataforma: qué es, cómo está construida, cómo se relacionan sus piezas, el modelo de datos completo y cómo se despliega. Es el punto de referencia único para entender el proyecto sin tener que leer todo el código.

> Para dar de alta una iglesia nueva paso a paso, ver [`NUEVA_IGLESIA.md`](./NUEVA_IGLESIA.md). Para la guía rápida de desarrollo, ver [`README.md`](./README.md).

---

## 1. Qué es

**KidsMin** es un sistema de gestión para escuelas dominicales cristianas (ministerio infantil de una iglesia). Cubre el ciclo completo de un domingo y de la semana:

- Registro de niños y organización por clases/niveles.
- Control de asistencia, con vista de tabla mensual (nombres × días) y un modal para tomarla/editarla por clase y fecha.
- Actividades con archivos multimedia (miniaturas), versículo clave e historia bíblica, editables, con vista de lista o de **calendario mensual** ("plan del mes") — los padres solo ven las actividades ya dadas y visibles (no las futuras, y el equipo puede marcar una como "solo equipo" para ocultarla de padres/niños).
- Agenda de eventos, con vista de calendario.
- Devocionales para niños, con imagen opcional, editables y filtrables por mes.
- Progreso individual del niño (comportamiento, emoción, logros) con notas del docente.
- Gamificación (estrellas y medallas) para motivar a los niños.
- **Panorama del día** en el inicio del admin ("Cobertura de hoy"): qué clase tiene docente asignado y si ya se tomó asistencia, para detectar huecos antes de que sea un problema.
- **Bitácora de clase**: constancia con foto de que el salón quedó en buen estado y de qué refrigerio se dio a los niños, por clase y fecha.
- **Inventario de materiales**: qué hay disponible (general, para niños o para una clase), con foto, cantidad y aviso cuando queda poco.
- **WhatsApp de contacto**: cada docente y cada padre puede tener un número guardado, con un botón que abre directo el chat (`wa.me`) — editable desde "Ver detalle".
- Nombre y logo de la iglesia personalizables (Ajustes), que reemplazan el branding "KidsMin" en el menú y la pantalla de ingreso.
- Un portal para padres, donde ven todo lo relacionado a sus hijos.
- Comunidad: foro (con temas públicos o privados —solo staff—), versículo del día, peticiones de oración.
- Multi-tenant "por fork": cada iglesia tiene su propio proyecto de Supabase y su propio despliegue, sin compartir datos con otras iglesias (ver sección 8).

## 2. Roles

| Rol | Quién lo tiene | Qué puede hacer |
|---|---|---|
| `admin` | El/la responsable general del ministerio | Todo: gestiona niños, clases, docentes, invita usuarios de cualquier rol, ajustes de la app (logo, nombre) |
| `coordinador` | Igual capacidad operativa que admin | Mismo acceso que admin, salvo que solo puede invitar `docente` y `padre` (no puede crear otro admin/coordinador) |
| `docente` | Maestro/a de una o más clases | Toma asistencia, publica actividades y devocionales, agenda eventos, registra progreso — solo en las clases (`niveles`) que tiene asignadas |
| `padre` | Padre/madre/tutor | Ve la info de sus hijos (asistencia, actividades, progreso, agenda), reacciona a actividades, participa en el foro |

Las cuentas de `docente` y `padre` (y `coordinador`) **solo las crea alguien con acceso admin/coordinador**, vía el botón "Invitar" — no hay registro público. Ver sección 5.4.

Cada ruta de la app está protegida por rol vía `<ProtectedRoute roles={[...]}>` (`src/components/ProtectedRoute.jsx`) y por Row Level Security en la base de datos (doble candado: UI + base de datos).

### 2.1 Dónde viven los roles en el código (para poder cambiarlos)

**No existe una tabla `roles` ni una config central.** Los 4 roles (`admin`, `coordinador`, `docente`, `padre`) están escritos como texto literal, repetidos en varios archivos independientes. Cambiar el set de roles (agregar, quitar o renombrar uno) significa editar **todos** estos puntos a la vez y de forma consistente — si se olvida uno, queda una inconsistencia entre lo que permite la base de datos y lo que muestra/permite la UI.

**A. Base de datos (`supabase/schema.sql`)**

| Qué | Dónde | Línea |
|---|---|---|
| Lista oficial de roles válidos (constraint de la tabla) | `role text not null check (role in ('admin','coordinador','docente','padre'))` | `schema.sql:11` |
| Quién puede invitar y a quién (reglas de jerarquía) | función `admin_create_invited_user`: valida `caller_role`, `p_role`, y que un `coordinador` solo invite `docente`/`padre` | `schema.sql:359`, `363`, `367-368` |
| Reglas de acceso por rol (RLS) — quién lee/escribe cada tabla | ~50 políticas `create policy ... using (... p.role in (...))`, una por tabla/operación | `schema.sql:168` a `586` (todo el bloque `-- SEGURIDAD (RLS)`) |
| Reglas de acceso a archivos subidos (Storage) | políticas sobre `storage.objects` para los buckets `actividades` y `logos` | `schema.sql:326`, `333`, `574`, `580`, `586` |

**B. Frontend — enrutamiento (`src/App.jsx`)**

| Qué | Dónde | Línea |
|---|---|---|
| Grupo "staff" (acceso amplio) | `const STAFF = ['admin', 'coordinador']` | `App.jsx:35` |
| Qué roles pueden entrar a cada pantalla | prop `roles={...}` en cada `<ProtectedRoute>` (ej. `roles={STAFF}`, `roles={[...STAFF, 'docente', 'padre']}`) | `App.jsx:61-129` |
| Qué componente se muestra según el rol logueado (mismo path, distinta pantalla) | funciones `RoleSwitchHome`, `RoleSwitchAsistencia`, `RoleSwitchActividades`, `RoleSwitchAgenda`, `RoleSwitchProgreso` — comparan `profile.role === 'docente' / 'padre'` | `App.jsx:147-174` |

**C. Frontend — navegación y componentes**

| Qué | Dónde | Línea |
|---|---|---|
| Menú lateral: qué links ve cada rol | objeto `NAV = { admin: [...], coordinador: [...], docente: [...], padre: [...] }` | `src/components/Layout.jsx:8-56` |
| Etiqueta visible del rol ("Administrador", "Docente", etc.) | objeto `ROLE_LABEL` | `src/components/Layout.jsx:58-63` |
| Filtro final de acceso a cada ruta (chequea `roles.includes(profile.role)`) | `src/components/ProtectedRoute.jsx:21` |
| Copia local de `STAFF` (⚠️ duplicada, no importada de `App.jsx`) para saber si mostrar controles de admin en la "cita del día" | `src/components/CitaDelDia.jsx:6, 37` |

**D. Frontend — alta de usuarios**

| Qué | Dónde |
|---|---|
| Formulario/llamada que crea un usuario con un rol específico, pasándolo al RPC de la base de datos | `src/lib/invite.js` (parámetro `role` → `p_role`), invocado desde las pantallas de invitar en `src/pages/admin/Docentes.jsx`, `Ninos.jsx` (padres), etc. |

**Resumen para tocarlos con cuidado:** si vas a cambiar los roles (p. ej. a un modelo `admin` / `líder` / `profesor`), el checklist es:
1. Cambiar el `check` de `role` en `schema.sql:11`.
2. Reescribir las reglas de jerarquía en `admin_create_invited_user` (quién invita a quién).
3. Reescribir **todas** las políticas RLS que mencionan los roles viejos (bloque completo de seguridad).
4. Actualizar `STAFF` y los `roles={...}` de cada ruta en `App.jsx`.
5. Actualizar `NAV` y `ROLE_LABEL` en `Layout.jsx`.
6. Actualizar la copia duplicada de `STAFF` en `CitaDelDia.jsx` (y revisar si hay más copias sueltas antes de dar por cerrado el cambio — conviene buscar `role in (` y `profile.role` en todo el repo).
7. Ajustar las pantallas y textos de invitación (`src/lib/invite.js` y las páginas que la usan) para el nuevo set de roles.

### 2.1.1 Responsive: celular, tablet y PC
Las clases base compartidas (`.btn`, `.card`, `.input`, `.badge` en `src/index.css`) son más compactas por defecto (pensadas para celular) y se agrandan a partir de `sm:` (tablet en adelante) — así toda la plataforma se ajusta de una vez, sin tener que retocar cada pantalla por separado. El menú lateral (`Layout.jsx`) también es más angosto e ícono-solo en celular, y se expande con etiquetas de texto a partir de `md:`. El contenido dentro de `<main>` tiene un ancho máximo centrado (`max-w-screen-2xl`) para que no se vea demasiado estirado en monitores muy anchos, sin afectar tablets ni celulares (que ya son más angostos que ese límite).

## 3. Stack tecnológico

| Capa | Tecnología | Versión (package.json) |
|---|---|---|
| Framework UI | React | ^18.3.1 |
| Bundler / dev server | Vite | ^5.4.8 |
| Routing | React Router DOM | ^6.26.2 |
| Estilos | Tailwind CSS | ^3.4.13 |
| Backend / base de datos / auth / storage | Supabase (Postgres + Auth + Storage) | cliente `@supabase/supabase-js` ^2.45.4 |
| CSS post-procesamiento | PostCSS + Autoprefixer | ^8.4.47 / ^10.4.20 |
| Editor de texto enriquecido | Tiptap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`) | ^3.30.1 |
| Sanitización de HTML | DOMPurify | ^3.4.13 |
| Hosting | GitHub Pages (vía GitHub Actions) — también configurado para Netlify (`netlify.toml`) | — |

No hay backend propio (Node/Express, etc.): toda la lógica de servidor vive en **Postgres** (funciones `plpgsql`, RLS) dentro de Supabase. El frontend es una **SPA 100% estática** que habla directo con Supabase mediante su SDK JS.

Tipografías: `Baloo 2` (display, títulos) y `Nunito` (body), configuradas en `tailwind.config.js`. Paleta de colores propia (sunshine, sky, grass, coral, grape, cream, ink) pensada para una interfaz amigable/infantil.

## 4. Estructura del repositorio

```
├── index.html                  # entry HTML de Vite
├── src/
│   ├── main.jsx                 # bootstrap de React + AuthProvider + BrowserRouter
│   ├── App.jsx                  # todas las rutas y el enrutamiento por rol
│   ├── index.css                # estilos globales (Tailwind + utilidades propias: .btn-secondary, etc.)
│   ├── contexts/
│   │   └── AuthContext.jsx      # sesión de Supabase Auth + perfil (tabla profiles)
│   ├── lib/
│   │   ├── supabaseClient.js    # cliente Supabase (usa VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
│   │   ├── invite.js            # llama al RPC admin_create_invited_user
│   │   ├── gamification.js      # lógica de medallas/estrellas (sin backend, todo en frontend)
│   │   ├── colors.js            # helpers de color por nivel/clase
│   │   ├── configIglesia.js     # caché compartida de config_iglesia (logo/nombre), hook useConfigIglesia()
│   │   ├── whatsapp.js          # whatsappLink(telefono) → URL de wa.me o null
│   │   ├── useCountUp.js        # hook de animación numérica
│   │   ├── useMisClases.js      # hook: clases asignadas al docente logueado
│   │   └── useMisHijos.js       # hook: hijos vinculados al padre logueado
│   ├── components/              # piezas reutilizables: Layout, Modal, ConfirmModal, Skeleton,
│   │                             #   VistaToggle (tarjetas/lista/calendario), CalendarioAgenda,
│   │                             #   TomarAsistenciaModal, DetalleNinoModal, DetalleUsuarioModal,
│   │                             #   PadreContacto (WhatsApp editable), AppLogo, AppName, CoberturaHoy,
│   │                             #   StatCard, RewardsPanel, etc.
│   └── pages/
│       ├── Landing.jsx, Login.jsx, CompleteProfile.jsx, Tutorial.jsx
│       ├── Devocionales.jsx, Foro.jsx, MiFamilia.jsx   # comunes a varios roles
│       ├── admin/                # AdminHome, Ninos, Clases, Docentes, AsistenciaAdmin,
│       │                         # ActividadesAdmin, AgendaAdmin, CitasBiblicasAdmin, Ajustes,
│       │                         # BitacoraAdmin, Materiales
│       ├── docente/               # DocenteHome, Asistencia, Actividades, Agenda, Progreso, Bitacora
│       └── padre/                 # pantallas exclusivas padre
├── supabase/
│   ├── schema.sql                # esquema completo: tablas, RLS, funciones, storage, seed de versículos
│   ├── primer_admin.sql          # script para crear la primera cuenta admin de una iglesia nueva
│   └── actualizacion_evidencias_materiales.sql  # ejemplo de "fragmento de SQL suelto" (ver sección 6.6):
│                                                  # imagen en devocionales, bitácora, materiales
├── materiales/                   # PDFs de referencia/demo del producto
├── .github/workflows/deploy.yml  # CI/CD a GitHub Pages
├── netlify.toml                  # config alternativa de despliegue en Netlify
├── vite.config.js, tailwind.config.js, postcss.config.js
└── package.json
```

## 5. Cómo funciona (flujo de la aplicación)

### 5.1 Arranque y sesión (`main.jsx`, `AuthContext.jsx`)
`main.jsx` envuelve la app en `<AuthProvider>` (contexto propio) y `<BrowserRouter>`. `AuthContext`:
- Obtiene la sesión activa de Supabase Auth (`supabase.auth.getSession()`).
- Se suscribe a `onAuthStateChange` (login, logout, recuperación de contraseña).
- Carga el registro correspondiente en `public.profiles` (el "perfil" con `role`, `nombre_completo`, etc.) y lo expone junto con la sesión.
- Expone `signIn`, `signOut`, `refreshProfile`, y flags como `needsProfile` (sesión sin perfil aún) y `passwordRecovery`.

### 5.2 Enrutamiento (`App.jsx`)
- Rutas públicas: `/bienvenida` (landing), `/login`, `/completar-perfil`.
- Todo lo demás vive dentro de `<ProtectedRoute><Layout /></ProtectedRoute>`, que exige sesión activa, perfil completo y cuenta activa.
- Varias rutas son **"switch" por rol** en el mismo path (p. ej. `/` renderiza `AdminHome`, `DocenteHome` o `PadreHome` según `profile.role`; `/asistencia` igual con `Asistencia`/`AsistenciaAdmin`). Esto simplifica el menú (mismo link, distinta pantalla) en vez de tener rutas separadas por rol.
- `ProtectedRoute` además filtra por `roles={[...]}` cuando una pantalla es exclusiva de ciertos roles (p. ej. `/ninos`, `/clases`, `/docentes` y `/ajustes` son solo `STAFF` = `['admin','coordinador']`).

### 5.3 Navegación (`Layout.jsx`)
El menú lateral (`NAV`) está definido **por rol** (admin, coordinador, docente, padre), cada uno con su propio set de links e íconos. Si el usuario logueado (aunque sea staff) también tiene hijos vinculados, se le agrega dinámicamente el link "Mi familia".

En pantallas **md y más grandes** (≥768px) el menú es la columna fija de siempre, siempre visible. Por debajo de `md` (celular y tablet en vertical) el `<aside>` pasa a ser un **drawer** (`fixed`, fuera del flujo, `-translate-x-full` cuando está cerrado) que no ocupa espacio en pantalla hasta que se abre: una barra superior (`md:hidden`) con un botón ☰ lo abre (`translate-x-0`, con transición), y se cierra tocando la ✕ del propio menú, tocando el fondo oscuro detrás (`onClick` en el overlay), o navegando a cualquier link (el `useEffect` que ya reseteaba el scroll al cambiar de `pathname` también cierra el menú).

### 5.4 Alta de usuarios (invitaciones)
No existe un endpoint de "sign up" público. El alta de `docente`/`padre`/`coordinador` la hace un admin/coordinador desde la UI, que llama a `src/lib/invite.js` → RPC de Postgres `admin_create_invited_user(p_cedula, p_role, p_nombre_completo, p_nino_id, p_parentesco)` (definida en `schema.sql`). Esa función, ejecutando con privilegios elevados (`security definer`):
1. Verifica que quien llama sea `admin`/`coordinador` (y que un coordinador no intente crear otro admin/coordinador).
2. Genera un email interno sintético a partir de la cédula: `cedula@accesskids.local`.
3. Genera una contraseña temporal: `cedula.` (la cédula + un punto).
4. Crea el usuario directamente en `auth.users` + `auth.identities` (sin flujo de invitación por correo real).
5. Crea la fila en `public.profiles` con el rol correspondiente.
6. Si es `padre`, además crea el vínculo en `ninos_padres`.
El admin/coordinador le comparte a mano la cédula (usuario) y la contraseña temporal generada a la persona invitada.

### 5.5 Gamificación
Las estrellas (tabla `reconocimientos`, otorgadas por docente/admin a un niño) y sus insignias son **configurables por el admin**, no hardcodeadas:
- `motivos_reconocimiento`: catálogo de motivos rápidos (emoji + texto) que el docente puede tocar al dar una estrella, en vez de escribir siempre texto libre (aunque también puede escribir uno propio). Editable desde `/estrellas` (`ConfigEstrellas.jsx`).
- `niveles_estrella`: las insignias (`🐣` a `👑` por defecto) y a partir de cuántas estrellas se alcanza cada una. También editable desde `/estrellas` — se puede agregar, renombrar o borrar un nivel sin tocar código.
- `src/lib/nivelesEstrella.js` (hook `useNivelesEstrella`, con caché como `configIglesia.js`) reemplaza la lógica que antes vivía hardcodeada en `gamification.js`; `src/lib/motivosReconocimiento.js` hace lo mismo para el catálogo de motivos. `gamification.js` ahora solo guarda los mensajes motivacionales aleatorios.
- El picker de motivo vive dentro de `RewardsPanel.jsx` (botón "⭐ Dar una estrella" → abre el catálogo + un campo de texto libre), reutilizado en `Progreso.jsx`, `ProgresoNinoModal.jsx` y la vista de solo lectura del padre.

`Progreso.jsx` (docente) también tiene `VistaToggle` tarjetas/lista — la lista muestra de un vistazo la insignia y el total de estrellas de cada niño de la clase.

### 5.6 Asistencia: tabla mensual + modal para tomarla
Tanto el admin (`AsistenciaAdmin.jsx`) como el docente (`docente/Asistencia.jsx`) muestran como vista principal una **tabla mensual** (`ResumenAsistenciaMensual.jsx`: niños en filas, días con asistencia tomada en columnas) para una clase y mes elegidos. El botón **"+ Tomar asistencia"** abre `TomarAsistenciaModal.jsx`: se elige la fecha, se marca presente/ausente por niño (con confeti si todos están presentes) y se guarda con un `upsert` sobre `asistencia` (única por `nino_id`+`fecha`). El admin puede tomar asistencia de cualquier clase — útil cuando falta el docente titular.

### 5.7 Cobertura de hoy (panorama del admin)
`CoberturaHoy.jsx`, en el inicio del admin, primero revisa `dias_clase`: si hoy **no** es un día de clase activo, muestra un aviso neutral ("hoy no hay clase") y no calcula nada más — así no genera alarmas falsas los días que la escuelita no funciona. Si sí es día de clase, cruza `niveles` + `horarios` activos + `asignacion_horario`/`docentes_niveles` (docente fijo) + `cobertura_dia` (suplente de hoy) + `ninos` + `asistencia` de hoy para mostrar, por clase (y por horario, si hay más de uno configurado): quién es el docente, cuántos niños tiene y si ya se registró asistencia. Una clase solo se marca en rojo ("sin docente") o amarillo ("pendiente") si el horario correspondiente **ya pasó** según la hora actual (`horarios.hora`) — un servicio que todavía no empieza hoy se muestra neutral ("⏳ Aún no empieza"), no como alarma. La tarjeta de "Asistencia hoy" en `AdminHome.jsx` sigue la misma regla de `dias_clase`: si hoy no toca escuelita, muestra "💤 Sin clase" en vez de un conteo en cero. Es puramente de lectura sobre tablas existentes, sin tabla propia.

### 5.8 Plan de actividades (calendario mensual)
El calendario mensual para planear/repasar qué se enseña cada domingo vive en **Planeación** (`Planeacion.jsx`, ver 5.17), que reutiliza `CalendarioAgenda.jsx` (el mismo calendario de Agenda). `ActividadesAdmin.jsx` y `docente/Actividades.jsx` ya no tienen su propia vista de calendario — ver 5.14 sobre por qué Actividades quedó solo en vista compacta.

### 5.9 WhatsApp de contacto
No hay columna `whatsapp` dedicada: se reutiliza `profiles.telefono` (existía desde el inicio del esquema, sin uso previo en la UI). `src/lib/whatsapp.js` expone `whatsappLink(telefono)`, que limpia el número y arma un link `https://wa.me/...`. Se edita desde `DetalleUsuarioModal.jsx` (Equipo) y `PadreContacto.jsx` (padres, embebido en `DetalleNinoModal.jsx` y directo en la tarjeta de cada niño en `Ninos.jsx`), con un botón "💬 Abrir chat de WhatsApp" cuando hay un número guardado.

### 5.10 Bitácora de clase y Materiales
- **Bitácora** (`bitacora_clase`, rutas `/bitacora`): una fila por clase, fecha **y `momento`** (`'antes'` o `'despues'`, único por `nivel_id`+`fecha`+`momento`) — el docente deja constancia por separado de cómo encontró el salón al llegar (**antes**) y de cómo lo entrega al terminar la clase, con foto y una descripción libre en ambos casos; el refrigerio dado (detalle + foto) solo aplica a **después**. `docente/Bitacora.jsx` muestra las dos como una mini lista de chequeo ("🚪 Antes de clase" / "🏁 Después de clase", cada una con badge ✅ Hecha / ⏳ Falta) para la clase y fecha elegidas — al tocar una se abre su formulario. Admin/coordinador ven el historial agrupado por fecha en `BitacoraAdmin.jsx` con el mismo par de badges por día, y también pueden **registrar cualquiera de las dos ellos mismos** (botón "📝 Registrar bitácora", eligiendo clase, fecha y momento) — la RLS de `bitacora_clase` ya lo permitía desde el inicio, solo faltaba el formulario en la pantalla de admin.
- **Materiales** (`materiales`, pestaña "🧰 Materiales" dentro de `BitacoraAdmin.jsx`, ruta `/materiales` redirige a `/bitacora` — ver 5.27): inventario simple con nombre, categoría (general / para niños / para una clase), cantidad, foto y aviso visual cuando la cantidad es baja (≤ 2). Solo admin/coordinador la ven (el docente entra a `/bitacora` y ve `BitacoraDocente`, que no tiene esta pestaña).

Ambas son tablas que **no existían** en el `schema.sql` original — ver sección 6.6 sobre cómo se agregaron a un proyecto ya desplegado.

### 5.11 Tareas dentro de actividades
Una actividad puede marcarse como **tarea** (`actividades.es_tarea`), con un **enlace externo** opcional (`actividades.enlace_externo`, ej. un video o formulario fuera de la plataforma). Cuando es tarea, cada niño del nivel tiene su propia fila en `tarea_entregas` con tres estados:
- **Pendiente**: no ha pasado nada todavía (no hace falta insertar una fila hasta que alguien actúe).
- **Pausada**: el docente la puso en espera desde el checklist (`TareaEntregas.jsx`) — no es un error ni un "pendiente" olvidado, es una decisión explícita del docente.
- **Entregada**: el padre subió un archivo (foto, PDF...) desde `PadreActividades.jsx`, con comentario opcional. El docente puede responder con una nota corta (`nota_docente`) que el padre ve.

El checklist `TareaEntregas.jsx` (usado tanto por `docente/Actividades.jsx` como por `admin/ActividadesAdmin.jsx` vía el botón "📋 Ver entregas") lista a cada niño del nivel por nombre, para que quede claro quién entregó qué.

Los archivos de evidencia se guardan en el mismo bucket `actividades` de Storage, bajo el prefijo `tareas/{actividad_id}/{nino_id}/...`.

### 5.12 Niños pausados
`ninos.pausado` es un estado aparte de `activo` (que sigue siendo "¿está inscrito?"): un niño pausado se muestra en gris/desactivado en `Ninos.jsx` y `Progreso.jsx`, y en el checklist de tareas aparece directamente como "⏸️ Pausado (niño)" en vez de "Pendiente" — así no genera una falsa alarma de tarea atrasada mientras el niño no está asistiendo. Se activa/desactiva con un botón, sin perder ningún historial.

### 5.13 Revisar inactividad (niños y padres)
Botón "🔍 Revisar inactividad" en Ajustes (solo admin/coordinador) que llama a la función `revisar_inactividad()` (RPC, security definer):
- **Niños**: se pausan (`ninos.pausado = true`) los que tuvieron alguna asistencia presente alguna vez pero ninguna en los últimos 3 meses. Un niño que nunca ha tenido asistencia registrada **nunca** se pausa automáticamente (podría ser un recién inscrito).
- **Padres**: se pausan (`profiles.pausado = true`) los que no han entrado (`auth.users.last_sign_in_at`, o `created_at` si nunca entraron) en más de 2 meses.
- Es **solo una marca visual** — nunca bloquea el login. Un padre pausado se reactiva solo (`Layout.jsx`) la próxima vez que entra, y ve un aviso de bienvenida explicándole que estuvo marcado como inactivo.
- Se ejecuta manualmente (no hay cron) para que funcione igual en cualquier proyecto de Supabase sin configuración extra; el admin lo toca cuando quiera (ej. cada domingo).

### 5.14 Exportar a Excel y vistas de lista
- `src/lib/exportExcel.js`: genera un `.xlsx` real (librería `xlsx`/SheetJS, cargada con `import()` dinámico solo al exportar) — cada dato en su propia celda, sin depender del separador CSV que espera el Excel de cada quien (coma vs. punto y coma según el idioma). Botón "📊 Exportar" en Niños, Materiales, Bitácora y el resumen mensual de Asistencia.
- **Niños, Equipo (Docentes) y Clases** ahora son de **solo lista/tabla** — se quitó el toggle de tarjetas para que la información quede más compacta y fácil de escanear.
- **Materiales** ganó una vista "📃 Lista compacta" además de las tarjetas.
- **Actividades** (docente y admin) quedó **solo** en la vista "📃 Compacta" (una fila por actividad, componente compartido `ActividadFila.jsx`) — se quitaron las vistas de tarjetas y calendario que tenía antes (ver 5.25), para dejar la pantalla más simple.

### 5.15 Agenda y tareas en los 3 dashboards
`ProximaAgenda.jsx`: widget que combina los próximos eventos de `agenda` con las tareas recientes (`actividades.es_tarea`), ordenados por fecha. Aparece en `AdminHome`, `DocenteHome` y `PadreHome`, cada uno con su propio alcance:
- **Admin/coordinador**: sin filtrar, ve de todas las clases.
- **Docente**: filtrado a sus propios niveles asignados (+ eventos generales sin nivel).
- **Padre**: filtrado a los niveles de sus hijos, y en vez de listar todas las tareas del nivel, solo muestra las que **sus propios hijos** todavía no han entregado (`soloTareasPendientes`).

### 5.17 Días de clase, horarios y Planeación
- `dias_clase`: qué días de la semana (0=domingo … 6=sábado) hay escuelita — un patrón recurrente, no fechas sueltas. Se configura en **Ajustes → Días de clase** (solo admin/coordinador), con los 7 días como toggles; por defecto solo domingo viene activo.
- `horarios`: los servicios que se repiten cada día de clase (ej. "9:00 am", "11:00 am"). Toda iglesia arranca con uno solo, **"Servicio único"**, así que si solo hay un servicio no hay que tocar nada. Se administran en **Ajustes → Horarios** (agregar, renombrar, activar/desactivar) — ver 5.18.
- **Planeación** (`/planeacion`, admin/coordinador **y docente**): calendario del mes que marca en azul los días de clase configurados. Un docente solo ve y planea **sus propias clases** (las de `docentes_niveles` donde es el docente); admin/coordinador ven todas. Al elegir un día, por cada clase visible se ve, **por cada horario activo** (si solo hay uno, no se etiqueta para no saturar la pantalla):
  - Quién la cubre — el docente fijo de `asignacion_horario` (nivel+horario) y, si esa clase todavía no tiene nada configurado por horario, se usa como respaldo la lista general de `docentes_niveles`; o un **suplente** para esa fecha puntual si hay uno asignado.
  - `cobertura_dia`: tabla de overrides puntuales (única por `nivel_id`+`horario_id`+`fecha`). Si no hay fila ahí, se asume el docente fijo. El selector para asignar/quitar un suplente **solo se muestra a admin/coordinador** (la RLS de `cobertura_dia` de todas formas solo deja escribir a esos roles); el docente ve la cobertura como información, no como algo que pueda cambiar.
  - Si ya hay una actividad planeada ese día para esa clase (`actividades` con esa `fecha`+`nivel_id`), su título con botón "Editar"; si no, "+ Planear" abre un formulario corto (sin archivos — esos se agregan después desde Actividades) que crea la actividad ahí mismo. La actividad **no** depende del horario — hay una sola por clase y fecha, igual que la asistencia (ver 5.18).

### 5.18 Varios horarios el mismo día
Algunas iglesias tienen más de un servicio el mismo día de clase (ej. 9:00 am y 11:00 am), con niños que no siempre van al mismo. Decisiones de diseño:
- **La asistencia no cambia**: sigue siendo un registro por niño y día (`asistencia`), sin dimensión de horario — un niño puede ir a cualquiera de los dos servicios y de todas formas queda "presente" ese día.
- **La cobertura sí es por horario**, porque a quien hay que avisar/asignar sí cambia según el servicio. Tabla nueva `asignacion_horario` (nivel+horario → docente fijo) además de `docentes_niveles` (que sigue siendo la que de verdad autoriza al docente a ver/gestionar la clase en el resto de la plataforma — asistencia, actividades, bitácora, etc.).
- **Auto-vínculo**: en `Clases.jsx`, si hay más de un horario activo, el formulario de la clase muestra un selector "Docente fijo por horario" además de la lista general de docentes. Al guardar, cualquier docente asignado por horario se agrega automáticamente a `docentes_niveles` aunque no se haya marcado a mano en la lista general — así queda autorizado sin un paso extra. Con un solo horario ("Servicio único") este selector ni aparece; todo sigue funcionando como antes, solo con la lista general.
- **No hay "sedes"**: cada iglesia usa su propio proyecto de Supabase (ver sección 8), así que horarios solo resuelve "varios servicios el mismo lugar", no multi-sede.
- **Un horario puede ser de un solo día de la semana** (`horarios.dia_semana`, 0=domingo…6=sábado, `null` = aplica a todos los días de clase). Caso real: domingo tiene 3 servicios pero sábado (u otro día de clase) solo 1 — antes Planeación y "Cobertura de hoy" (`CoberturaHoy.jsx`, en el dashboard del admin) mostraban los 3 horarios del domingo también el sábado, generando alarmas falsas de "sin docente". Ahora, en Ajustes → Horarios, cada horario tiene un selector de día; Planeación filtra por el día de la semana del día seleccionado en el calendario, y Cobertura de hoy filtra por el día de la semana de hoy. Los horarios con `dia_semana = null` (el caso por defecto, y el de cualquier iglesia con un solo horario o el mismo horario todos los días) siguen aplicando a cualquier día, sin que nadie tenga que configurar nada. La sección "Docente fijo por horario" dentro de Clases (edición de una clase) sigue mostrando **todos** los horarios (no los filtra por día), porque una misma clase puede reunirse en más de un día de la semana — cada horario ahí se etiqueta con su día para no confundirlos.

### 5.16 Devocional activo
`devocionales_ninos.activo`: el admin/coordinador/docente puede marcar un devocional como el destacado del momento (botón "⭐ Marcar activo" en Devocionales, que se ve ahora como lista compacta). La app se encarga de que solo haya uno activo a la vez, desmarcando el anterior. Se muestra dentro de `ResumenHoy.jsx` (ver 5.19) en los 3 dashboards. `CitaDelDia.jsx` también lo usa: si nadie fijó manualmente una cita bíblica para hoy (`citas_biblicas.fecha_mostrar`), pero hay un devocional activo con versículo, el "Versículo del día" toma ese versículo en vez de la rotación automática.

### 5.19 Resumen de hoy (dashboard)
`ResumenHoy.jsx` es una sola tarjeta que junta todo lo del día: el devocional activo, los eventos de `agenda` con `fecha = hoy`, y las `actividades` (incluyendo tareas) con `fecha = hoy` — filtrado por `nivelIds` igual que `ProximaAgenda.jsx` (undefined = sin filtrar para admin/coordinador; un array para docente/padre). Si no hay nada de nada ese día, no se muestra (igual que `ProximaAgenda`). Reemplazó al antiguo `DevocionalActivo.jsx` (ahora eliminado), que solo mostraba el devocional por separado; `ProximaAgenda.jsx` se mantiene aparte para el vistazo de "qué viene" más adelante (no solo hoy).

Materiales, Equipo y Clases quedaron solo en vista de lista/tabla — ver 5.14. Versículos (`CitasBiblicasAdmin.jsx`) también se convirtió de tarjetas a tabla. Actividades (docente y admin) quedó solo en la vista "📃 Compacta" — ver 5.25.

### 5.20 Permisos por rol, y docentes editando niños
- **`permisos_rol`**: interruptores de permisos extra por rol (rol+permiso, `activo`). Si no hay fila para una combinación, se asume **no permitido**. Se leen con el helper SQL `tiene_permiso(rol, permiso)`, usado dentro de las políticas RLS que lo necesitan, y con el hook `usePermisosRol()` (`src/lib/permisosRol.js`) en el frontend para mostrar/ocultar botones. El catálogo de permisos disponibles (con su texto amigable) vive en `PERMISOS_DISPONIBLES` en ese mismo archivo — agregar uno nuevo requiere una fila ahí + la política RLS que lo respete.
- Permisos curados (todos empiezan en el valor de la lista, editables en **Ajustes → Roles y permisos**, solo admin — ver 5.25):
  - `docente.editar_ninos` (**activado por defecto**): el docente puede editar nombre/fecha de nacimiento/alergias/notas de los niños de sus propias clases (ya existía la política RLS, ahora respeta este interruptor en vez de estar siempre encendida).
  - `docente.agregar_ninos` (apagado por defecto): el docente puede registrar niños nuevos directamente.
  - `docente.vincular_padres` (apagado por defecto): el docente puede crear/vincular una cuenta de padre/madre para un niño de su propia clase — habilita también que `admin_create_invited_user` acepte a un docente como llamador (antes solo admin/coordinador), restringido a `p_role='padre'` y a niños de sus propias clases.
  - `docente.elegir_clase` (apagado por defecto): el docente puede unirse/salirse de cualquier clase por su cuenta (insert/delete propio en `docentes_niveles`), sin que el admin tenga que asignarlo desde Clases. Puede estar en varias a la vez, y puede unirse a una clase que ya tenga otro(s) docente(s) (no hay exclusividad). Nueva tarjeta `MiClase.jsx` en el Inicio del docente, visible solo con este permiso activado.
- **`Ninos.jsx`** ahora es accesible también para `docente` (antes solo staff): un docente ve solo los niños de sus clases asignadas, y los botones "+ Nuevo niño/a", "Editar" y "+ Padre" aparecen o no según los permisos de arriba. "Pausar/Reanudar", "Desactivar/Activar", "Exportar" y "✕ Desvincular" siguen siendo solo de staff.
- **`Docentes.jsx`** (ruta `/docentes`, nav "Equipo", admin/coordinador) lista **todas** las cuentas de cualquier rol (admin, coordinador, docente, padre) en un solo lugar, con búsqueda y filtro por rol — ver 5.25 sobre por qué se fusionó con lo que antes era la pantalla `Usuarios.jsx` aparte. "+ Nueva cuenta" crea cualquier rol (reutiliza `admin_create_invited_user`, pidiendo el niño/a cuando el rol es padre). "Ver detalle" (`DetalleUsuarioModal.jsx`) permite editar nombre/cédula/teléfono, y si quien mira es `admin` (y no es su propia cuenta) también **cambiar el rol** y **restablecer la contraseña** a la de por defecto (`admin_reset_password(user_id)`, misma regla de quién-puede-tocar-a-quién que al invitar). No reemplaza los atajos que ya existían (Niños → +Padre) — los complementa.
- `usePermisosRol().tiene(rol, permiso)` es resiliente: si la fila no existe en la base (por ejemplo porque no se ha corrido `actualizacion_permisos.sql` todavía), usa el valor `porDefecto` del catálogo `PERMISOS_DISPONIBLES` en vez de negar todo de golpe. Los errores de lectura/escritura sobre `permisos_rol` se muestran en pantalla en vez de fallar en silencio (pestaña Roles y permisos, ahora dentro de Ajustes).

### 5.21 El docente edita y elimina sus propias actividades; confirmación al borrar un evento
- `docente/Actividades.jsx` ganó los mismos botones ✏️ Editar y 🗑️ Eliminar que ya tenía el admin — la RLS de `actividades` ya lo permitía para el nivel propio, solo faltaba el botón.
- Los botones "🗑️" de Agenda (`docente/Agenda.jsx` y `admin/AgendaAdmin.jsx`) ahora piden confirmación (`ConfirmModal`) antes de borrar un evento — antes borraban con un solo clic, sin avisar.

### 5.22 Editor de texto enriquecido
- `RichTextEditor.jsx`: editor chiquito basado en Tiptap, con una barra de herramientas al estilo de la plataforma (botones redondos, se pintan de `sky-400` cuando están activos) y solo 5 acciones a propósito — **negrita, cursiva, lista, lista numerada y link** — sin pegar HTML libre, para mantener bajo el riesgo de guardar contenido peligroso. Guarda el resultado como HTML en el mismo campo `text` que ya existía (`descripcion`, `contenido`, `comentario_padre`) — no hizo falta ninguna columna nueva para esto.
- `RichTextView.jsx`: lo que lee ese HTML de vuelta. **Nunca** se inyecta el HTML guardado tal cual — pasa primero por `DOMPurify.sanitize(...)` con una lista blanca de solo `p, br, strong, em, ul, ol, li, a` (y atributos `href/target/rel`). Es una medida de defensa en profundidad: la RLS de `actividades`/`devocionales_ninos` ya permite escribir a cualquier miembro del staff, así que la app no puede asumir que el HTML guardado es seguro de inyectar directo con `dangerouslySetInnerHTML`.
- Estilos del contenido renderizado en `.rich-content` (`src/index.css`) — no se usa un plugin de tipografía de Tailwind, son reglas propias mínimas (párrafos, listas, links, negrita, placeholder cuando está vacío).
- Dónde se usa — escritura y lectura:
  - `ActividadesAdmin.jsx` y `docente/Actividades.jsx`: campo "Descripción" de una actividad.
  - `Devocionales.jsx`: campo "Reflexión para el niño/a" (`contenido`). De paso se aprovechó para que la fila de un devocional sea desplegable (▼/▲) y muestre el contenido completo — antes se guardaba pero **no se mostraba en ningún lado** de la app.
  - `PadreActividades.jsx` (`TareaHijo`): el comentario que un padre/madre escribe al subir la evidencia de una tarea, ahora con la misma barra chiquita (variante `compact`) en vez de un `<input type="text">` de una sola línea.
  - `TareaEntregas.jsx`: muestra ese `comentario_padre` ya sanitizado en el checklist que ve el docente/admin.
- La nota del docente (`nota_docente`) y las descripciones de Agenda/Planeación **no** se tocaron — se quedaron en texto plano a propósito, para no ampliar el alcance del cambio.

### 5.23 Actividades para el equipo docente
- `actividades.audiencia` (`'ninos'` por defecto, o `'docentes'`): permite crear una actividad que no es para una clase sino un **comunicado, capacitación o tarea dirigida a todo el equipo docente**. Una actividad `audiencia='docentes'` no lleva `nivel_id` (queda `null`).
- No hizo falta ninguna política RLS nueva sobre `actividades`: `"leer actividades"` ya dejaba leer cualquier fila a admin/coordinador/docente sin filtrar por nivel, y `"gestionar actividades"` ya solo dejaba escribir a admin/coordinador cuando `nivel_id` es `null` (un docente nunca tiene una fila en `docentes_niveles` con `nivel_id = null`, así que ese `exists(...)` siempre da falso para él) — es decir, **crear/editar/borrar un comunicado del equipo ya quedaba restringido a admin/coordinador solo por cómo estaba escrita la política existente**.
- `ActividadesAdmin.jsx` (solo admin/coordinador crean): pestaña "🧒 Niños" / "🍎 Equipo docente" arriba de la lista. En el modo "Equipo docente" se oculta el selector de clase y el toggle "Quién la puede ver" (no aplica, es contenido de staff por definición), y la actividad se crea con `nivel_id: null`, `audiencia: 'docentes'`.
- `docente/Actividades.jsx`: pestaña "🧒 Mi clase" / "🍎 Para el equipo" (con un punto rojo si hay algo pendiente). En "Para el equipo" el docente **solo lee** — no hay botón "+ Nueva actividad" ahí, porque la RLS no lo permite (ver arriba). Si la actividad es tarea (`es_tarea`), aparece un botón propio "✅ Marcar como hecha" / "Deshacer".
- `tarea_entregas` ahora puede tener una fila **por docente** en vez de por niño: `nino_id` pasó a ser nullable, se agregó `docente_id` (también nullable), un `check` que exige que **exactamente uno** de los dos esté lleno, y un `unique(actividad_id, docente_id)` que convive con el `unique(actividad_id, nino_id)` que ya existía (en Postgres, `NULL` nunca choca contra otro `NULL` en un `unique`, así que las dos restricciones no interfieren entre sí). Se agregaron 3 ramas nuevas (`docente_id = auth.uid()`) a las políticas de `tarea_entregas` para que un docente pueda leer/crear/actualizar su propia fila — las políticas existentes, pensadas para niños, no le daban acceso a estas filas nuevas.
- `TareaEntregas.jsx` (el checklist que usa admin/coordinador) detecta `actividad.audiencia === 'docentes'` y cambia de listar niños del nivel a listar **docentes activos** (`profiles` con `role='docente'` y `activo=true`), usando `docente_id` en vez de `nino_id` para el upsert. El botón "⏸️ Pausar" no aplica a docentes y se oculta en ese modo.

### 5.24 Página extendida (estilo blog) de una actividad o un devocional
- Tocar el título de cualquier actividad (en cualquiera de las 3 pantallas: `ActividadesAdmin.jsx`, `docente/Actividades.jsx`, `PadreActividades.jsx`, y también desde `ActividadFila.jsx` en la vista compacta) o de un devocional (`Devocionales.jsx`) ya no solo expande texto en la misma lista — navega a una página propia: `/actividades/:id` (`ActividadDetalle.jsx`) o `/devocionales/:id` (`DevocionalDetalle.jsx`). Los botones de acción (editar, eliminar, marcar activo, ver entregas) siguen viviendo en la lista y usan `stopPropagation`/están fuera del área clickeable para no disparar la navegación sin querer.
- Diseño tipo blog: la primera foto adjunta (para una actividad) o `imagen_url` (para un devocional) se muestra como **imagen principal** a todo el ancho arriba de la tarjeta; el resto de fotos queda en una mini galería, y el resto de archivos (PDFs, Word, etc.) se listan debajo como **"📎 Materiales para descargar"** (`ArticulosAdjuntos.jsx`), un renglón por archivo con icono según el tipo y botón "⬇️ Descargar".
- `ActividadDetalle.jsx` reutiliza los mismos widgets que ya existían en las listas (extraídos a componentes propios para no duplicar código): `TareaHijoWidget.jsx` (subir evidencia, antes vivía dentro de `PadreActividades.jsx`) y `MiEntregaEquipoWidget.jsx` (marcar como hecha, antes vivía dentro de `docente/Actividades.jsx`). Según el rol de quien mira, muestra "📋 Ver entregas" (staff, o docente dueño de la clase), el widget de "marcar como hecha" (docente, actividad para el equipo) o la tarjeta de subir tarea por cada hijo/a (padre) — la misma lógica de permisos que ya tenían las listas, ahora centralizada en un único componente `TareaSeccion` dentro de `ActividadDetalle.jsx`.
- **Devocionales ahora tienen reacciones y archivos adjuntos propios**, algo que antes solo existía para actividades: `devocional_reacciones` (mismo patrón que `actividad_reacciones`, pero abierto a **cualquier** usuario autenticado, no solo padres — un devocional es contenido de comunidad) y `devocional_archivos` (mismo patrón que `actividad_archivos`, para guías o materiales descargables aparte de la imagen principal). El formulario de crear/editar devocional (`Devocionales.jsx`) ahora también sube estos materiales, con el mismo flujo de subida por lotes que ya usaba Actividades.
- `DevocionalDetalle.jsx` termina con una sección **"🙏 Otros devocionales"**: los 4 más recientes (sin contar el actual), cada uno con su miniatura, versículo y cuántas reacciones tiene — clic navega a ese devocional.
- `ReaccionesBar.jsx` es el componente de reacciones genérico (antes la lógica vivía duplicada/hardcodeada dentro de `PadreActividades.jsx`): recibe la tabla, la columna del id del contenido, la columna de quién reacciona (`padre_id` para actividades, `usuario_id` para devocionales) y hace el upsert/delete. `PadreActividades.jsx` mantiene su propia barra de reacciones en la lista (para no tocar ese flujo ya probado) además de un enlace directo a la página extendida.

### 5.25 Menú del staff más corto: Equipo, Ajustes con pestañas, Actividades solo compacta
Con el tiempo el menú de admin/coordinador había crecido a 17 links. Este cambio no toca ningún dato — es puramente de dónde vive cada cosa en la interfaz:
- **`Usuarios.jsx` se fusionó con `Docentes.jsx`** (nav "Equipo 🍎", ruta `/docentes` sin cambios): ya no hay una pantalla aparte para "cualquier tipo de cuenta" y otra solo para staff — `Docentes.jsx` ahora es la versión completa (todas las cuentas, incluyendo padres, con búsqueda/filtro/crear/detalle/restablecer contraseña) y `Usuarios.jsx` se borró. `DetalleDocenteModal.jsx` (que ya era un subconjunto de `DetalleUsuarioModal.jsx`) también se borró — `Docentes.jsx` usa directo `DetalleUsuarioModal.jsx`. La ruta vieja `/usuarios` redirige a `/docentes` (`<Navigate>`) por si alguien la tenía guardada.
- **"Roles y permisos" se movió de Usuarios a Ajustes** (`PermisosTab.jsx`, extraído a su propio componente para poder vivir en cualquiera de las dos pantallas — ahora solo en Ajustes). Sigue siendo visible solo para `admin`.
- **Ajustes ahora tiene pestañas**: *General* (logo/nombre, revisar inactividad, días de clase, horarios — el contenido que ya existía), *Mi cuenta* (cambiar la propia contraseña — antes era un botón fijo en el menú lateral, ver abajo), *Ayuda* (el mismo contenido de la pantalla Ayuda, ver siguiente punto) y *Roles y permisos* (solo admin).
- **`Tutorial.jsx` se partió en dos**: `AyudaContenido()` (exportado, sin encabezado propio) tiene las pestañas "Guía paso a paso"/"¿Qué hace cada rol?" y la tarjeta "Acerca de KidsMin"; `Tutorial()` (export default, sin cambios de comportamiento) le pone el encabezado "Ayuda 🎓" encima y sigue siendo la página de la ruta `/ayuda`. Docente y padre **no tienen Ajustes**, así que conservan `/ayuda` como link normal del menú; admin/coordinador ya no lo tienen en el menú (usan la pestaña *Ayuda* dentro de Ajustes), pero la ruta `/ayuda` sigue funcionando igual si alguien la visita directo.
- **El botón "🔑 Contraseña" del menú lateral** (`Layout.jsx`) ahora solo se muestra a `docente` y `padre` (quienes no tienen Ajustes). Para `admin`/`coordinador` vive en Ajustes → Mi cuenta, usando el mismo `CambiarPasswordModal.jsx` (es un componente sin estado externo, así que puede montarse en más de un lugar sin conflicto).
- **Actividades (`ActividadesAdmin.jsx` y `docente/Actividades.jsx`) quedó solo en vista compacta**: se quitó el `VistaToggle` y las vistas de tarjetas/calendario — para planear con calendario ya existe **Planeación** (ver 5.17), así que la vista de calendario que tenía Actividades era redundante. Se borró el componente `ActividadCard` (tarjeta) de `ActividadesAdmin.jsx` y el branch "tarjetas" de `docente/Actividades.jsx`; la pestaña "🍎 Para el equipo" de `docente/Actividades.jsx` no tenía toggle y no cambió.
- El nav de admin/coordinador pasó de 17 a 15 links: se fusionó Usuarios (dentro de Equipo) y se quitó Ayuda del menú (absorbida por Ajustes → Ayuda), como se explicó arriba.

### 5.26 La contraseña por defecto usa `@` en vez de `.`, y la UI dice "usuario" en vez de "cédula"
- **Contraseña por defecto**: pasó de `cédula.` a `usuario@` (el "usuario" sigue siendo, en la práctica, la cédula guardada en `profiles.cedula`). Cambio hecho en las dos funciones que la generan — `admin_create_invited_user(...)` y `admin_reset_password(user_id)` — dentro de `schema.sql` y en la migración incremental `actualizacion_password_arroba.sql` (ver 6.6). **Solo afecta contraseñas generadas de ahora en adelante**: una cuenta creada antes de este cambio sigue entrando con `usuario.` hasta que alguien la restablezca (Equipo → Ver detalle → "Restablecer a la contraseña por defecto"), momento en el que pasa a `usuario@`. No hay manera de "migrar en masa" las contraseñas ya existentes porque solo se guardan hasheadas — nunca en texto plano.
- **"Cédula" pasó a llamarse "Usuario"** en el login (`Login.jsx`) y en el formulario de crear cuenta (`Docentes.jsx` → "+ Nueva cuenta"), incluyendo el placeholder y el mensaje de error de login. Es un cambio de **rótulo únicamente** — la columna en la base sigue llamándose `profiles.cedula`, y el botón "🎲 Generar" (código fácil en vez de la cédula real, `src/lib/codigoFacil.js`) ya dejaba claro que ese campo es en realidad "cualquier identificador único que la persona pueda recordar", no necesariamente el número de cédula legal. `DetalleUsuarioModal.jsx` (editar una cuenta ya creada) y las columnas de las tablas siguen diciendo "Cédula" — no se tocaron, para no ampliar el alcance de este cambio más de lo pedido.

### 5.27 Menú más corto (otra vuelta): Devocionales+Versículos, Bitácora+Materiales
Siguiendo la misma idea de 5.25, dos pares más de pantallas que ya vivían una junto a la otra en el menú se fusionaron en pestañas dentro de una sola:
- **`Devocionales.jsx`** ganó una pestaña "📖 Versículos" (solo visible para admin/coordinador) que embebe `CitasBiblicasAdmin.jsx` — mismo componente de siempre, solo le quitamos su propio encabezado (`<h1>`) para que no se vea duplicado dentro de la pestaña. Docente y padre no ven la pestaña (nunca gestionaron versículos), así que para ellos la pantalla se ve exactamente igual que antes. La ruta vieja `/citas-biblicas` redirige a `/devocionales`.
- **`BitacoraAdmin.jsx`** ganó una pestaña "🧰 Materiales" que embebe `Materiales.jsx` con el mismo tratamiento (sin su propio `<h1>`). Como `BitacoraAdmin.jsx` es la variante que solo ve admin/coordinador (`RoleSwitchBitacora`), el docente (`BitacoraDocente`) no se toca y sigue sin acceso a Materiales, igual que antes. La ruta vieja `/materiales` redirige a `/bitacora`.
- **Dos rondas después**, las dos primeras candidatas sugeridas también se implementaron:
  - **`Ajustes.jsx`** ganó una pestaña "🌟 Estrellas" que embebe `ConfigEstrellas.jsx` (sin su propio `<h1>`), mismo patrón que "Roles y permisos". La ruta vieja `/estrellas` redirige a `/ajustes`.
  - **`Ninos.jsx`** ganó una pestaña "🎒 Clases" (solo admin/coordinador — el docente nunca gestionó clases, así que para él la pantalla no cambia) que embebe `Clases.jsx` (sin su propio `<h1>`). La ruta vieja `/clases` redirige a `/ninos`.
- El nav de admin/coordinador bajó de 15 a 13 y después a **11 links**.
- **Agenda + Planeación** se dejó **sin fusionar** a propósito: cubren cosas distintas (eventos generales vs. planear día a día por clase) y se consideró que fusionarlas sería más confuso que útil. Sigue siendo una candidata si en el uso diario se sienten redundantes.

### 5.28 Selector de archivos que se agregan de a uno o varios a la vez
`MultiFilePicker.jsx` reemplaza los `<input type="file" multiple>` sueltos en los formularios que suben **varios** archivos (actividades — admin y docente — y los materiales adjuntos de un devocional). El problema que resolvía: un `<input type="file multiple">` normal **reemplaza** toda la selección cada vez que se vuelve a abrir el diálogo, así que si alguien elegía una foto, la subía, y luego quería agregar otra por separado, perdía la primera sin darse cuenta. `MultiFilePicker` en cambio **acumula** — cada vez que se elige uno o varios archivos, se suman a los que ya estaban en la lista — y cada archivo elegido se puede quitar individualmente (✕) antes de guardar, con una miniatura si es foto o un ícono con el nombre si no. No toca la base de datos: es puramente la ergonomía de elegir los archivos antes de subirlos, sobre las mismas tablas de siempre (`actividad_archivos`, `devocional_archivos`).

### 5.29 Bitácora, Materiales y evidencia de tarea también permiten varias fotos/archivos
Los tres campos que hasta 5.28 seguían limitados a **una sola** foto/archivo ya permiten varias: foto del salón y del refrigerio en Bitácora, foto de un Material, y la evidencia que sube un padre en una tarea. Cada uno tiene su propia tabla hija nueva — `bitacora_fotos`, `material_fotos`, `tarea_entrega_archivos` — con `storage_path`, `nombre_archivo` y el tipo de archivo, y RLS que copia exactamente el permiso de su tabla padre (mismo admin/coordinador/docente-del-nivel para bitácora, mismo admin/coordinador para materiales, y el trío admin/coordinador + docente-del-nivel + padre-del-niño para evidencias de tarea). Las columnas viejas de una sola foto (`bitacora_clase.salon_foto_url`/`refrigerio_foto_url`, `materiales.foto_url`, `tarea_entregas.archivo_url`) **no se tocan ni se migran** — se quedan como estaban, y la pantalla muestra la foto vieja (si existe) junto con las nuevas.

- `FotosGaleria.jsx` (nuevo): cuadrícula de miniaturas de solo-lectura que entiende las dos formas de foto — `{storage_path}` (tablas nuevas, resuelve la URL pública desde Storage) y `{url}` (columna vieja, se usa tal cual) — así una bitácora o un material con foto vieja y fotos nuevas se ven juntas sin migrar nada. Se usa en `BitacoraAdmin.jsx`, `docente/Bitacora.jsx` y `Materiales.jsx`.
- `MultiFilePicker` (ver 5.28) ahora también se usa para elegir las fotos de salón/refrigerio (con `accept="image/*"`) y la foto de un material, y para que un padre elija los archivos de la tarea de su hijo/a.
- La evidencia de tarea, al poder ser cualquier tipo de archivo (no solo foto), se muestra con `ArticulosAdjuntos.jsx` (la misma lista con ícono + nombre + botón descargar que ya se usaba en las páginas extendidas de actividad/devocional, ver 5.24) tanto en `TareaHijoWidget.jsx` (vista del padre) como en `TareaEntregas.jsx` (checklist del docente/admin).
- Detalle interno: `bitacora_fotos` ya tenía una columna `tipo` categórica (`'salon'`/`'refrigerio'`) desde 5.10, así que su columna de tipo-MIME se llama `mime` para no chocar con esa; `material_fotos` y `tarea_entrega_archivos` no tienen esa columna categórica, así que ahí el tipo-MIME sí se llama `tipo`, igual que en `actividad_archivos`/`devocional_archivos`.

### 5.30 Barra de búsqueda en Nuestra comunidad, Devocionales (+ Versículos) y Actividades
`src/lib/busqueda.js` exporta `coincide(query, ...campos)`: compara el texto buscado contra varios campos a la vez, ignorando mayúsculas, acentos y etiquetas HTML (para poder buscar dentro de un `descripcion`/`contenido` que viene del editor de texto enriquecido, ver 5.22). Es 100% en el navegador (filtra el arreglo que ya se cargó, no hace una consulta nueva a Supabase) — no toca la base de datos.

Se agregó un `<input>` de búsqueda, con el mismo estilo que ya usaban Niños y Equipo, en:
- **Nuestra comunidad** (`Foro.jsx`): un buscador que filtra según la pestaña activa — temas del foro (por título, quién lo creó, el evento ligado) o peticiones de oración (por texto, quién la escribió); se limpia solo al cambiar de pestaña.
- **Devocionales** (`Devocionales.jsx`): filtra por título, versículo y el contenido de la reflexión, dentro del mes elegido o de "Ver todos". La pestaña **Versículos** (`CitasBiblicasAdmin.jsx`, embebida ahí, ver 5.27) tiene su propio buscador por texto y referencia.
- **Actividades**, en las tres vistas por rol — `ActividadesAdmin.jsx`, `docente/Actividades.jsx` (busca en ambas secciones, "Mi clase" y "Para el equipo") y `padre/PadreActividades.jsx` — filtra por título, descripción, versículo clave, historia bíblica y (para el padre) el nombre de la clase.

Cuando el filtro no encuentra nada se muestra un mensaje aparte ("No hay... que coincidan con...") distinto del de "todavía no hay nada" (lista vacía de verdad), para que quede claro que es la búsqueda y no que falta contenido.

### 5.31 Orden manual de las clases (niveles), y docentes ordenados alfabéticamente
`niveles.orden` (int, empieza en 0): antes, Clases (`Clases.jsx`) y Planeación (`Planeacion.jsx`) mostraban las clases ordenadas por edad mínima (`edad_min`) — fijo, sin poder cambiarlo. Ahora el admin/coordinador las reordena a mano con las flechas **▲▼** que aparecen junto al nombre en la tabla de Clases; `mover(nivel, direccion)` intercambia el `orden` entre la fila y su vecina (arriba o abajo) y guarda los dos cambios. Planeación usa el mismo `orden` para mostrar las clases en ese orden. Una clase nueva se crea con `orden` = el máximo actual + 1 (mismo patrón que ya usaban los `horarios`, ver 5.18), así que aparece al final por defecto.

De paso, se revisaron todas las pantallas que listan niños o el equipo (docentes/padres/admin) para confirmar que estén ordenadas alfabéticamente por nombre — ya lo estaban casi todas; la única que faltaba era la lista de docentes dentro del modal de "Nueva/editar clase" (`Clases.jsx`), que ahora también usa `.order('nombre_completo')`.

## 6. Modelo de datos (Supabase / Postgres)

Todo el esquema vive en [`supabase/schema.sql`](./supabase/schema.sql), pensado para copiar/pegar una sola vez en el SQL Editor de un proyecto Supabase nuevo.

### 6.1 Tablas principales

| Tabla | Propósito | Relaciones clave |
|---|---|---|
| `profiles` | Un registro por usuario autenticado (espejo de `auth.users`), con `role`, `nombre_completo`, `cedula`, `telefono` (reutilizado como WhatsApp de contacto, ver 5.9), `activo` | `id` = `auth.users.id` |
| `niveles` | Clases/niveles (por edad), con nombre, rango de edad, color, `orden` (manual, ver 5.31) | — |
| `docentes_niveles` | Tabla puente: qué docente da clase en qué nivel (M:N) | `profiles` ↔ `niveles` |
| `ninos` | Niños inscritos, con `activo` (¿inscrito?) y `pausado` (temporalmente inactivo, ver 5.12) | `nivel_id` → `niveles` |
| `ninos_padres` | Vínculo niño ↔ padre/madre (M:N, con `parentesco`) | `ninos` ↔ `profiles` |
| `asistencia` | Un registro por niño/fecha (único por `nino_id`+`fecha`) | `ninos`, `niveles`, `tomada_por` → `profiles` |
| `actividades` | Actividad de clase (o comunicado del equipo): título, `descripcion` (HTML del editor enriquecido, ver 5.22), versículo clave, historia bíblica, `visible_padres`, `es_tarea` + `enlace_externo` (ver 5.11), `audiencia` (`ninos`/`docentes`, ver 5.23 — `docentes` implica `nivel_id null`) | `niveles`, `docente_id` → `profiles` |
| `actividad_archivos` | Archivos adjuntos de una actividad (fotos/videos en Storage) | `actividades` |
| `actividad_reacciones` | Reacciones (emoji) de un padre a una actividad, única por padre+actividad | `actividades`, `profiles` |
| `tarea_entregas` | Una fila por niño **o** por docente (exactamente uno de los dos, ver 5.23) para cada actividad-tarea: `estado` (pendiente/pausada/entregada), `archivo_url` (legacy, un solo archivo), `comentario_padre` (HTML), `nota_docente` (única por `actividad_id`+`nino_id` y por `actividad_id`+`docente_id`) | `actividades`, `ninos`, `docente_id`/`entregado_por` → `profiles` |
| `tarea_entrega_archivos` | Varios archivos de evidencia por entrega de tarea (ver 5.29) | `tarea_entregas` |
| `agenda` | Eventos calendario, opcionalmente ligados a un nivel | `niveles`, `creado_por` → `profiles` |
| `progreso_notas` | Notas de progreso de un niño (comportamiento, emoción, logros) | `ninos`, `niveles`, `docente_id` |
| `devocionales_ninos` | Devocionales para niños (título, versículo, contenido, `imagen_url` opcional, `activo` — ver 5.16) | `niveles`, `creado_por` |
| `devocional_archivos` | Materiales descargables de un devocional, aparte de la imagen principal (ver 5.24) | `devocionales_ninos` |
| `devocional_reacciones` | Reacciones (emoji) de cualquier usuario autenticado a un devocional, única por devocional+usuario (ver 5.24) | `devocionales_ninos`, `profiles` |
| `citas_biblicas` | Pool de versículos + `fecha_mostrar` para la "cita del día" | — |
| `reconocimientos` | Estrellas otorgadas a un niño (capa de gamificación) | `ninos`, `niveles`, `otorgado_por` |
| `motivos_reconocimiento` | Catálogo editable de motivos rápidos de estrella (ver 5.5) | — |
| `niveles_estrella` | Insignias configurables y su umbral de estrellas (ver 5.5) | — |
| `foros` / `foro_mensajes` | Foro de comunidad, general o ligado a un evento de agenda; `foros.privado` = solo staff (admin/coordinador/docente) y el creador | `foros` ↔ `agenda`, `profiles` |
| `peticiones_oracion` | Peticiones de oración, públicas o privadas (solo staff + autor) | `profiles` |
| `config_iglesia` | Fila única con nombre y logo personalizados de la iglesia | — |
| `bitacora_clase` | Constancia por clase, fecha y `momento` (`antes`/`despues`): `salon_ok` + `salon_foto_url` (legacy), `refrigerio_detalle` + `refrigerio_foto_url` (legacy, solo `despues`), `notas` (única por `nivel_id`+`fecha`+`momento`, ver 5.10) | `niveles`, `docente_id` → `profiles` |
| `bitacora_fotos` | Varias fotos de salón/refrigerio por bitácora (ver 5.29); `tipo` = `salon`/`refrigerio`, `mime` = tipo de archivo | `bitacora_clase` |
| `materiales` | Inventario: `nombre`, `categoria` (general/niños/clase), `cantidad`, `foto_url` (legacy) | `nivel_id` → `niveles` (opcional) |
| `material_fotos` | Varias fotos por material (ver 5.29) | `materiales` |
| `dias_clase` | Qué días de la semana (0-6) son día de clase (ver 5.17) | — |
| `horarios` | Servicios que se repiten cada día de clase (ej. "9:00 am"); siempre trae al menos "Servicio único" (ver 5.18); `dia_semana` opcional para cuando un horario es solo de un día (ver 5.18) | `dias_clase` (opcional) |
| `asignacion_horario` | Docente fijo por clase y horario, para cuando hay más de un servicio el mismo día (ver 5.18) | `niveles`, `horarios`, `docente_id` → `profiles` |
| `cobertura_dia` | Suplente puntual por clase, horario y fecha (única por `nivel_id`+`horario_id`+`fecha`, ver 5.17-5.18) | `niveles`, `horarios`, `docente_id` → `profiles` |
| `permisos_rol` | Interruptores de permisos extra por rol (única por `rol`+`permiso`, ver 5.20) | — |

### 6.2 Seguridad (Row Level Security)
Todas las tablas tienen RLS habilitado. El patrón general:
- **Lectura**: staff (`admin`/`coordinador`, y a menudo `docente`) ve todo; un `padre` solo ve lo relacionado a sus propios hijos (vía `ninos_padres`); contenido "de comunidad" (versículos, devocionales, reacciones, foro) es visible para cualquier usuario autenticado.
- **Escritura/gestión**: reservada a `admin`/`coordinador`, o a un `docente` únicamente sobre los `niveles` que tiene asignados en `docentes_niveles`.
- Cada política se apoya en subconsultas `exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in (...))` para saber el rol del usuario actual.
- **Cuidado con las referencias cruzadas entre dos tablas**: si la política de la tabla A consulta a la tabla B, **y** la política de B consulta de vuelta a A, Postgres tira `infinite recursion detected in policy for relation ...` al armar el plan de la consulta (pasa siempre, sin importar el rol de quien la ejecuta — el ciclo está en el texto de las políticas, no en los datos). Pasó con `ninos` (su política de lectura consulta `ninos_padres`, para que un padre vea a su propio hijo/a) y `ninos_padres` (su política para que un docente vincule un padre consulta `ninos`, para saber si el niño es de su clase) — ver `es_padre_de(nino_id)`, una función `security definer` que rompe el ciclo: la política de `ninos` la llama en vez de consultar `ninos_padres` directamente, y como la función corre con privilegios elevados no vuelve a pasar por el RLS de `ninos_padres`. Si se agrega una tabla nueva cuya política necesite consultar otra tabla que a su vez podría necesitar consultar de vuelta a la primera, hay que usar el mismo patrón (una función `security definer` de un solo lado) en vez de dos subconsultas directas cruzadas.

### 6.3 Storage (buckets)
- `actividades`: archivos adjuntos a actividades (fotos/videos), **reutilizado también** para las fotos de devocionales (`devocionales/...`), bitácora (`bitacora/...`), materiales (`materiales/...`) y evidencias de tareas (`tareas/...`) — no se crearon buckets nuevos para estas features, solo prefijos de ruta distintos dentro del mismo bucket público. Lectura pública; escritura de staff sin restricción de carpeta, y los padres solo pueden escribir dentro de `tareas/...` (política aparte, ver `schema.sql`).
- `logos`: logo personalizado de la iglesia. Lectura pública, escritura solo staff.

### 6.4 Funciones de base de datos
- `admin_create_invited_user(...)`: ver sección 5.4. Es la única forma de crear usuarios nuevos (no hay sign-up público). Desde 5.20, también acepta a un `docente` con permiso `vincular_padres` como llamador (restringido a crear padres de sus propios niños). La contraseña que genera es `usuario@` (el "usuario" es la cédula que se guarda en `profiles.cedula` — la UI ya no lo llama "cédula" para no sonar tan formal, ver 5.26).
- `admin_reset_password(user_id)`: ver 5.20. Regenera la contraseña de una cuenta a `usuario@`, mismas reglas de admin/coordinador que la anterior.
- `revisar_inactividad()`: ver sección 5.13. Pausa niños y padres inactivos; solo admin/coordinador pueden llamarla.
- `tiene_permiso(rol, permiso)`: ver 5.20. Helper de solo-lectura usado dentro de otras políticas RLS.

### 6.5 Datos semilla
`schema.sql` inserta 15 versículos bíblicos iniciales en `citas_biblicas` para que la app tenga contenido desde el día uno.

### 6.6 Actualizaciones incrementales a un proyecto ya desplegado
`schema.sql` solo se corre una vez, al crear el proyecto. Cuando se agregan tablas/columnas nuevas después (como `bitacora_clase`, `materiales` o `devocionales_ninos.imagen_url`), se comparten como un archivo de SQL suelto, idempotente (`create table if not exists`, `add column if not exists`, `drop policy if exists` antes de recrearla) para poder pegarlo en el SQL Editor de cualquier proyecto ya en uso sin romper nada. Ejemplos reales: [`supabase/actualizacion_evidencias_materiales.sql`](./supabase/actualizacion_evidencias_materiales.sql), [`supabase/actualizacion_foros_privados.sql`](./supabase/actualizacion_foros_privados.sql), [`supabase/actualizacion_actividades_visibilidad.sql`](./supabase/actualizacion_actividades_visibilidad.sql), [`supabase/actualizacion_tareas_estrellas.sql`](./supabase/actualizacion_tareas_estrellas.sql) (tareas, estrellas configurables y niños pausados), [`supabase/actualizacion_inactividad.sql`](./supabase/actualizacion_inactividad.sql) (revisar inactividad — requiere haber corrido antes el de tareas/estrellas) y [`supabase/actualizacion_devocional_activo.sql`](./supabase/actualizacion_devocional_activo.sql), [`supabase/actualizacion_dias_clase.sql`](./supabase/actualizacion_dias_clase.sql) (días de clase + cobertura puntual) [`supabase/actualizacion_horarios.sql`](./supabase/actualizacion_horarios.sql) (varios horarios el mismo día — **requiere haber corrido antes** `actualizacion_dias_clase.sql`, porque amplía la tabla `cobertura_dia` que ese archivo crea) [`supabase/actualizacion_permisos.sql`](./supabase/actualizacion_permisos.sql) (permisos_rol, docentes editando niños, pantalla de Usuarios) y [`supabase/actualizacion_docente_elige_clase.sql`](./supabase/actualizacion_docente_elige_clase.sql) (permiso `docente.elegir_clase` — **requiere haber corrido antes** `actualizacion_permisos.sql`), [`supabase/actualizacion_actividades_docentes.sql`](./supabase/actualizacion_actividades_docentes.sql) (`actividades.audiencia` + `tarea_entregas.docente_id`, ver 5.23 — **requiere haber corrido antes** `actualizacion_tareas_estrellas.sql`, porque modifica la tabla `tarea_entregas` que ese archivo crea), [`supabase/actualizacion_bitacora_antes_despues.sql`](./supabase/actualizacion_bitacora_antes_despues.sql) (`bitacora_clase.momento`, ver 5.10 — las filas que ya existían quedan como `despues` por el valor por defecto), [`supabase/actualizacion_devocional_extendido.sql`](./supabase/actualizacion_devocional_extendido.sql) (`devocional_archivos` + `devocional_reacciones`, ver 5.24 — no depende de ninguna otra migración) [`supabase/actualizacion_password_arroba.sql`](./supabase/actualizacion_password_arroba.sql) (contraseña por defecto `usuario@` en vez de `usuario.`, ver 5.26 — no depende de ninguna otra migración, y no cambia ninguna tabla, solo `create or replace function`) [`supabase/actualizacion_fotos_multiples.sql`](./supabase/actualizacion_fotos_multiples.sql) (`bitacora_fotos`, `material_fotos`, `tarea_entrega_archivos`, ver 5.29 — **requiere haber corrido antes** `actualizacion_actividades_docentes.sql`, porque usa la columna `tarea_entregas.docente_id` que ese archivo agrega) [`supabase/actualizacion_fix_recursion_ninos_padres.sql`](./supabase/actualizacion_fix_recursion_ninos_padres.sql) (arregla el `infinite recursion detected in policy` al vincular un padre/madre — ver 6.2 — no depende de ninguna otra migración) [`supabase/actualizacion_orden_niveles.sql`](./supabase/actualizacion_orden_niveles.sql) (`niveles.orden`, ver 5.31 — no depende de ninguna otra migración) y [`supabase/actualizacion_horarios_por_dia.sql`](./supabase/actualizacion_horarios_por_dia.sql) (`horarios.dia_semana`, ver 5.18 — no depende de ninguna otra migración). Los mismos cambios también se agregan a `schema.sql` para que las iglesias *nuevas* los tengan desde el inicio (ver también sección 8).

## 7. Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase (`https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Llave pública `anon` del proyecto (segura de exponer: la protege RLS) |

Se configuran en `.env.local` para desarrollo (ver `.env.example`), y como **secrets de GitHub Actions** o variables de build de Netlify para producción. **Nunca** se usa la llave `service_role` en el frontend.

## 8. Modelo multi-tenant: "una iglesia = un fork"

La plataforma no es multi-tenant a nivel de base de datos compartida (no hay `tenant_id` en las tablas). En su lugar, **cada iglesia obtiene:**
1. Su propio proyecto de Supabase (base de datos + auth + storage totalmente aislados).
2. Su propio fork del repositorio de GitHub.
3. Su propio despliegue en GitHub Pages, apuntando a su Supabase vía los secrets `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.

Esto da aislamiento total de datos entre iglesias sin necesidad de lógica extra de particionamiento, a costa de que actualizar el código en cada fork requiere un "Sync fork" manual, y los cambios de base de datos hay que aplicarlos a mano en cada proyecto Supabase (no hay migraciones automatizadas todavía — `schema.sql` se corre una sola vez al inicio, y los cambios posteriores se comparten como fragmentos SQL sueltos). Guía completa paso a paso: [`NUEVA_IGLESIA.md`](./NUEVA_IGLESIA.md).

## 9. Desarrollo local

```bash
npm install
cp .env.example .env.local   # completar con URL y anon key de un proyecto Supabase
npm run dev                  # servidor de desarrollo Vite
npm run build                # build de producción → dist/
npm run preview              # sirve el build de dist/ localmente
```

## 10. Despliegue

- **GitHub Pages** (principal): cada push a `main` dispara `.github/workflows/deploy.yml`, que hace `npm ci && npm run build` y publica `dist/` vía `actions/deploy-pages`. Requiere los secrets `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` configurados en el repo y "Pages → Source: GitHub Actions".
- **Netlify** (alternativa): `netlify.toml` define `npm run build` con `publish = "dist"` y trae hardcodeadas las credenciales de un proyecto Supabase **experimental** (no productivo) para pruebas rápidas. Es normal (y esperado) que varios despliegues distintos — por ejemplo un sitio en GitHub Pages y otro en Netlify — apunten al **mismo** proyecto Supabase si ambos usan las mismas variables de entorno; en ese caso comparten datos en tiempo real, no son instancias independientes.
- El build es un sitio 100% estático (SPA), no requiere servidor Node en producción — cualquier hosting de estáticos sirve.
- ⚠️ Cualquier cambio directo a la base de datos (borrar datos, correr SQL) afecta **a todos** los sitios desplegados que apunten a ese mismo proyecto Supabase, sin importar en qué plataforma estén hospedados.

## 11. Convenciones de nombres

El código (tablas, columnas, componentes, rutas de UI visibles) está en **español**, reflejando el dominio (iglesia hispanohablante). Identificadores técnicos (nombres de archivos, hooks, props) siguen convención estándar de React/JS. No hay librería de i18n — el español está hardcodeado en toda la UI.

## 12. Extender la plataforma para otro dominio

Si se quiere adaptar esta base para un caso de uso distinto (p. ej. una jerarquía admin → líder → profesor con módulos y diplomados), lo reutilizable es: el stack completo, el patrón de auth por `profiles` + RLS, el sistema de invitación por RPC, y la estructura de Layout/rutas por rol. Lo que **no** se reutiliza tal cual es el esquema de datos (`niveles`/`ninos`/`asistencia` son específicos de escuela dominical) — habría que diseñar tablas nuevas y políticas RLS nuevas para la jerarquía y el nuevo dominio. Ese es un proyecto nuevo construido sobre esta misma base, no un fork directo.
