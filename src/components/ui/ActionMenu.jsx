import { useEffect, useRef, useState } from 'react'

/** Menú ⋯ con acciones con texto. acciones: [{ label, icon, onClick, peligro, oculto }] */
export default function ActionMenu({ acciones, label = 'Más acciones' }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!abierto) return
    const cerrar = (e) => { if (!ref.current?.contains(e.target)) setAbierto(false) }
    const esc = (e) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('pointerdown', cerrar)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', cerrar); document.removeEventListener('keydown', esc) }
  }, [abierto])
  const visibles = acciones.filter((a) => a && !a.oculto)
  if (visibles.length === 0) return null
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={label}
        title={label}
        className="flex h-9 w-9 items-center justify-center rounded-full text-xl font-bold leading-none text-ink/70 hover:bg-ink/5"
      >
        ⋯
      </button>
      {abierto && (
        <div role="menu" className="absolute right-0 top-10 z-40 min-w-[12rem] overflow-hidden rounded-2xl bg-white py-1 shadow-xl ring-1 ring-ink/10">
          {visibles.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              onClick={() => { setAbierto(false); a.onClick() }}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold hover:bg-sky-50 ${a.peligro ? 'text-coral-600' : 'text-ink/85'}`}
            >
              {a.icon && <span aria-hidden="true">{a.icon}</span>}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
