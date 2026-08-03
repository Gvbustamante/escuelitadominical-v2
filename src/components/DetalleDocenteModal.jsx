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
  const [form, setForm] = useState({ nombre_completo: '', cedula: '', telefono: '' })
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && persona) {
      setForm({
        nombre_completo: persona.nombre_completo || '',
        cedula: persona.cedula || '',
        telefono: persona.telefono || '',
      })
      setOk(false)
      setError('')
    }
  }, [open, persona])

  if (!persona) return null

  async function guardar() {
    setBusy(true)
    setOk(false)
    setError('')
    const { error: saveError } = await supabase
      .from('profiles')
      .update({
        nombre_completo: form.nombre_completo,
        cedula: form.cedula || null,
        telefono: form.telefono || null,
      })
      .eq('id', persona.id)
    setBusy(false)
    if (saveError) {
      setError(saveError.code === '23505' ? 'Ya hay otra cuenta con esa cédula.' : saveError.message)
      return
    }
    setOk(true)
    onSaved?.()
  }

  const link = whatsappLink(form.telefono)

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
          <label className="label">Nombre completo</label>
          <input
            className="input"
            value={form.nombre_completo}
            onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Cédula</label>
          <input className="input" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} />
        </div>

        <div>
          <label className="label">WhatsApp (con código de país, ej. 18091234567)</label>
          <input
            className="input"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            placeholder="Ej. 18091234567"
          />
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className="btn-success mt-3 w-full justify-center !py-2 !text-sm">
              💬 Abrir chat de WhatsApp
            </a>
          )}
        </div>

        {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
        {ok && <p className="text-sm font-bold text-grass-600">Guardado ✔️</p>}
        <button type="button" onClick={guardar} disabled={busy} className="btn-primary justify-center">
          {busy ? 'Guardando...' : 'Guardar cambios'}
        </button>

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
