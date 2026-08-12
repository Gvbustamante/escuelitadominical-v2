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

## 3. Stack tecnológico

| Capa | Tecnología | Versión (package.json) |
|---|---|---|
| Framework UI | React | ^18.3.1 |
| Bundler / dev server | Vite | ^5.4.8 |
| Routing | React Router DOM | ^6.26.2 |
| Estilos | Tailwind CSS | ^3.4.13 |
| Backend / base de datos / auth / storage | Supabase (Postgres + Auth + Storage) | cliente `@supabase/supabase-js` ^2.45.4 |
| CSS post-procesamiento | PostCSS + Autoprefixer | ^8.4.47 / ^10.4.20 |
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
│   │                             #   TomarAsistenciaModal, DetalleNinoModal, DetalleDocenteModal,
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
`CoberturaHoy.jsx`, en el inicio del admin, cruza `niveles` + `docentes_niveles` + `ninos` + `asistencia` de hoy para mostrar, por clase: quién es el docente asignado, cuántos niños tiene y si ya se registró asistencia — resaltando en rojo las clases sin docente y en amarillo las que aún no tienen asistencia del día. Es puramente de lectura sobre tablas existentes, sin tabla propia.

### 5.8 Plan de actividades (calendario mensual)
`ActividadesAdmin.jsx` tiene un `VistaToggle` con una tercera opción "🗓️ Plan del mes" que reutiliza `CalendarioAgenda.jsx` (el mismo calendario de Agenda) para planear/repasar qué se enseña cada domingo, además de la vista de lista de siempre.

### 5.9 WhatsApp de contacto
No hay columna `whatsapp` dedicada: se reutiliza `profiles.telefono` (existía desde el inicio del esquema, sin uso previo en la UI). `src/lib/whatsapp.js` expone `whatsappLink(telefono)`, que limpia el número y arma un link `https://wa.me/...`. Se edita desde `DetalleDocenteModal.jsx` (equipo) y `PadreContacto.jsx` (padres, embebido en `DetalleNinoModal.jsx` y directo en la tarjeta de cada niño en `Ninos.jsx`), con un botón "💬 Abrir chat de WhatsApp" cuando hay un número guardado.

### 5.10 Bitácora de clase y Materiales
- **Bitácora** (`bitacora_clase`, rutas `/bitacora`): el docente deja constancia, por clase y fecha, de si el salón quedó en buen estado (con foto) y qué refrigerio se dio (con foto) — una foto por cada cosa, no una galería. El admin ve el historial por mes y clase en `BitacoraAdmin.jsx`.
- **Materiales** (`materiales`, ruta `/materiales`, solo admin/coordinador): inventario simple con nombre, categoría (general / para niños / para una clase), cantidad, foto y aviso visual cuando la cantidad es baja (≤ 2).

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
- `src/lib/exportCsv.js`: genera un `.csv` (con BOM, para que Excel muestre bien los acentos) en el navegador, sin ninguna librería nueva. Botón "📊 Exportar" en Niños, Materiales, Bitácora y el resumen mensual de Asistencia.
- **Niños, Equipo (Docentes) y Clases** ahora son de **solo lista/tabla** — se quitó el toggle de tarjetas para que la información quede más compacta y fácil de escanear.
- **Materiales** ganó una vista "📃 Lista compacta" además de las tarjetas.
- **Actividades** (docente y admin) ganó una vista "📃 Compacta" (una fila por actividad) además de tarjetas/calendario, usando el componente compartido `ActividadFila.jsx`.

### 5.15 Agenda y tareas en los 3 dashboards
`ProximaAgenda.jsx`: widget que combina los próximos eventos de `agenda` con las tareas recientes (`actividades.es_tarea`), ordenados por fecha. Aparece en `AdminHome`, `DocenteHome` y `PadreHome`, cada uno con su propio alcance:
- **Admin/coordinador**: sin filtrar, ve de todas las clases.
- **Docente**: filtrado a sus propios niveles asignados (+ eventos generales sin nivel).
- **Padre**: filtrado a los niveles de sus hijos, y en vez de listar todas las tareas del nivel, solo muestra las que **sus propios hijos** todavía no han entregado (`soloTareasPendientes`).

## 6. Modelo de datos (Supabase / Postgres)

Todo el esquema vive en [`supabase/schema.sql`](./supabase/schema.sql), pensado para copiar/pegar una sola vez en el SQL Editor de un proyecto Supabase nuevo.

### 6.1 Tablas principales

| Tabla | Propósito | Relaciones clave |
|---|---|---|
| `profiles` | Un registro por usuario autenticado (espejo de `auth.users`), con `role`, `nombre_completo`, `cedula`, `telefono` (reutilizado como WhatsApp de contacto, ver 5.9), `activo` | `id` = `auth.users.id` |
| `niveles` | Clases/niveles (por edad), con nombre, rango de edad, color | — |
| `docentes_niveles` | Tabla puente: qué docente da clase en qué nivel (M:N) | `profiles` ↔ `niveles` |
| `ninos` | Niños inscritos, con `activo` (¿inscrito?) y `pausado` (temporalmente inactivo, ver 5.12) | `nivel_id` → `niveles` |
| `ninos_padres` | Vínculo niño ↔ padre/madre (M:N, con `parentesco`) | `ninos` ↔ `profiles` |
| `asistencia` | Un registro por niño/fecha (único por `nino_id`+`fecha`) | `ninos`, `niveles`, `tomada_por` → `profiles` |
| `actividades` | Actividad de clase: título, descripción, versículo clave, historia bíblica, `visible_padres`, `es_tarea` + `enlace_externo` (ver 5.11) | `niveles`, `docente_id` → `profiles` |
| `actividad_archivos` | Archivos adjuntos de una actividad (fotos/videos en Storage) | `actividades` |
| `actividad_reacciones` | Reacciones (emoji) de un padre a una actividad, única por padre+actividad | `actividades`, `profiles` |
| `tarea_entregas` | Una fila por niño por actividad-tarea: `estado` (pendiente/pausada/entregada), `archivo_url`, `comentario_padre`, `nota_docente` (única por `actividad_id`+`nino_id`) | `actividades`, `ninos`, `entregado_por` → `profiles` |
| `agenda` | Eventos calendario, opcionalmente ligados a un nivel | `niveles`, `creado_por` → `profiles` |
| `progreso_notas` | Notas de progreso de un niño (comportamiento, emoción, logros) | `ninos`, `niveles`, `docente_id` |
| `devocionales_ninos` | Devocionales para niños (título, versículo, contenido, `imagen_url` opcional) | `niveles`, `creado_por` |
| `citas_biblicas` | Pool de versículos + `fecha_mostrar` para la "cita del día" | — |
| `reconocimientos` | Estrellas otorgadas a un niño (capa de gamificación) | `ninos`, `niveles`, `otorgado_por` |
| `motivos_reconocimiento` | Catálogo editable de motivos rápidos de estrella (ver 5.5) | — |
| `niveles_estrella` | Insignias configurables y su umbral de estrellas (ver 5.5) | — |
| `foros` / `foro_mensajes` | Foro de comunidad, general o ligado a un evento de agenda; `foros.privado` = solo staff (admin/coordinador/docente) y el creador | `foros` ↔ `agenda`, `profiles` |
| `peticiones_oracion` | Peticiones de oración, públicas o privadas (solo staff + autor) | `profiles` |
| `config_iglesia` | Fila única con nombre y logo personalizados de la iglesia | — |
| `bitacora_clase` | Constancia por clase y fecha: `salon_ok` + `salon_foto_url`, `refrigerio_detalle` + `refrigerio_foto_url` (única por `nivel_id`+`fecha`) | `niveles`, `docente_id` → `profiles` |
| `materiales` | Inventario: `nombre`, `categoria` (general/niños/clase), `cantidad`, `foto_url` | `nivel_id` → `niveles` (opcional) |

### 6.2 Seguridad (Row Level Security)
Todas las tablas tienen RLS habilitado. El patrón general:
- **Lectura**: staff (`admin`/`coordinador`, y a menudo `docente`) ve todo; un `padre` solo ve lo relacionado a sus propios hijos (vía `ninos_padres`); contenido "de comunidad" (versículos, devocionales, reacciones, foro) es visible para cualquier usuario autenticado.
- **Escritura/gestión**: reservada a `admin`/`coordinador`, o a un `docente` únicamente sobre los `niveles` que tiene asignados en `docentes_niveles`.
- Cada política se apoya en subconsultas `exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in (...))` para saber el rol del usuario actual.

### 6.3 Storage (buckets)
- `actividades`: archivos adjuntos a actividades (fotos/videos), **reutilizado también** para las fotos de devocionales (`devocionales/...`), bitácora (`bitacora/...`), materiales (`materiales/...`) y evidencias de tareas (`tareas/...`) — no se crearon buckets nuevos para estas features, solo prefijos de ruta distintos dentro del mismo bucket público. Lectura pública; escritura de staff sin restricción de carpeta, y los padres solo pueden escribir dentro de `tareas/...` (política aparte, ver `schema.sql`).
- `logos`: logo personalizado de la iglesia. Lectura pública, escritura solo staff.

### 6.4 Funciones de base de datos
- `admin_create_invited_user(...)`: ver sección 5.4. Es la única forma de crear usuarios nuevos (no hay sign-up público).
- `revisar_inactividad()`: ver sección 5.13. Pausa niños y padres inactivos; solo admin/coordinador pueden llamarla.

### 6.5 Datos semilla
`schema.sql` inserta 15 versículos bíblicos iniciales en `citas_biblicas` para que la app tenga contenido desde el día uno.

### 6.6 Actualizaciones incrementales a un proyecto ya desplegado
`schema.sql` solo se corre una vez, al crear el proyecto. Cuando se agregan tablas/columnas nuevas después (como `bitacora_clase`, `materiales` o `devocionales_ninos.imagen_url`), se comparten como un archivo de SQL suelto, idempotente (`create table if not exists`, `add column if not exists`, `drop policy if exists` antes de recrearla) para poder pegarlo en el SQL Editor de cualquier proyecto ya en uso sin romper nada. Ejemplos reales: [`supabase/actualizacion_evidencias_materiales.sql`](./supabase/actualizacion_evidencias_materiales.sql), [`supabase/actualizacion_foros_privados.sql`](./supabase/actualizacion_foros_privados.sql), [`supabase/actualizacion_actividades_visibilidad.sql`](./supabase/actualizacion_actividades_visibilidad.sql), [`supabase/actualizacion_tareas_estrellas.sql`](./supabase/actualizacion_tareas_estrellas.sql) (tareas, estrellas configurables y niños pausados) y [`supabase/actualizacion_inactividad.sql`](./supabase/actualizacion_inactividad.sql) (revisar inactividad — requiere haber corrido antes el de tareas/estrellas). Los mismos cambios también se agregan a `schema.sql` para que las iglesias *nuevas* los tengan desde el inicio (ver también sección 8).

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
