import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { crearUsuario } from '../../lib/invite'
import { useAuth } from '../../contexts/AuthContext'
import Skeleton from '../../components/Skeleton'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import DetalleDocenteModal from '../../components/DetalleDocenteModal'
import { whatsappLink } from '../../lib/whatsapp'

const ROLE_LABEL = { admin: 'Administrador', coordinador: 'Coordinador', docente: 'Docente' }
const ROLE_BADGE = {
  admin: 'bg-grape-100 text-grape-700',
  coordinador: 'bg-sunshine-100 text-sunshine-700',
  docente: 'bg-sky-100 text-sky-700',
}

export default function Docentes() {
  const { profile } = useAuth()
  const [staff, setStaff] = useState(null)
  const [clasesPorDocente, setClasesPorDocente] = useState({})
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ cedula: '', nombre_completo: '', role: 'docente' })
  const [error, setError] = useState('')
  const [creado, setCreado] = useState(null)
  const [busy, setBusy] = useState(false)

  const [detallePersona, setDetallePersona] = useState(null)
  const [confirmDesactivar, setConfirmDesactivar] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const load = useCallback(async () => {
    const [{ data }, { data: asignaciones }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'coordinador', 'docente'])
        .order('role')
        .order('nombre_completo'),
      supabase.from('docentes_niveles').select('docente_id, nivel:niveles(nombre)'),
    ])
    setStaff(data || [])
    const clases = {}
    ;(asignaciones || []).forEach((a) => {
      if (!a.nivel?.nombre) return
      clases[a.docente_id] = clases[a.docente_id] || []
      clases[a.docente_id].push(a.nivel.nombre)
    })
    setClasesPorDocente(clases)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const rolesInvitables = profile.role === 'admin' ? ['docente', 'coordinador', 'admin'] : ['docente']

  function openInvite() {
    setForm({ cedula: '', nombre_completo: '', role: 'docente' })
    setError('')
    setCreado(null)
    setModalOpen(true)
  }

  async function handleInvite(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { password } = await crearUsuario(form)
      setCreado({ cedula: form.cedula, password, nombre: form.nombre_completo })
      load()
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  async function toggleActivo(person) {
    await supabase.from('profiles').update({ activo: !person.activo }).eq('id', person.id)
    load()
  }

  function handleToggleClick(person) {
    if (person.activo) {
      setConfirmDesactivar(person)
    } else {
      toggleActivo(person)
    }
  }

  async function confirmarDesactivar() {
    setConfirmBusy(true)
    await toggleActivo(confirmDesactivar)
    setConfirmBusy(false)
    setConfirmDesactivar(null)
  }

  if (!staff) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-2 h-4 w-56" />
          </div>
          <Skeleton className="h-12 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Equipo 🍎</h1>
          <p className="text-ink/50">Docentes, coordinadores y administradores</p>
        </div>
        <button className="btn-primary" onClick={openInvite}>
          + Agregar
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
          <table className="w-full text-left">
            <thead className="bg-sky-50 text-sm font-bold uppercase text-ink/50">
              <tr>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Nombre</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Rol</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Cédula</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Clases</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Estado</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((p) => (
                <tr key={p.id} className={`border-t border-ink/5 ${!p.activo ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 font-bold">{p.nombre_completo}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    <span className={`badge ${ROLE_BADGE[p.role]}`}>{ROLE_LABEL[p.role]}</span>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-ink/60">{p.cedula || '—'}</td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-ink/60">
                    {p.role === 'docente' ? clasesPorDocente[p.id]?.join(', ') || 'Sin asignar' : '—'}
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    <span className={`badge ${p.activo ? 'bg-grass-100 text-grass-700' : 'bg-coral-100 text-coral-700'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-3 py-2 sm:px-4 sm:py-3">
                    <div className="flex flex-wrap gap-2">
                      {whatsappLink(p.telefono) && (
                        <a
                          href={whatsappLink(p.telefono)}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir WhatsApp"
                          className="btn-success !px-2 !py-1 !text-xs"
                        >
                          💬
                        </a>
                      )}
                      <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => setDetallePersona(p)}>
                        Ver detalle
                      </button>
                      {profile.role === 'admin' && p.id !== profile.id && (
                        <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => handleToggleClick(p)}>
                          {p.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                    Aún no hay nadie en el equipo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Agregar al equipo">
        {creado ? (
          <div className="flex flex-col gap-4 text-center">
            <span className="text-4xl">✅</span>
            <p className="font-bold">Cuenta creada para {creado.nombre}</p>
            <div className="rounded-chunky bg-grass-50 p-4">
              <p className="text-xs font-extrabold uppercase text-ink/40">Cédula (usuario)</p>
              <p className="text-xl font-extrabold text-grass-700">{creado.cedula}</p>
              <p className="mt-2 text-xs font-extrabold uppercase text-ink/40">Contraseña</p>
              <p className="text-xl font-extrabold text-grass-700">{creado.password}</p>
            </div>
            <p className="text-sm text-ink/50">
              Comunícale estos datos (puede cambiar su contraseña después desde su cuenta).
            </p>
            <button className="btn-primary justify-center" onClick={() => setModalOpen(false)}>
              Listo
            </button>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            <div>
              <label className="label">Nombre completo</label>
              <input
                required
                className="input"
                value={form.nombre_completo}
                onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Cédula</label>
              <input
                required
                className="input"
                value={form.cedula}
                onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                placeholder="Ej. 001-1234567-8"
              />
              <p className="mt-1 text-xs text-ink/40">Va a ser su usuario y parte de su contraseña.</p>
            </div>
            <div>
              <label className="label">Rol</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {rolesInvitables.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
            <button disabled={busy} className="btn-primary justify-center">
              {busy ? 'Creando...' : 'Crear cuenta'}
            </button>
          </form>
        )}
      </Modal>

      <DetalleDocenteModal
        persona={detallePersona}
        clases={detallePersona ? clasesPorDocente[detallePersona.id] || [] : []}
        open={!!detallePersona}
        onClose={() => setDetallePersona(null)}
        onSaved={load}
      />

      <ConfirmModal
        open={!!confirmDesactivar}
        onClose={() => setConfirmDesactivar(null)}
        onConfirm={confirmarDesactivar}
        busy={confirmBusy}
        title="¿Desactivar a esta persona?"
        confirmLabel="Sí, desactivar"
        message={
          confirmDesactivar
            ? `${confirmDesactivar.nombre_completo} dejará de aparecer como activo/a en el equipo. Puedes reactivarlo/a cuando quieras.`
            : ''
        }
      />
    </div>
  )
}
