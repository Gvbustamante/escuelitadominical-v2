# Flujo de trabajo (ramas)

```
mejora/xxx  ──►  pruebas  ──►  main
(se programa)   (Vercel, se prueba)   (lo que usan las iglesias)
```

## Ramas
| Rama | Para qué | Deploy |
|---|---|---|
| `main` | Producción. Lo que usan las iglesias. Nunca se trabaja directo aquí. | Netlify |
| `pruebas` | Se prueba todo antes de producción. | Vercel |
| `mejora/nombre` · `arreglo/nombre` | Un cambio concreto. Se crea desde `pruebas`. | Vercel (preview automático) |

## Pasos para cada cambio
1. Crear rama desde `pruebas`: `mejora/planeacion-ia`, `arreglo/fecha-ninos`, etc.
2. Programar y subir la rama.
3. Unir la rama a `pruebas` → probar en la URL de Vercel (celular y PC).
4. Si funciona → unir `pruebas` a `main` → llega a las iglesias.
5. Borrar la rama `mejora/...` o `arreglo/...`.

## Base de datos
- Si el cambio necesita SQL: correrlo primero en la base de pruebas, y en la real **solo** al subir a `main`.
- Guardar cada SQL nuevo en `supabase/actualizacion_*.sql` (y en `schema.sql`).
- Anotar en `TAREAS.md` en qué iglesias ya se corrió.

## Vercel (configurar una vez)
1. Vercel → Add New Project → importar `escuelitadominical-v2`.
2. Settings → Git → **Production Branch: `pruebas`** (así Vercel nunca publica `main`).
3. Settings → Environment Variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del proyecto Supabase **"Escuelita Dominical - v2"** (los mismos valores de `netlify.toml`).

## Bases de datos
- **Escuelita Dominical - v2**: base del SaaS. Aquí se construye y se prueba.
- Otras iglesias: cada una con su propio proyecto Supabase hasta migrar a multi-tenant. Sus SQL se corren a mano (ver `TAREAS.md`).
