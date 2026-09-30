const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function mesActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Selector de mes en español: ‹ Septiembre 2026 › y Hoy. value/onChange en formato 'YYYY-MM'. */
export default function MesSelector({ value, onChange, className = '' }) {
  const [y, m] = (value || mesActual()).split('-').map(Number)
  function mover(delta) {
    const idx = y * 12 + (m - 1) + delta
    onChange(`${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`)
  }
  const esActual = value === mesActual()
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button type="button" onClick={() => mover(-1)} aria-label="Mes anterior" title="Mes anterior" className="rounded-full px-3 py-1.5 text-xl font-bold leading-none text-ink/65 hover:bg-ink/5">‹</button>
      <span className="min-w-[8.5rem] text-center font-bold" aria-live="polite">{MESES[m - 1]} {y}</span>
      <button type="button" onClick={() => mover(1)} aria-label="Mes siguiente" title="Mes siguiente" className="rounded-full px-3 py-1.5 text-xl font-bold leading-none text-ink/65 hover:bg-ink/5">›</button>
      {!esActual && (
        <button type="button" onClick={() => onChange(mesActual())} className="ml-1 rounded-full bg-sunshine-100 px-3 py-1 text-sm font-bold text-sunshine-800 hover:bg-sunshine-200">
          Hoy
        </button>
      )}
    </div>
  )
}
