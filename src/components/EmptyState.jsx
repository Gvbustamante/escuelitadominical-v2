import { Link } from 'react-router-dom'

/**
 * Pantalla vacía que explica qué hacer y da el botón para hacerlo.
 * accion: { label, to } para ir a otra pantalla, o { label, onClick }.
 */
export default function EmptyState({ icon = '📭', titulo, texto, accion, className = '' }) {
  return (
    <div className={`card flex flex-col items-center gap-2 py-8 text-center ${className}`}>
      <span className="text-4xl" aria-hidden="true">{icon}</span>
      <p className="text-lg font-bold">{titulo}</p>
      {texto && <p className="max-w-md text-sm text-ink/70">{texto}</p>}
      {accion &&
        (accion.to ? (
          <Link to={accion.to} className="btn-primary mt-2 !py-2 !text-sm">
            {accion.label}
          </Link>
        ) : (
          <button type="button" onClick={accion.onClick} className="btn-primary mt-2 !py-2 !text-sm">
            {accion.label}
          </button>
        ))}
    </div>
  )
}
