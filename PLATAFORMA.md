# Access Kids — Documentación maestra de la plataforma 📖

Este documento describe **todo** lo que compone la plataforma: qué es, cómo está construida, cómo se relacionan sus piezas, el modelo de datos completo y cómo se despliega. Es el punto de referencia único para entender el proyecto sin tener que leer todo el código.

> Para dar de alta una iglesia nueva paso a paso, ver [`NUEVA_IGLESIA.md`](./NUEVA_IGLESIA.md). Para la guía rápida de desarrollo, ver [`README.md`](./README.md).

---

## 1. Qué es

**Access Kids** es un sistema de gestión para escuelas dominicales cristianas (ministerio infantil de una iglesia). Cubre el ciclo completo de un domingo y de la semana:

- Registro de niños y organización por clases/niveles.
- Control de asistencia.
- Actividades con archivos multimedia, versículo clave e historia bíblica.
- Agenda de eventos.
- Devocionales para niños.
- Progreso individual del niño (comportamiento, emoción, logros) con notas del docente.
- Gamificación (estrellas y medallas) para motivar a los niños.
- Un portal para padres, donde ven todo lo relacionado a sus hijos.
- Comunidad: foro, versículo del día, peticiones de oración.
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
│   │   ├── useCountUp.js        # hook de animación numérica
│   │   ├── useMisClases.js      # hook: clases asignadas al docente logueado
│   │   └── useMisHijos.js       # hook: hijos vinculados al padre logueado
│   ├── components/              # piezas reutilizables (Layout, Modal, StatCard, RewardsPanel, etc.)
│   └── pages/
│       ├── Landing.jsx, Login.jsx, CompleteProfile.jsx, Tutorial.jsx
│       ├── Devocionales.jsx, Foro.jsx, MiFamilia.jsx   # comunes a varios roles
│       ├── admin/                # pantallas exclusivas admin/coordinador
│       ├── docente/               # pantallas exclusivas docente
│       └── padre/                 # pantallas exclusivas padre
├── supabase/
│   ├── schema.sql                # esquema completo: tablas, RLS, funciones, storage, seed de versículos
│   └── primer_admin.sql          # script para crear la primera cuenta admin de una iglesia nueva
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
`src/lib/gamification.js` define localmente 6 niveles de medalla (`🐣` a `👑`) según cantidad de "estrellas" (tabla `reconocimientos`, otorgadas por docente/admin a un niño), con mensajes motivacionales aleatorios. Es solo lógica de presentación — no hay tablas de "nivel" en la base de datos, se calcula todo a partir del conteo de `reconocimientos`.

## 6. Modelo de datos (Supabase / Postgres)

Todo el esquema vive en [`supabase/schema.sql`](./supabase/schema.sql), pensado para copiar/pegar una sola vez en el SQL Editor de un proyecto Supabase nuevo.

### 6.1 Tablas principales

| Tabla | Propósito | Relaciones clave |
|---|---|---|
| `profiles` | Un registro por usuario autenticado (espejo de `auth.users`), con `role`, `nombre_completo`, `cedula`, `telefono`, `activo` | `id` = `auth.users.id` |
| `niveles` | Clases/niveles (por edad), con nombre, rango de edad, color | — |
| `docentes_niveles` | Tabla puente: qué docente da clase en qué nivel (M:N) | `profiles` ↔ `niveles` |
| `ninos` | Niños inscritos | `nivel_id` → `niveles` |
| `ninos_padres` | Vínculo niño ↔ padre/madre (M:N, con `parentesco`) | `ninos` ↔ `profiles` |
| `asistencia` | Un registro por niño/fecha (único por `nino_id`+`fecha`) | `ninos`, `niveles`, `tomada_por` → `profiles` |
| `actividades` | Actividad de clase: título, descripción, versículo clave, historia bíblica | `niveles`, `docente_id` → `profiles` |
| `actividad_archivos` | Archivos adjuntos de una actividad (fotos/videos en Storage) | `actividades` |
| `actividad_reacciones` | Reacciones (emoji) de un padre a una actividad, única por padre+actividad | `actividades`, `profiles` |
| `agenda` | Eventos calendario, opcionalmente ligados a un nivel | `niveles`, `creado_por` → `profiles` |
| `progreso_notas` | Notas de progreso de un niño (comportamiento, emoción, logros) | `ninos`, `niveles`, `docente_id` |
| `devocionales_ninos` | Devocionales para niños (título, versículo, contenido) | `niveles`, `creado_por` |
| `citas_biblicas` | Pool de versículos + `fecha_mostrar` para la "cita del día" | — |
| `reconocimientos` | Estrellas otorgadas a un niño (capa de gamificación) | `ninos`, `niveles`, `otorgado_por` |
| `foros` / `foro_mensajes` | Foro de comunidad, general o ligado a un evento de agenda | `foros` ↔ `agenda`, `profiles` |
| `peticiones_oracion` | Peticiones de oración, públicas o privadas (solo staff + autor) | `profiles` |
| `config_iglesia` | Fila única con nombre y logo personalizados de la iglesia | — |

### 6.2 Seguridad (Row Level Security)
Todas las tablas tienen RLS habilitado. El patrón general:
- **Lectura**: staff (`admin`/`coordinador`, y a menudo `docente`) ve todo; un `padre` solo ve lo relacionado a sus propios hijos (vía `ninos_padres`); contenido "de comunidad" (versículos, devocionales, reacciones, foro) es visible para cualquier usuario autenticado.
- **Escritura/gestión**: reservada a `admin`/`coordinador`, o a un `docente` únicamente sobre los `niveles` que tiene asignados en `docentes_niveles`.
- Cada política se apoya en subconsultas `exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in (...))` para saber el rol del usuario actual.

### 6.3 Storage (buckets)
- `actividades`: archivos adjuntos a actividades (fotos/videos). Lectura pública, escritura solo staff (`admin`/`coordinador`/`docente`).
- `logos`: logo personalizado de la iglesia. Lectura pública, escritura solo staff.

### 6.4 Funciones de base de datos
- `admin_create_invited_user(...)`: ver sección 5.4. Es la única forma de crear usuarios nuevos (no hay sign-up público).

### 6.5 Datos semilla
`schema.sql` inserta 15 versículos bíblicos iniciales en `citas_biblicas` para que la app tenga contenido desde el día uno.

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
- **Netlify** (alternativa): `netlify.toml` define `npm run build` con `publish = "dist"` y trae hardcodeadas las credenciales de un proyecto Supabase **experimental** (no productivo) para pruebas rápidas.
- El build es un sitio 100% estático (SPA), no requiere servidor Node en producción — cualquier hosting de estáticos sirve.

## 11. Convenciones de nombres

El código (tablas, columnas, componentes, rutas de UI visibles) está en **español**, reflejando el dominio (iglesia hispanohablante). Identificadores técnicos (nombres de archivos, hooks, props) siguen convención estándar de React/JS. No hay librería de i18n — el español está hardcodeado en toda la UI.

## 12. Extender la plataforma para otro dominio

Si se quiere adaptar esta base para un caso de uso distinto (p. ej. una jerarquía admin → líder → profesor con módulos y diplomados), lo reutilizable es: el stack completo, el patrón de auth por `profiles` + RLS, el sistema de invitación por RPC, y la estructura de Layout/rutas por rol. Lo que **no** se reutiliza tal cual es el esquema de datos (`niveles`/`ninos`/`asistencia` son específicos de escuela dominical) — habría que diseñar tablas nuevas y políticas RLS nuevas para la jerarquía y el nuevo dominio. Ese es un proyecto nuevo construido sobre esta misma base, no un fork directo.
