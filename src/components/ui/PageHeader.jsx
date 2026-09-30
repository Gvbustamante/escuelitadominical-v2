import { Link } from 'react-router-dom'
import { Icono } from '../IconoRuta'

/**
 * Encabezado único para todas las pantallas:
 * [ícono de color + título / subtítulo]            [acción principal]
 * En celular la acción principal pasa a botón flotante (sobre la barra inferior).
 * accion: { label, onClick } o { label, to }. extra: botones secundarios (solo en tablet/PC arriba).
 */
export default function PageHeader({ ruta, titulo, subtitulo, accion, extra, children }) {
  const Btn = ({ className }) =>
    accion.to ? (
      <Link to={accion.to} className={className}>{accion.label}</Link>
    ) : (
      <button type="button" onClick={accion.onClick} className={className}>{accion.label}</button>
    )
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {ruta && <span className="hidden sm:block"><Icono item={{ to: ruta }} size={22} /></span>}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{titulo}</h1>
            {subtitulo && <p className="text-sm text-ink/70 sm:text-base">{subtitulo}</p>}
          </div>
        </div>
        {(accion || extra) && (
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            {extra}
            {accion && <Btn className="btn-primary" />}
          </div>
        )}
      </div>
      {extra && <div className="flex flex-wrap items-center gap-2 md:hidden">{extra}</div>}
      {children}
      {accion && (
        <div className="fixed bottom-24 right-4 z-30 md:hidden" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
          <Btn className="btn-primary !rounded-full !px-5 !py-3 shadow-xl" />
        </div>
      )}
    </div>
  )
}
