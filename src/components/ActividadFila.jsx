import { useNavigate } from 'react-router-dom'
import { urlArchivo, useArchivosFirmados } from '../lib/archivos'
import ActionMenu from './ui/ActionMenu'
import { fechaCorta } from '../lib/fechas'
import Emo from './ui/Emo'

function fileUrl(path, bucket = 'actividades') {
  return urlArchivo(bucket, path)
}

function esFoto(f) {
  return f.tipo?.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|avif)$/i.test(f.nombre_archivo || '')
}

export default function ActividadFila({ a, onEdit, onDelete, onVerEntregas, onDuplicate }) {
  const navigate = useNavigate()
  const archivos = a.actividad_archivos || []
  const fotos = archivos.filter(esFoto)
  const otros = archivos.filter((f) => !esFoto(f))
  const thumb = fotos[0]
  useArchivosFirmados(thumb ? [thumb] : [])

  const fechaObj = a.fecha ? new Date(a.fecha + 'T12:00:00') : null

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
      {/* Mini calendar date */}
      {fechaObj && (
        <div className="hidden h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-sky-50 text-sky-700 sm:flex">
          <span className="text-xs font-bold leading-none">
            {fechaObj.toLocaleDateString('es', { month: 'short' }).toUpperCase()}
          </span>
          <span className="text-base font-extrabold leading-tight">{fechaObj.getDate()}</span>
        </div>
      )}

      {/* Thumbnail */}
      {thumb ? (
        <img
          src={fileUrl(thumb.storage_path, thumb.bucket)}
          alt=""
          className="h-11 w-11 shrink-0 rounded-xl object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink/[0.03] text-xl">🎨</div>
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5" onClick={() => navigate(`/actividades/${a.id}`)}>
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="min-w-0 truncate text-sm font-bold hover:text-sky-600 sm:text-base">{a.titulo}</p>
          {a.visible_padres === false && <span className="badge bg-grape-100 text-grape-700">🙈</span>}
          {a.es_tarea && <span className="badge bg-sky-100 text-sky-700">📝 Tarea</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-ink/65">
          <span className="sm:hidden">{fechaCorta(a.fecha)}</span>
          {fotos.length > 0 && <span>📸 {fotos.length}</span>}
          {otros.length > 0 && <span>📎 {otros.length}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs font-bold text-coral-600">{a.actividad_reacciones?.length || 0} ❤️</span>
        {a.es_tarea && onVerEntregas && (
          <button className="btn-secondary hidden !py-1 !px-2 !text-xs sm:inline-flex" onClick={() => onVerEntregas(a)}>
            <Emo e="📋" /> Entregas
          </button>
        )}
        <ActionMenu
          label={`Acciones de ${a.titulo}`}
          acciones={[
            { label: 'Ver', icon: '👁️', onClick: () => navigate(`/actividades/${a.id}`) },
            { label: 'Ver entregas', icon: '📋', onClick: () => onVerEntregas(a), oculto: !(a.es_tarea && onVerEntregas) },
            { label: 'Editar', icon: '✏️', onClick: () => onEdit(a), oculto: !onEdit },
            { label: 'Duplicar para otra fecha', icon: '📄', onClick: () => onDuplicate(a), oculto: !onDuplicate },
            { label: 'Eliminar', icon: '🗑️', onClick: () => onDelete(a.id), oculto: !onDelete, peligro: true },
          ]}
        />
      </div>
    </div>
  )
}
