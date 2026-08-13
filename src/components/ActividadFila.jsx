import { useNavigate } from 'react-router-dom'

export default function ActividadFila({ a, onEdit, onDelete, onVerEntregas }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-3">
      <div
        className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-2"
        onClick={() => navigate(`/actividades/${a.id}`)}
      >
        <span className="shrink-0 text-xs text-ink/40 sm:w-20 sm:text-sm">{a.fecha}</span>
        <p className="min-w-0 truncate text-sm font-bold hover:text-sky-600 sm:text-base">{a.titulo}</p>
        {a.visible_padres === false && <span className="badge bg-grape-100 text-grape-700">🙈 Solo equipo</span>}
        {a.es_tarea && <span className="badge bg-sky-100 text-sky-700">📝 Tarea</span>}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
        <span className="text-xs font-bold text-coral-500">{a.actividad_reacciones?.length || 0} ❤️</span>
        <div className="flex items-center gap-2">
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
    </div>
  )
}
