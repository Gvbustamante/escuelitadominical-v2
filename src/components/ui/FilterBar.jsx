import { useState } from 'react'

/**
 * Filtros en una sola línea (tablet/PC). En celular: buscador visible + botón "Filtros (n)"
 * que despliega el resto. `activos` = cuántos filtros están aplicados (para el contador).
 */
export default function FilterBar({ buscador, children, activos = 0, derecha }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {buscador && <div className="min-w-0 flex-1 md:max-w-sm">{buscador}</div>}
        {children && (
          <button
            type="button"
            onClick={() => setAbierto((a) => !a)}
            aria-expanded={abierto}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold md:hidden ${activos > 0 ? 'bg-sky-100 text-sky-800' : 'bg-ink/5 text-ink/75'}`}
          >
            Filtros{activos > 0 ? ` (${activos})` : ''} {abierto ? '▲' : '▼'}
          </button>
        )}
        {children && <div className="hidden flex-1 flex-wrap items-center gap-2 md:flex">{children}</div>}
        {derecha && <div className="ml-auto shrink-0">{derecha}</div>}
      </div>
      {children && abierto && <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 ring-1 ring-ink/10 md:hidden">{children}</div>}
    </div>
  )
}
