import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { whatsappLink } from '../lib/whatsapp'
import Avatar from './Avatar'
import Modal from './Modal'

const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'Admin', coordinador: 'Coordinador', docente: 'Docente' }
const ROLE_BADGE = {
  superadmin: 'bg-grape-100 text-grape-700',
  admin: 'bg-grape-100 text-grape-700',
  coordinador: 'bg-sunshine-100 text-sunshine-700',
  docente: 'bg-sky-100 text-sky-700',
}

export default function DocentesTab({ usuarios, clasesPorDocente, onReload, miRole }) {
  const [detalle, setDetalle] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  const staff = (usuarios || []).filter((u) =>
    ['superadmin', 'admin', 'coordinador', 'docente'].includes(u.role),
  )

  function openDetalle(u) {
    setDetalle(u)
    setEditForm({
      email: u.email || '',
      whatsapp: u.whatsapp || '',
      telefono: u.telefono || '',
    })
    setFile(null)
    setOk('')
    setError('')
  }

  async function guardar() {
    if (!detalle) return
    setBusy(true)
    setError('')
    setOk('')

    let hoja_vida_url = detalle.hoja_vida_url

    if (file) {
      const ext = file.name.split('.').pop()
      const nombre = detalle.nombre_completo.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
      const path = `${nombre}_HV_${Date.now()}.${ext}`
      const { error: upError } = await supabase.storage.from('hojas_vida').upload(path, file, { upsert: true })
      if (upError) {
        setError(upError.message)
        setBusy(false)
        return
      }
      hoja_vida_url = supabase.storage.from('hojas_vida').getPublicUrl(path).data.publicUrl
    }

    const { error: saveError } = await supabase
      .from('profiles')
      .update({
        email: editForm.email || null,
        whatsapp: editForm.whatsapp || null,
        telefono: editForm.telefono || null,
        hoja_vida_url,
      })
      .eq('id', detalle.id)

    setBusy(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setOk('Guardado')
    setFile(null)
    onReload?.()
  }

  async function quitarHojaVida() {
    if (!detalle) return
    setBusy(true)
    await supabase.from('profiles').update({ hoja_vida_url: null }).eq('id', detalle.id)
    setBusy(false)
    setDetalle({ ...detalle, hoja_vida_url: null })
    setOk('Hoja de vida eliminada')
    onReload?.()
  }

  const puedeEditar = ['superadmin', 'admin'].includes(miRole)

  return (
    <>
      {staff.length === 0 ? (
        <p className="text-center text-ink/40">No hay docentes registrados aún.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((u) => {
            const clases = clasesPorDocente[u.id] || []
            const wa = whatsappLink(u.whatsapp || u.telefono)
            return (
              <div
                key={u.id}
                className={`card flex flex-col gap-3 transition-opacity ${!u.activo ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar nombre={u.nombre_completo} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{u.nombre_completo}</p>
                    <span className={`badge text-[11px] ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                  </div>
                  {!u.activo && <span className="badge bg-coral-100 text-coral-700 text-[10px]">Inactivo</span>}
                </div>

                <div className="flex flex-col gap-1.5 text-sm">
                  {u.email && (
                    <div className="flex items-center gap-2 text-ink/60">
                      <span className="shrink-0">📧</span>
                      <a href={`mailto:${u.email}`} className="truncate hover:text-sky-500">{u.email}</a>
                    </div>
                  )}
                  {(u.whatsapp || u.telefono) && (
                    <div className="flex items-center gap-2 text-ink/60">
                      <span className="shrink-0">📱</span>
                      <span className="truncate">{u.whatsapp || u.telefono}</span>
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-bold text-green-600 hover:underline">
                          💬 WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                  {!u.email && !u.whatsapp && !u.telefono && (
                    <p className="text-ink/30 italic">Sin datos de contacto</p>
                  )}
                </div>

                {clases.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {clases.map((c, i) => (
                      <span key={i} className="badge bg-sky-100 text-sky-700 text-[11px]">{c}</span>
                    ))}
                  </div>
                )}

                {u.hoja_vida_url && (
                  <a
                    href={u.hoja_vida_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl bg-grape-50 px-3 py-2 text-sm font-bold text-grape-700 hover:bg-grape-100"
                  >
                    📄 Ver hoja de vida
                  </a>
                )}

                <div className="mt-auto flex gap-2 pt-1">
                  {puedeEditar && (
                    <button
                      onClick={() => openDetalle(u)}
                      className="btn-secondary flex-1 !py-1.5 !text-xs"
                    >
                      Editar info
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={detalle ? `Editar — ${detalle.nombre_completo}` : ''}>
        {detalle && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input
                className="input"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label className="label">WhatsApp (con código de país)</label>
              <input
                className="input"
                value={editForm.whatsapp}
                onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                placeholder="Ej. 18091234567"
              />
              <p className="mt-1 text-xs text-ink/40">Opcional — si lo dejan vacío, el docente puede agregarlo después.</p>
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input
                className="input"
                value={editForm.telefono}
                onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                placeholder="Ej. 18091234567"
              />
            </div>
            <div>
              <label className="label">Hoja de vida / CV</label>
              {detalle.hoja_vida_url && (
                <div className="mb-2 flex items-center gap-2">
                  <a
                    href={detalle.hoja_vida_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold text-grape-600 hover:underline"
                  >
                    📄 Ver archivo actual
                  </a>
                  <button
                    type="button"
                    onClick={quitarHojaVida}
                    className="text-xs font-bold text-coral-500 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              )}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
              <p className="mt-1 text-xs text-ink/40">PDF, Word o imagen. Se guarda en la carpeta de hojas de vida.</p>
            </div>

            {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
            {ok && <p className="text-sm font-bold text-grass-600">{ok} ✔️</p>}
            <button type="button" onClick={guardar} disabled={busy} className="btn-primary justify-center">
              {busy ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}
