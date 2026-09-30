# Flujo de trabajo (ramas)

```
mejora/xxx ──► pruebas ──► kidsmin        (SaaS multi-tenant: Sharat, Henry, iglesias nuevas)

BostonKids                                 (aparte, SIN multi-tenant; versión estable propia)
main                                       (congelada)
```

## Ramas
| Rama | Para qué |
|---|---|
| `pruebas` | Todo se programa y prueba aquí primero (Vercel: pruebas-escuelita.vercel.app). |
| `kidsmin` | Producto KidsMin (SaaS). Recibe `pruebas` cuando está probado. |
| `BostonKids` | Iglesia Boston Kids. **Fuera del multi-tenant.** Recibió todo hasta el 30 sep 2026 (antes del multi-tenant). Desde ahí **no** recibe `kidsmin`; solo arreglos puntuales aplicados a mano. |
| `main` | **Congelada.** No se sube nada hasta que Gisella lo autorice. |

## Pasos para cada cambio
1. Programar en `pruebas` y probar en pruebas-escuelita.vercel.app.
2. OK → pasar `pruebas` a `kidsmin`.
3. Boston Kids: solo si Gisella pide un arreglo concreto; se copia a mano a `BostonKids`, sin nada del multi-tenant, y sin cambios de base de datos salvo que se pidan.

## Base de datos
- Cada SQL nuevo va en `supabase/actualizacion_*.sql` (y en `schema.sql`).
- El SQL del multi-tenant **nunca** se corre en la base de Boston Kids.
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
