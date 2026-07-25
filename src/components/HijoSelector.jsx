export default function HijoSelector({ hijos, selectedId, onChange }) {
  if (!hijos || hijos.length < 2) return null

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(null)}
        className={`rounded-full px-4 py-2 text-sm font-bold ${!selectedId ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
      >
        Todos
      </button>
      {hijos.map((h) => (
        <button
          key={h.id}
          onClick={() => onChange(h.id)}
          className={`rounded-full px-4 py-2 text-sm font-bold ${selectedId === h.id ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          {h.nombre_completo.split(' ')[0]}
        </button>
      ))}
    </div>
  )
}
