import Modal from './Modal'

const ROLE_LABEL = { admin: 'Administrador', coordinador: 'Coordinador', docente: 'Docente' }
const ROLE_BADGE = {
  admin: 'bg-grape-100 text-grape-700',
  coordinador: 'bg-sunshine-100 text-sunshine-700',
  docente: 'bg-sky-100 text-sky-700',
}

export default function DetalleDocenteModal({ persona, clases = [], open, onClose }) {
  if (!persona) return null

  return (
    <Modal open={open} onClose={onClose} title={`Detalle — ${persona.nombre_completo}`}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${ROLE_BADGE[persona.role]}`}>{ROLE_LABEL[persona.role]}</span>
          <span className={`badge ${persona.activo ? 'bg-grass-100 text-grass-700' : 'bg-coral-100 text-coral-700'}`}>
            {persona.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-extrabold uppercase text-ink/40">Cédula</p>
            <p className="font-bold">{persona.cedula || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase text-ink/40">Teléfono</p>
            <p className="font-bold">{persona.telefono || '—'}</p>
          </div>
        </div>

        {persona.role === 'docente' && (
          <div>
            <p className="mb-2 text-xs font-extrabold uppercase text-ink/40">Clases asignadas</p>
            {clases.length === 0 ? (
              <p className="text-sm text-ink/40">Aún sin clases asignadas.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {clases.map((nombre, i) => (
                  <span key={i} className="badge bg-sky-100 text-sky-700">
                    {nombre}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
