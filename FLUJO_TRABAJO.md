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

## Vercel (un solo proyecto)
- **Production Branch = `main`** → link principal, lo usan las iglesias.
- Rama `pruebas` → link fijo de Preview: `NOMBREPROYECTO-git-pruebas-....vercel.app`.
- Settings → Environment Variables (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`), **separadas por entorno**:
  - **Production** → base de **producción** (otra cuenta de Supabase).
  - **Preview** y **Development** → base de **pruebas** ("Escuelita Dominical - v2").
- Las llaves nunca van en el código (`netlify.toml`, etc.), solo en el panel.

## Bases de datos
- **Escuelita Dominical - v2** → pruebas. Conectada con Claude.
- **Producción** → otra cuenta de Supabase. Claude no tiene acceso: cada SQL nuevo lo corre Gisella/Carlos al pasar a `main`.
- Otras iglesias: cada una con su propio proyecto hasta migrar a multi-tenant.
