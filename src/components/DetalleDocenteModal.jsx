import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { whatsappLink } from '../lib/whatsapp'
import Modal from './Modal'

const ROLE_LABEL = { admin: 'Administrador', coordinador: 'Coordinador', docente: 'Docente' }
const ROLE_BADGE = {
  admin: 'bg-grape-100 text-grape-700',
  coordinador: 'bg-sunshine-100 text-sunshine-700',
  docente: 'bg-sky-100 text-sky-700',
}

export default function DetalleDocenteModal({ persona, clases = [], open, onClose, onSaved }) {
  const [telefono, setTelefono] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (open && persona) {
      setTelefono(persona.telefono || '')
      setOk(false)
    }
  }, [open, persona])

  if (!persona) return null

  async function guardarTelefono() {
    setBusy(true)
    await supabase.from('profiles').update({ telefono: telefono || null }).eq('id', persona.id)
    setBusy(false)
    setOk(true)
    onSaved?.()
  }

  const link = whatsappLink(persona.telefono)

  return (
    <Modal open={open} onClose={onClose} title={`Detalle — ${persona.nombre_completo}`}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${ROLE_BADGE[persona.role]}`}>{ROLE_LABEL[persona.role]}</span>
          <span className={`badge ${persona.activo ? 'bg-grass-100 text-grass-700' : 'bg-coral-100 text-coral-700'}`}>
            {persona.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        <div>
          <p className="text-xs font-extrabold uppercase text-ink/40">Cédula</p>
          <p className="font-bold">{persona.cedula || '—'}</p>
        </div>

        <div>
          <label className="label">WhatsApp (con código de país, ej. 18091234567)</label>
          <div className="flex gap-2">
            <input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej. 18091234567" />
            <button type="button" onClick={guardarTelefono} disabled={busy} className="btn-secondary shrink-0 !px-4 !text-sm">
              {busy ? '...' : 'Guardar'}
            </button>
          </div>
          {ok && <p className="mt-1 text-xs font-bold text-grass-600">Guardado ✔️</p>}
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className="btn-success mt-3 w-full justify-center !py-2 !text-sm">
              💬 Abrir chat de WhatsApp
            </a>
          )}
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
