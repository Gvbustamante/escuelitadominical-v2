import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Menú ⋯ con acciones con texto. acciones: [{ label, icon, onClick, peligro, oculto }]
 * El menú flota (position: fixed) para no cortarse dentro de tarjetas con overflow-hidden.
 */
export default function ActionMenu({ acciones, label = 'Más acciones' }) {
  const [abierto, setAbierto] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!abierto) return
    const cerrar = (e) => {
      if (!btnRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setAbierto(false)
    }
    const esc = (e) => { if (e.key === 'Escape') { setAbierto(false); btnRef.current?.focus() } }
    const fuera = () => setAbierto(false)
    document.addEventListener('pointerdown', cerrar)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', fuera, true)
    window.addEventListener('resize', fuera)
    return () => {
      document.removeEventListener('pointerdown', cerrar)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', fuera, true)
      window.removeEventListener('resize', fuera)
    }
  }, [abierto])

  // Ubicar debajo del botón (o encima si no cabe), alineado a la derecha.
  useLayoutEffect(() => {
    if (!abierto || !btnRef.current || !menuRef.current) return
    const b = btnRef.current.getBoundingClientRect()
    const m = menuRef.current.getBoundingClientRect()
    const abajo = b.bottom + 4 + m.height <= window.innerHeight - 8
    setPos({
      top: abajo ? b.bottom + 4 : Math.max(8, b.top - 4 - m.height),
      left: Math.min(Math.max(8, b.right - m.width), window.innerWidth - m.width - 8),
    })
    menuRef.current.querySelector('[role=menuitem]')?.focus()
  }, [abierto])

  const visibles = acciones.filter((a) => a && !a.oculto)
  if (visibles.length === 0) return null
  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => { setPos(null); setAbierto((a) => !a) }}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={label}
        title={label}
        className="flex h-9 w-9 items-center justify-center rounded-full text-xl font-bold leading-none text-ink/70 hover:bg-ink/5"
      >
        ⋯
      </button>
      {abierto && (
        <div
          ref={menuRef}
          role="menu"
          style={{ position: 'fixed', top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' }}
          className="z-50 min-w-[12rem] overflow-hidden rounded-2xl bg-white py-1 shadow-xl ring-1 ring-ink/10"
        >
          {visibles.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              onClick={() => { setAbierto(false); a.onClick() }}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold hover:bg-sky-50 focus:bg-sky-50 focus:outline-none ${a.peligro ? 'text-coral-600' : 'text-ink/85'}`}
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
