import { DOT_CLASSES } from '../../lib/colors'

/**
 * Niveles como chips (1 toque) en lugar de un desplegable.
 * niveles: [{ id, nombre, color }] · extra: opciones antes de los niveles, ej. [{ id: '__todos__', nombre: '🏫 Toda la escuelita' }]
 * conteo: { [nivelId]: texto } opcional (ej. "8/12"). Celular: fila con scroll horizontal; PC: se acomodan en varias filas.
 */
export default function NivelChips({ niveles, value, onChange, extra = [], conteo = {}, label = 'Nivel' }) {
  const opciones = [...extra, ...(niveles || [])]
  if (opciones.length === 0) return null
  if (opciones.length === 1) {
    const n = opciones[0]
    return (
      <p className="flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold ring-1 ring-ink/10">
        {n.color && <span className={`h-2.5 w-2.5 rounded-full ${DOT_CLASSES[n.color] || DOT_CLASSES.sky}`} aria-hidden="true" />}
        {n.nombre}
      </p>
    )
  }
  return (
    <div role="group" aria-label={label} className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {opciones.map((n) => {
        const activo = value === n.id
        return (
          <button
            key={n.id}
            type="button"
            aria-pressed={activo}
            onClick={() => onChange(n.id)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-colors my-0.5 ${
              activo ? 'bg-sky-50 text-sky-800 ring-2 ring-sky-600' : 'bg-white text-ink/80 ring-1 ring-ink/10 hover:bg-sky-50'
            }`}
          >
            {n.color && <span className={`h-2.5 w-2.5 rounded-full ${DOT_CLASSES[n.color] || DOT_CLASSES.sky}`} aria-hidden="true" />}
            {n.nombre}
            {conteo[n.id] != null && <span className={`tabular-nums text-ink/60`}>{conteo[n.id]}</span>}
          </button>
        )
      })}
    </div>
  )
}
