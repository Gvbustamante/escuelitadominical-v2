import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { whatsappLink } from '../lib/whatsapp'
import Modal from './Modal'

const ROLE_LABEL = { superadmin: 'Administrador', admin: 'Administrador', coordinador: 'Coordinador', docente: 'Docente', padre: 'Padre / Madre' }
const ROLE_BADGE = {
  superadmin: 'bg-grape-100 text-grape-700',
  admin: 'bg-grape-100 text-grape-700',
  coordinador: 'bg-sunshine-100 text-sunshine-800',
  docente: 'bg-sky-100 text-sky-700',
  padre: 'bg-coral-100 text-coral-700',
}
const ROLES_TODOS = ['admin', 'coordinador', 'docente', 'padre']

export default function DetalleUsuarioModal({ persona, clases = [], hijos = [], open, onClose, onSaved, miRole, miId }) {
  const [form, setForm] = useState({ nombre_completo: '', telefono: '', email: '', whatsapp: '', role: '' })
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [archivoHV, setArchivoHV] = useState(null)
  const [hojaVida, setHojaVida] = useState(null)

  useEffect(() => {
    if (open && persona) {
      setForm({
        nombre_completo: persona.nombre_completo || '',
        telefono: persona.telefono || '',
        email: persona.email || '',
        whatsapp: persona.whatsapp || '',
        role: persona.role,
      })
      setOk(false)
      setError('')
      setNuevaPassword('')
      setArchivoHV(null)
      setHojaVida(persona.hoja_vida_url || null)
    }
  }, [open, persona])

  if (!persona) return null

  const esUnoMismo = persona.id === miId
  const puedeCambiarRole = ['superadmin', 'admin'].includes(miRole) && !esUnoMismo
  const esStaff = ['superadmin', 'admin', 'coordinador', 'docente'].includes(persona.role)
  const puedeHojaVida = esStaff && ['superadmin', 'admin'].includes(miRole)
  const puedeResetear = !esUnoMismo && (['superadmin', 'admin'].includes(miRole) || (miRole === 'coordinador' && ['docente', 'padre'].includes(persona.role)))

  async function guardar() {
    setBusy(true)
    setOk(false)
    setError('')
    const payload = {
      nombre_completo: form.nombre_completo,
      telefono: form.telefono || null,
      email: form.email || null,
      whatsapp: form.whatsapp || null,
    }
    if (puedeCambiarRole) payload.role = form.role
    if (puedeHojaVida && archivoHV) {
      const ext = archivoHV.name.split('.').pop()
      const nombre = form.nombre_completo.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
      const path = `${nombre}_HV_${Date.now()}.${ext}`
      const { error: upError } = await supabase.storage.from('hojas_vida').upload(path, archivoHV, { upsert: true })
      if (upError) {
        setBusy(false)
        setError(upError.message)
        return
      }
      payload.hoja_vida_url = supabase.storage.from('hojas_vida').getPublicUrl(path).data.publicUrl
    }
    const { error: saveError } = await supabase.from('profiles').update(payload).eq('id', persona.id)
    setBusy(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setOk(true)
    if (payload.hoja_vida_url) {
      setHojaVida(payload.hoja_vida_url)
      setArchivoHV(null)
    }
    onSaved?.()
  }

  async function quitarHojaVida() {
    setBusy(true)
    const { error: e } = await supabase.from('profiles').update({ hoja_vida_url: null }).eq('id', persona.id)
    setBusy(false)
    if (e) return setError(e.message)
    setHojaVida(null)
    onSaved?.()
  }

  async function resetearPassword() {
    setResetBusy(true)
    setError('')
    setNuevaPassword('')
    const { data, error: rpcError } = await supabase.rpc('admin_reset_password', { p_user_id: persona.id })
    setResetBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setNuevaPassword(data)
  }

  const link = whatsappLink(form.whatsapp || form.telefono)

  return (
    <Modal open={open} onClose={onClose} title={`Detalle — ${persona.nombre_completo}`}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${ROLE_BADGE[persona.role]}`}>{ROLE_LABEL[persona.role]}</span>
          <span className={`badge ${persona.activo ? 'bg-grass-100 text-grass-700' : 'bg-coral-100 text-coral-700'}`}>
            {persona.activo ? 'Activo' : 'Inactivo'}
          </span>
          {persona.pausado && <span className="badge bg-ink/10 text-ink/70">⏸️ Sin entrar hace tiempo</span>}
        </div>

        <div>
          <label className="label">Nombre completo</label>
          <input
            className="input"
            value={form.nombre_completo}
            onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
          />
        </div>

        {persona.cedula && (
          <div>
            <label className="label">Usuario</label>
            <p className="rounded-xl bg-ink/5 px-3 py-2.5 text-sm font-bold text-ink/70">{persona.cedula}</p>
          </div>
        )}

        <div>
          <label className="label">Correo electrónico</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div>
          <label className="label">WhatsApp (con código de país)</label>
          <input
            className="input"
            value={form.whatsapp || form.telefono}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            placeholder="Ej. 18091234567"
          />
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className="btn-success mt-3 w-full justify-center !py-2 !text-sm">
              💬 Abrir chat de WhatsApp
            </a>
          )}
        </div>

        {puedeCambiarRole && (
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES_TODOS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink/65">Cambiar el rol cambia qué puede ver y hacer esta cuenta de inmediato.</p>
          </div>
        )}

        {esStaff && (hojaVida || puedeHojaVida) && (
          <div>
            <label className="label">Hoja de vida / CV</label>
            {hojaVida && (
              <div className="mb-2 flex items-center gap-3">
                <a href={hojaVida} target="_blank" rel="noreferrer" className="text-sm font-bold text-grape-700 hover:underline">📄 Ver hoja de vida</a>
                {puedeHojaVida && <button type="button" onClick={quitarHojaVida} disabled={busy} className="text-xs font-bold text-coral-600 hover:underline">Quitar</button>}
              </div>
            )}
            {puedeHojaVida && (
              <>
                <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setArchivoHV(e.target.files?.[0] || null)} className="text-sm" />
                <p className="mt-1 text-xs text-ink/65">PDF, Word o imagen. Se guarda al tocar "Guardar cambios".</p>
              </>
            )}
          </div>
        )}

        {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
        {ok && <p className="text-sm font-bold text-grass-600">Guardado ✔️</p>}
        <button type="button" onClick={guardar} disabled={busy} className="btn-primary justify-center">
          {busy ? 'Guardando...' : 'Guardar cambios'}
        </button>

        {puedeResetear && (
          <div className="rounded-xl bg-ink/5 p-3">
            <p className="mb-2 text-xs font-extrabold uppercase text-ink/65">Contraseña</p>
            {nuevaPassword ? (
              <p className="text-sm">
                Nueva contraseña: <span className="font-extrabold text-grass-700">{nuevaPassword}</span> — comunícasela.
              </p>
            ) : (
              <button type="button" onClick={resetearPassword} disabled={resetBusy} className="btn-secondary !py-1.5 !text-sm">
                {resetBusy ? 'Restableciendo...' : '🔑 Restablecer a la contraseña por defecto'}
              </button>
            )}
          </div>
        )}

        {['superadmin', 'admin', 'coordinador', 'docente'].includes(persona.role) && (
          <div>
            <p className="mb-2 text-xs font-extrabold uppercase text-ink/65">Niveles asignados</p>
            {clases.length === 0 ? (
              <p className="text-sm text-ink/65">Aún sin niveles asignados.</p>
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

        {persona.role === 'padre' && (
          <div>
            <p className="mb-2 text-xs font-extrabold uppercase text-ink/65">Hijos/as vinculados</p>
            {hijos.length === 0 ? (
              <p className="text-sm text-ink/65">Sin niños vinculados.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {hijos.map((nombre, i) => (
                  <span key={i} className="badge bg-coral-100 text-coral-700">
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
