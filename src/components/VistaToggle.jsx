export default function VistaToggle({ vista, onChange }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('tarjetas')}
        className={`rounded-full px-4 py-2 text-sm font-bold ${vista === 'tarjetas' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
      >
        🔲 Tarjetas
      </button>
      <button
        type="button"
        onClick={() => onChange('lista')}
        className={`rounded-full px-4 py-2 text-sm font-bold ${vista === 'lista' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
      >
        ☰ Lista
      </button>
    </div>
  )
}
