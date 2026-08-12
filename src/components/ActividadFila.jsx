export default function ActividadFila({ a, onEdit, onDelete, onVerEntregas }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="w-24 shrink-0 text-sm text-ink/40">{a.fecha}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-bold">{a.titulo}</p>
          {a.visible_padres === false && <span className="badge bg-grape-100 text-grape-700">🙈 Solo equipo</span>}
          {a.es_tarea && <span className="badge bg-sky-100 text-sky-700">📝 Tarea</span>}
        </div>
      </div>
      <span className="shrink-0 text-xs font-bold text-coral-500">{a.actividad_reacciones?.length || 0} ❤️</span>
      <div className="flex shrink-0 items-center gap-2">
        {a.es_tarea && onVerEntregas && (
          <button className="btn-secondary !py-1 !px-2 !text-xs" onClick={() => onVerEntregas(a)}>
            📋 Entregas
          </button>
        )}
        {onEdit && (
          <button onClick={() => onEdit(a)} className="text-lg text-ink/30 hover:text-sky-500" title="Editar">
            ✏️
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(a.id)} className="text-lg text-ink/30 hover:text-coral-500" title="Eliminar">
            🗑️
          </button>
        )}
      </div>
    </div>
  )
}
