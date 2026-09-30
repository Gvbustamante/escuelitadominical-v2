import { useRef } from 'react'

function formatear(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function sumarDias(iso, n) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Fecha mostrada en español ("domingo, 27 de septiembre de 2026"); al tocarla abre el calendario
 * del teléfono/PC. Con `flechas` agrega ‹ › para moverse de a `paso` días (ej. 7 = semana).
 */
export default function FechaCampo({ value, onChange, required, flechas = false, paso = 1, className = '', placeholder = 'Elegir fecha', ariaLabel = 'Fecha' }) {
  const ref = useRef(null)
  function abrir() {
    const el = ref.current
    if (!el) return
    if (typeof el.showPicker === 'function') {
      try { el.showPicker(); return } catch { /* algunos navegadores no lo permiten */ }
    }
    el.focus()
    el.click()
  }
  return (
    <div className={`relative flex items-center gap-1 ${className}`}>
      {flechas && value && (
        <button type="button" onClick={() => onChange(sumarDias(value, -paso))} aria-label="Anterior" title="Anterior" className="rounded-full px-3 py-1.5 text-xl font-bold leading-none text-ink/65 hover:bg-ink/5">‹</button>
      )}
      <button type="button" onClick={abrir} aria-label={`${ariaLabel}: ${formatear(value) || 'sin elegir'}. Cambiar`} className="input flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
        <span className={`truncate capitalize ${value ? '' : 'text-ink/50'}`}>{formatear(value) || placeholder}</span>
        <span aria-hidden="true">📅</span>
      </button>
      {flechas && value && (
        <button type="button" onClick={() => onChange(sumarDias(value, paso))} aria-label="Siguiente" title="Siguiente" className="rounded-full px-3 py-1.5 text-xl font-bold leading-none text-ink/65 hover:bg-ink/5">›</button>
      )}
      <input
        ref={ref}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        required={required}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"
      />
    </div>
  )
}
