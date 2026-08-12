import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { crearUsuario } from '../../lib/invite'
import { generarCodigoFacil } from '../../lib/codigoFacil'
import { useAuth } from '../../contexts/AuthContext'
import { usePermisosRol, refreshPermisosRol, PERMISOS_DISPONIBLES } from '../../lib/permisosRol'
import Skeleton from '../../components/Skeleton'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import DetalleUsuarioModal from '../../components/DetalleUsuarioModal'
import { whatsappLink } from '../../lib/whatsapp'

const ROLE_LABEL = { admin: 'Administrador', coordinador: 'Coordinador', docente: 'Docente', padre: 'Padre / Madre' }
const ROLE_BADGE = {
  admin: 'bg-grape-100 text-grape-700',
  coordinador: 'bg-sunshine-100 text-sunshine-700',
  docente: 'bg-sky-100 text-sky-700',
  padre: 'bg-coral-100 text-coral-700',
}
const FILTROS_ROL = [
  ['todos', 'Todos'],
  ['admin', 'Admin'],
  ['coordinador', 'Coordinador'],
  ['docente', 'Docente'],
  ['padre', 'Padre/madre'],
]

export default function Usuarios() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('usuarios')

  const [usuarios, setUsuarios] = useState(null)
  const [clasesPorDocente, setClasesPorDocente] = useState({})
  const [hijosPorPadre, setHijosPorPadre] = useState({})
  const [ninos, setNinos] = useState([])
  const [filtroRol, setFiltroRol] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ cedula: '', nombre_completo: '', role: 'docente' })
  const [busquedaNino, setBusquedaNino] = useState('')
  const [ninoSeleccionado, setNinoSeleccionado] = useState(null)
  const [parentesco, setParentesco] = useState('')
  const [error, setError] = useState('')
  const [creado, setCreado] = useState(null)
  const [busy, setBusy] = useState(false)

  const [detallePersona, setDetallePersona] = useState(null)
  const [confirmDesactivar, setConfirmDesactivar] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const load = useCallback(async () => {
    const [{ data: perfiles }, { data: asignaciones }, { data: vinculos }, { data: n }] = await Promise.all([
      supabase.from('profiles').select('*').order('role').order('nombre_completo'),
      supabase.from('docentes_niveles').select('docente_id, nivel:niveles(nombre)'),
      supabase.from('ninos_padres').select('padre_id, nino:ninos(nombre_completo)'),
      supabase.from('ninos').select('id, nombre_completo, activo').eq('activo', true).order('nombre_completo'),
    ])
    setUsuarios(perfiles || [])
    setNinos(n || [])

    const clases = {}
    ;(asignaciones || []).forEach((a) => {
      if (!a.nivel?.nombre) return
      clases[a.docente_id] = clases[a.docente_id] || []
      clases[a.docente_id].push(a.nivel.nombre)
    })
    setClasesPorDocente(clases)

    const hijos = {}
    ;(vinculos || []).forEach((v) => {
      if (!v.nino?.nombre_completo) return
      hijos[v.padre_id] = hijos[v.padre_id] || []
      hijos[v.padre_id].push(v.nino.nombre_completo)
    })
    setHijosPorPadre(hijos)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const rolesInvitables = profile.role === 'admin' ? ['docente', 'coordinador', 'admin', 'padre'] : ['docente', 'padre']

  const filtrados = (usuarios || [])
    .filter((u) => filtroRol === 'todos' || u.role === filtroRol)
    .filter(
      (u) =>
        u.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) || (u.cedula || '').includes(busqueda),
    )

  const ninosFiltrados = busquedaNino
    ? ninos.filter((n) => n.nombre_completo.toLowerCase().includes(busquedaNino.toLowerCase())).slice(0, 8)
    : []

  function openInvite() {
    setForm({ cedula: '', nombre_completo: '', role: 'docente' })
    setBusquedaNino('')
    setNinoSeleccionado(null)
    setParentesco('')
    setError('')
    setCreado(null)
    setModalOpen(true)
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (form.role === 'padre' && !ninoSeleccionado) {
      setError('Elige a qué niño/a vincular este padre/madre.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { password } = await crearUsuario({
        ...form,
        nino_id: form.role === 'padre' ? ninoSeleccionado.id : undefined,
        parentesco: form.role === 'padre' ? parentesco : undefined,
      })
      setCreado({ cedula: form.cedula, password, nombre: form.nombre_completo })
      load()
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  async function toggleActivo(persona) {
    await supabase.from('profiles').update({ activo: !persona.activo }).eq('id', persona.id)
    load()
  }

  function handleToggleClick(persona) {
    if (persona.activo) {
      setConfirmDesactivar(persona)
    } else {
      toggleActivo(persona)
    }
  }

  async function confirmarDesactivar() {
    setConfirmBusy(true)
    await toggleActivo(confirmDesactivar)
    setConfirmBusy(false)
    setConfirmDesactivar(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Usuarios 👤</h1>
        <p className="text-ink/50">Todas las cuentas de tu escuelita, en un solo lugar</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab('usuarios')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'usuarios' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          Usuarios
        </button>
        {profile.role === 'admin' && (
          <button
            onClick={() => setTab('permisos')}
            className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'permisos' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
          >
            Roles y permisos
          </button>
        )}
      </div>

      {tab === 'usuarios' ? (
        <UsuariosTab
          usuarios={usuarios}
          filtrados={filtrados}
          clasesPorDocente={clasesPorDocente}
          hijosPorPadre={hijosPorPadre}
          filtroRol={filtroRol}
          setFiltroRol={setFiltroRol}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          openInvite={openInvite}
          setDetallePersona={setDetallePersona}
          handleToggleClick={handleToggleClick}
          profile={profile}
        />
      ) : (
        <PermisosTab />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo usuario">
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
            <p className="text-sm text-ink/50">Comunícale estos datos para que pueda entrar.</p>
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
              <label className="label">Cédula (o un código fácil, si no la sabes)</label>
              <div className="flex gap-2">
                <input
                  required
                  className="input"
                  value={form.cedula}
                  onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                  placeholder="Ej. 001-1234567-8"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, cedula: generarCodigoFacil(form.nombre_completo) })}
                  className="btn-secondary shrink-0 !px-3 !text-sm"
                >
                  🎲 Generar
                </button>
              </div>
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

            {form.role === 'padre' && (
              <>
                <div>
                  <label className="label">¿De qué niño/a es padre/madre?</label>
                  <input
                    className="input"
                    value={busquedaNino}
                    onChange={(e) => {
                      setBusquedaNino(e.target.value)
                      setNinoSeleccionado(null)
                    }}
                    placeholder="Busca por nombre..."
                  />
                  {busquedaNino && !ninoSeleccionado && (
                    <div className="mt-1 flex max-h-40 flex-col overflow-y-auto rounded-2xl border-2 border-ink/10">
                      {ninosFiltrados.map((n) => (
                        <button
                          type="button"
                          key={n.id}
                          onClick={() => {
                            setNinoSeleccionado(n)
                            setBusquedaNino(n.nombre_completo)
                          }}
                          className="px-3 py-2 text-left text-sm font-bold hover:bg-sky-50"
                        >
                          {n.nombre_completo}
                        </button>
                      ))}
                      {ninosFiltrados.length === 0 && <p className="px-3 py-2 text-sm text-ink/40">Sin resultados.</p>}
                    </div>
                  )}
                </div>
                {ninoSeleccionado && (
                  <div>
                    <label className="label">Parentesco</label>
                    <input
                      className="input"
                      placeholder="Mamá, papá, abuela..."
                      value={parentesco}
                      onChange={(e) => setParentesco(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
            <button disabled={busy} className="btn-primary justify-center">
              {busy ? 'Creando...' : 'Crear cuenta'}
            </button>
          </form>
        )}
      </Modal>

      <DetalleUsuarioModal
        persona={detallePersona}
        clases={detallePersona ? clasesPorDocente[detallePersona.id] || [] : []}
        hijos={detallePersona ? hijosPorPadre[detallePersona.id] || [] : []}
        open={!!detallePersona}
        onClose={() => setDetallePersona(null)}
        onSaved={load}
        miRole={profile.role}
        miId={profile.id}
      />

      <ConfirmModal
        open={!!confirmDesactivar}
        onClose={() => setConfirmDesactivar(null)}
        onConfirm={confirmarDesactivar}
        busy={confirmBusy}
        title="¿Desactivar esta cuenta?"
        confirmLabel="Sí, desactivar"
        message={
          confirmDesactivar
            ? `${confirmDesactivar.nombre_completo} ya no va a poder entrar. Puedes reactivarla cuando quieras.`
            : ''
        }
      />
    </div>
  )
}

function UsuariosTab({
  usuarios,
  filtrados,
  clasesPorDocente,
  hijosPorPadre,
  filtroRol,
  setFiltroRol,
  busqueda,
  setBusqueda,
  openInvite,
  setDetallePersona,
  handleToggleClick,
  profile,
}) {
  if (!usuarios) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="input max-w-xs"
            placeholder="Buscar por nombre o cédula..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {FILTROS_ROL.map(([v, label]) => (
              <button
                key={v}
                onClick={() => setFiltroRol(v)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold sm:px-4 sm:text-sm ${
                  filtroRol === v ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button className="btn-primary" onClick={openInvite}>
          + Nuevo usuario
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left">
          <thead className="bg-sky-50 text-sm font-bold uppercase text-ink/50">
            <tr>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Nombre</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Rol</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Cédula</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Vínculo</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Estado</th>
              <th className="px-3 py-2 sm:px-4 sm:py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((u) => (
              <tr key={u.id} className={`border-t border-ink/5 ${!u.activo ? 'opacity-50' : ''}`}>
                <td className="px-3 py-2 sm:px-4 sm:py-3 font-bold">{u.nombre_completo}</td>
                <td className="px-3 py-2 sm:px-4 sm:py-3">
                  <span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                </td>
                <td className="px-3 py-2 sm:px-4 sm:py-3 text-ink/60">{u.cedula || '—'}</td>
                <td className="px-3 py-2 sm:px-4 sm:py-3 text-ink/60">
                  {u.role === 'docente'
                    ? clasesPorDocente[u.id]?.join(', ') || 'Sin asignar'
                    : u.role === 'padre'
                      ? hijosPorPadre[u.id]?.join(', ') || 'Sin vincular'
                      : '—'}
                </td>
                <td className="px-3 py-2 sm:px-4 sm:py-3">
                  <span className={`badge ${u.activo ? 'bg-grass-100 text-grass-700' : 'bg-coral-100 text-coral-700'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-3 py-2 sm:px-4 sm:py-3">
                  <div className="flex flex-wrap gap-2">
                    {whatsappLink(u.telefono) && (
                      <a
                        href={whatsappLink(u.telefono)}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir WhatsApp"
                        className="btn-success !px-2 !py-1 !text-xs"
                      >
                        💬
                      </a>
                    )}
                    <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => setDetallePersona(u)}>
                      Ver detalle
                    </button>
                    {profile.role === 'admin' && u.id !== profile.id && (
                      <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => handleToggleClick(u)}>
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                  No hay cuentas que coincidan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function PermisosTab() {
  const { permisos, cargando, error: errorCarga } = usePermisosRol()
  const [busyKey, setBusyKey] = useState('')
  const [error, setError] = useState('')

  async function toggle(rol, permiso) {
    const key = `${rol}_${permiso}`
    setBusyKey(key)
    setError('')
    const actual = permisos?.find((p) => p.rol === rol && p.permiso === permiso)
    const { error: upsertError } = await supabase
      .from('permisos_rol')
      .upsert({ rol, permiso, activo: !actual?.activo }, { onConflict: 'rol,permiso' })
    if (upsertError) {
      setError(upsertError.message)
      setBusyKey('')
      return
    }
    await refreshPermisosRol()
    setBusyKey('')
  }

  if (cargando) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-2xl text-sm text-ink/50">
        Interruptores extra para lo que un rol puede hacer, además de lo normal de la plataforma. Se aplican al
        instante — no hace falta guardar.
      </p>
      {errorCarga && (
        <p className="max-w-2xl rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">
          No pude cargar los permisos: {errorCarga}. ¿Ya corriste <code>actualizacion_permisos.sql</code> en tu
          proyecto de Supabase?
        </p>
      )}
      {error && (
        <p className="max-w-2xl rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">
          No se pudo guardar: {error}
        </p>
      )}
      {PERMISOS_DISPONIBLES.map((p) => {
        const activo = !!permisos?.find((row) => row.rol === p.rol && row.permiso === p.permiso)?.activo
        const key = `${p.rol}_${p.permiso}`
        return (
          <div key={key} className="card flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${ROLE_BADGE[p.rol]}`}>{ROLE_LABEL[p.rol]}</span>
                <p className="font-bold">{p.label}</p>
              </div>
              <p className="mt-1 text-sm text-ink/50">{p.detalle}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(p.rol, p.permiso)}
              disabled={busyKey === key}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                activo ? 'bg-grass-400 text-white' : 'bg-ink/10 text-ink/50'
              }`}
            >
              {busyKey === key ? '...' : activo ? '✅ Activado' : 'Desactivado'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
