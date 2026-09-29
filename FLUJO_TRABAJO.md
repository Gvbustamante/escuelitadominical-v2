# Flujo de trabajo (ramas)

```
mejora/xxx ──► pruebas ──► kidsmin ──► BostonKids        main (congelada)
```

## Ramas
| Rama | Para qué |
|---|---|
| `pruebas` | Todo se programa y prueba aquí primero (Vercel: pruebas-escuelita.vercel.app). |
| `kidsmin` | Producto KidsMin estable, ya probado. |
| `BostonKids` | Versión que usa la iglesia Boston Kids (en funcionamiento). |
| `main` | **Congelada.** No se sube nada hasta que Gisella lo autorice. |
| `mejora/…` · `arreglo/…` | Cambios grandes, opcional. Salen de `pruebas` y vuelven a `pruebas`. |

## Pasos para cada cambio
1. Programar en `pruebas` (o en `mejora/…` y unir a `pruebas`).
2. Probar en pruebas-escuelita.vercel.app (celular y PC).
3. OK → pasar `pruebas` a `kidsmin`.
4. OK → pasar `kidsmin` a `BostonKids` (+ correr su SQL en la base de Boston Kids).
5. Nada a `main` sin autorización de Gisella.

## Base de datos
- Cada SQL nuevo va en `supabase/actualizacion_*.sql` (y en `schema.sql`).
- Se corre primero en la base de pruebas; en la de Boston Kids solo al pasar a `BostonKids`.
- Anotar en `TAREAS.md` dónde ya se corrió.

## Vercel (un solo proyecto)
- **Production Branch = `BostonKids`** → link principal, lo usa Boston Kids.
- Rama `pruebas` → pruebas-escuelita.vercel.app (Preview). Rama `kidsmin` → su link de Preview.
- Settings → Environment Variables (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`), **separadas por entorno**:
  - **Production** → base de **producción** (otra cuenta de Supabase).
  - **Preview** y **Development** → base de **pruebas** ("Escuelita Dominical - v2").
- Las llaves nunca van en el código (`netlify.toml`, etc.), solo en el panel.

## Bases de datos
- **Escuelita Dominical - v2** → pruebas. Conectada con Claude.
- **Producción** → otra cuenta de Supabase. Claude no tiene acceso: cada SQL nuevo lo corre Gisella/Carlos al pasar a `main`.
- Otras iglesias: cada una con su propio proyecto hasta migrar a multi-tenant.
