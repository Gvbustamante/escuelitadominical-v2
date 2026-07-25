import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { crearUsuario } from '../../lib/invite'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'

const ROLE_LABEL = { admin: 'Administrador', coordinador: 'Coordinador', docente: 'Docente' }
const ROLE_BADGE = {
  admin: 'bg-grape-100 text-grape-700',
  coordinador: 'bg-sunshine-100 text-sunshine-700',
  docente: 'bg-sky-100 text-sky-700',
}

export default function Docentes() {
  const { profile } = useAuth()
  const [staff, setStaff] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ cedula: '', nombre_completo: '', role: 'docente' })
  const [error, setError] = useState('')
  const [creado, setCreado] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'coordinador', 'docente'])
      .order('role')
    setStaff(data || [])
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

  if (!staff) return <Spinner />

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((p) => (
          <div key={p.id} className={`card ${!p.activo ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold">{p.nombre_completo}</h3>
              <span className={`badge ${ROLE_BADGE[p.role]}`}>{ROLE_LABEL[p.role]}</span>
            </div>
            {p.cedula && <p className="text-sm text-ink/50">Cédula: {p.cedula}</p>}
            {profile.role === 'admin' && p.id !== profile.id && (
              <button className="btn-secondary mt-4 w-full !py-2 !text-sm" onClick={() => toggleActivo(p)}>
                {p.activo ? 'Desactivar' : 'Activar'}
              </button>
            )}
          </div>
        ))}
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
    </div>
  )
}
