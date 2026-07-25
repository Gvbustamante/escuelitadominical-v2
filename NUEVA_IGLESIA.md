# Cómo dar de alta una iglesia nueva 🏛️

Guía para configurar Escuelita Dominical para una iglesia nueva, con su propia base de datos separada (nadie ve los datos de nadie más). Toma unos 15-20 minutos. No necesitas saber programar — solo copiar y pegar.

---

## Paso 1: Crear el proyecto de base de datos (Supabase)

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta (o entra si ya tienes).
2. Botón **New Project**.
3. Ponle el nombre de la iglesia, elige una contraseña de base de datos (guárdala en un lugar seguro, no la necesitarás seguido) y la región más cercana.
4. Espera 1-2 minutos a que el proyecto termine de crearse.

## Paso 2: Crear las tablas

1. En el menú izquierdo de Supabase, entra a **SQL Editor**.
2. Botón **New query**.
3. Abre el archivo [`supabase/schema.sql`](./supabase/schema.sql) de este proyecto, copia **todo** su contenido, y pégalo ahí.
4. Botón **Run**. Debe decir "Success" al final.

Esto crea todas las tablas, la seguridad de cada una, y el lugar donde se guardan las fotos de las actividades.

## Paso 3: Crear la cuenta del primer administrador (la iglesia)

1. Sigue en **SQL Editor** → **New query**.
2. Abre [`supabase/primer_admin.sql`](./supabase/primer_admin.sql), cópialo y pégalo.
3. Cambia estas 3 líneas con los datos reales del administrador de esa iglesia:
   ```sql
   v_email text := 'CAMBIAR@correo.com';
   v_password text := 'CAMBIAR-contraseña-temporal';
   v_nombre text := 'CAMBIAR Nombre Completo';
   ```
4. Botón **Run**.
5. Anota el correo y la contraseña que pusiste — con eso esa persona entra por primera vez (después puede cambiarla... por ahora avísale que la use tal cual se la diste).

## Paso 4: Conseguir las 2 llaves de conexión

1. En Supabase, ve a **Settings** (ícono de engranaje) → **API**.
2. Copia el **Project URL** (algo como `https://xxxxx.supabase.co`).
3. Baja a **Project API keys** y copia la llave **`anon` `public`** (la larga que empieza con `eyJ...`).
4. Guarda estos dos valores, los necesitas en el siguiente paso.

⚠️ Nunca copies la llave que dice `service_role` — esa es secreta y no va en el sitio web.

## Paso 5: Crear la copia de la app para esa iglesia

1. Ve al repositorio de GitHub de este proyecto.
2. Botón **Fork** (arriba a la derecha) → esto te crea tu propia copia completa del proyecto, en tu cuenta o la de la iglesia.
3. En tu copia (fork), ve a **Settings → Secrets and variables → Actions** → **New repository secret**, y crea:
   - `VITE_SUPABASE_URL` → pega el Project URL del Paso 4
   - `VITE_SUPABASE_ANON_KEY` → pega la llave `anon public` del Paso 4
4. Ve a **Settings → Pages** → en "Source" elige **GitHub Actions**.
5. Ve a la pestaña **Actions** de tu copia → si no hay ningún workflow corriendo, entra a "Deploy a GitHub Pages" → **Run workflow** para forzar el primer despliegue.
6. En 1-2 minutos tu app queda publicada en `https://tuusuario.github.io/escuelitadominical/`.

## Paso 6: Entregar la cuenta

Dale al administrador de la iglesia:
- El link de su app (`https://.../escuelitadominical/`)
- El correo y contraseña que creaste en el Paso 3

Desde ahí, esa iglesia ya puede crear sus propias clases, invitar a sus docentes, registrar niños, etc. — completamente separada de cualquier otra iglesia.

---

## Cómo actualizar una iglesia que ya tiene su copia

Cuando corriges un bug o agregas algo nuevo en tu proyecto original, cada iglesia con su propio fork necesita **dos cosas** para recibirlo (según el tipo de cambio):

### 1. Cambios de código (diseño, pantallas, correcciones)

En el fork de esa iglesia en GitHub, arriba del repo hay un botón **"Sync fork"** → **Update branch**. Eso trae tus últimos cambios automáticamente y el sitio se vuelve a publicar solo en 1-2 minutos. No hay que tocar nada más.

### 2. Cambios de base de datos (tablas o funciones nuevas)

Estos no se sincronizan solos — hay que aplicarlos a mano en el Supabase de *esa* iglesia:

1. Entra al **SQL Editor** del proyecto Supabase de esa iglesia.
2. Pega el fragmento de SQL nuevo que te compartan (solo la parte que cambió, no hace falta correr `schema.sql` de nuevo completo).
3. **Run**.

Si el cambio no tocó la base de datos (solo diseño o comportamiento), solo necesitas el paso 1.

---

### Resumen rápido (si ya lo hiciste antes)

1. Supabase → New Project
2. SQL Editor → correr `schema.sql`
3. SQL Editor → correr `primer_admin.sql` (con los datos de esa iglesia)
4. Copiar Project URL + anon key
5. Fork del repo → 2 secrets → activar Pages → Run workflow
6. Entregar link + credenciales
