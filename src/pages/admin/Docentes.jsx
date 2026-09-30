import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { crearUsuario } from '../../lib/invite'
import { generarCodigoFacil } from '../../lib/codigoFacil'
import { useAuth } from '../../contexts/AuthContext'
import Skeleton from '../../components/Skeleton'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import DetalleUsuarioModal from '../../components/DetalleUsuarioModal'
import DocentesTab from '../../components/DocentesTab'
import Avatar from '../../components/Avatar'
import { whatsappLink } from '../../lib/whatsapp'
import TituloPagina from '../../components/ui/TituloPagina'

const ROLE_LABEL = { superadmin: 'Administrador', admin: 'Administrador', coordinador: 'Coordinador', docente: 'Docente', padre: 'Padre / Madre' }
const ROLE_BADGE = {
  superadmin: 'bg-grape-100 text-grape-700',
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

export default function Docentes() {
  const { profile } = useAuth()

  const [usuarios, setUsuarios] = useState(null)
  const [clasesPorDocente, setClasesPorDocente] = useState({})
  const [hijosPorPadre, setHijosPorPadre] = useState({})
  const [ninos, setNinos] = useState([])
  const [filtroRol, setFiltroRol] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ cedula: '', nombre_completo: '', role: 'docente', email: '', whatsapp: '' })
  const [busquedaNino, setBusquedaNino] = useState('')
  const [ninoSeleccionado, setNinoSeleccionado] = useState(null)
  const [parentesco, setParentesco] = useState('')
  const [nivelesTodos, setNivelesTodos] = useState([])
  const [nivelesElegidos, setNivelesElegidos] = useState([])
  const [error, setError] = useState('')
  const [creado, setCreado] = useState(null)
  const [busy, setBusy] = useState(false)

  const [vista, setVista] = useState('todos')
  const [detallePersona, setDetallePersona] = useState(null)
  const [confirmDesactivar, setConfirmDesactivar] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [confirmBorrar, setConfirmBorrar] = useState(null)
  const [borrarBusy, setBorrarBusy] = useState(false)

  const load = useCallback(async () => {
    const [{ data: perfiles }, { data: asignaciones }, { data: vinculos }, { data: n }] = await Promise.all([
      supabase.from('profiles').select('*').order('role').order('nombre_completo'),
      supabase.from('docentes_niveles').select('docente_id, nivel:niveles(nombre)'),
      supabase.from('ninos_padres').select('padre_id, nino:ninos(nombre_completo, nivel:niveles(nombre))'),
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
      hijos[v.padre_id].push(v.nino.nivel?.nombre ? `${v.nino.nombre_completo} (${v.nino.nivel.nombre})` : v.nino.nombre_completo)
    })
    setHijosPorPadre(hijos)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const rolesInvitables = ['superadmin', 'admin'].includes(profile.role) ? ['docente', 'coordinador', 'admin', 'padre'] : ['docente', 'padre']

  const filtrados = (usuarios || [])
    .filter((u) => filtroRol === 'todos' || u.role === filtroRol || (filtroRol === 'admin' && u.role === 'superadmin'))
    .filter(
      (u) =>
        u.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) || (u.cedula || '').includes(busqueda),
    )

  const ninosFiltrados = busquedaNino
    ? ninos.filter((n) => n.nombre_completo.toLowerCase().includes(busquedaNino.toLowerCase())).slice(0, 8)
    : []

  function openInvite() {
    setForm({ cedula: '', nombre_completo: '', role: 'docente', email: '', whatsapp: '' })
    setBusquedaNino('')
    setNinoSeleccionado(null)
    setParentesco('')
    setNivelesElegidos([])
    setError('')
    setCreado(null)
    setModalOpen(true)
    supabase.from('niveles').select('id, nombre').eq('activo', true).order('orden').then(({ data }) => setNivelesTodos(data || []))
  }

  const esEquipo = ['docente', 'coordinador', 'admin'].includes(form.role)

  function toggleNivel(id) {
    setNivelesElegidos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
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
      const { id, password } = await crearUsuario({
        ...form,
        email: form.email || undefined,
        whatsapp: form.whatsapp || undefined,
        nino_id: form.role === 'padre' ? ninoSeleccionado.id : undefined,
        parentesco: form.role === 'padre' ? parentesco : undefined,
      })
      // Asignar a los niveles elegidos (uno o varios) en el mismo paso.
      let avisoNiveles = ''
      if (esEquipo && nivelesElegidos.length > 0) {
        const { error: nivErr } = await supabase
          .from('docentes_niveles')
          .insert(nivelesElegidos.map((nivel_id) => ({ docente_id: id, nivel_id })))
        avisoNiveles = nivErr
          ? 'La cuenta se creó, pero no se pudo asignar a los niveles. Asígnalo desde Niveles.'
          : `Asignado/a a: ${nivelesTodos.filter((n) => nivelesElegidos.includes(n.id)).map((n) => n.nombre).join(', ')}`
      }
      setCreado({ cedula: form.cedula, password, nombre: form.nombre_completo, avisoNiveles })
      load()
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  async function toggleActivo(persona) {
    const nuevoActivo = !persona.activo
    await supabase.from('profiles').update({
      activo: nuevoActivo,
      desactivado_en: nuevoActivo ? null : new Date().toISOString(),
    }).eq('id', persona.id)
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

  function llevaInactivo3Meses(u) {
    if (u.activo || !u.desactivado_en) return false
    const hace3Meses = new Date()
    hace3Meses.setMonth(hace3Meses.getMonth() - 3)
    return new Date(u.desactivado_en) <= hace3Meses
  }

  async function confirmarBorrar() {
    setBorrarBusy(true)
    await supabase.from('ninos_padres').delete().eq('padre_id', confirmBorrar.id)
    await supabase.from('docentes_niveles').delete().eq('docente_id', confirmBorrar.id)
    await supabase.from('profiles').delete().eq('id', confirmBorrar.id)
    setBorrarBusy(false)
    setConfirmBorrar(null)
    load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <TituloPagina ruta="/docentes">Equipo</TituloPagina>
        <p className="text-ink/70">Docentes, coordinadores, administradores y padres — todas las cuentas de tu escuelita</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setVista('todos')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${vista === 'todos' ? 'bg-sky-400 text-white' : 'bg-white text-ink/70'}`}
        >
          📋 Todas las cuentas
        </button>
        <button
          onClick={() => setVista('docentes')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${vista === 'docentes' ? 'bg-sky-400 text-white' : 'bg-white text-ink/70'}`}
        >
          🍎 Docentes
        </button>
      </div>

      {vista === 'docentes' && (
        <DocentesTab
          usuarios={usuarios}
          clasesPorDocente={clasesPorDocente}
          onReload={load}
          miRole={profile.role}
        />
      )}

      {vista === 'todos' && !usuarios && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-12 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}
      {vista === 'todos' && usuarios && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                className="input max-w-xs"
                placeholder="Buscar por nombre o usuario..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {FILTROS_ROL.map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setFiltroRol(v)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold sm:px-4 sm:text-sm ${
                      filtroRol === v ? 'bg-sky-400 text-white' : 'bg-white text-ink/70'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary fab-movil" onClick={openInvite}>
              + Nueva cuenta
            </button>
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="tabla-tarjetas w-full text-left">
              <thead className="bg-sky-50 text-sm font-bold uppercase text-ink/70">
                <tr>
                  <th className="px-3 py-2 sm:px-4 sm:py-3">Nombre</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3">Rol</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3">Usuario</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3">Nivel</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3">Estado</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u) => (
                  <tr key={u.id} className={`border-t border-ink/5 ${!u.activo ? 'opacity-50' : ''}`}>
                    <td data-titulo className="px-3 py-2 sm:px-4 sm:py-3 font-bold">
                      <div className="flex items-center gap-2">
                        <Avatar nombre={u.nombre_completo} size="sm" />
                        <span>{u.nombre_completo}</span>
                      </div>
                    </td>
                    <td data-label="Rol" className="px-3 py-2 sm:px-4 sm:py-3">
                      <span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                    </td>
                    <td data-label="Usuario" className="px-3 py-2 sm:px-4 sm:py-3 text-ink/75">{u.cedula || '—'}</td>
                    <td data-label="Nivel" className="px-3 py-2 sm:px-4 sm:py-3 text-ink/75">
                      {['superadmin', 'admin', 'coordinador', 'docente'].includes(u.role)
                        ? clasesPorDocente[u.id]?.join(', ') || (u.role === 'docente' ? 'Sin asignar' : '—')
                        : u.role === 'padre'
                          ? hijosPorPadre[u.id]?.join(', ') || 'Sin vincular'
                          : '—'}
                    </td>
                    <td data-label="Estado" className="px-3 py-2 sm:px-4 sm:py-3">
                      <span className={`badge ${u.activo ? 'bg-grass-100 text-grass-700' : 'bg-coral-100 text-coral-700'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td data-acciones className="px-3 py-2 sm:px-4 sm:py-3">
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
                        {['superadmin', 'admin'].includes(profile.role) && u.id !== profile.id && (
                          <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => handleToggleClick(u)}>
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                        {['superadmin', 'admin'].includes(profile.role) && llevaInactivo3Meses(u) && (
                          <button
                            className="rounded-lg bg-coral-100 px-3 py-1 text-xs font-bold text-coral-700 hover:bg-coral-200"
                            onClick={() => setConfirmBorrar(u)}
                          >
                            🗑️ Borrar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-ink/65">
                      No hay cuentas que coincidan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva cuenta">
        {creado ? (
          <div className="flex flex-col gap-4 text-center">
            <span className="text-4xl">✅</span>
            <p className="font-bold">Cuenta creada para {creado.nombre}</p>
            <div className="rounded-chunky bg-grass-50 p-4">
              <p className="text-xs font-extrabold uppercase text-ink/65">Usuario</p>
              <p className="text-xl font-extrabold text-grass-700">{creado.cedula}</p>
              <p className="mt-2 text-xs font-extrabold uppercase text-ink/65">Contraseña</p>
              <p className="text-xl font-extrabold text-grass-700">{creado.password}</p>
            </div>
            {creado.avisoNiveles && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-800">{creado.avisoNiveles}</p>}
            <p className="text-sm text-ink/70">Comunícale estos datos para que pueda entrar.</p>
            <a
              className="btn-secondary justify-center"
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/?text=${encodeURIComponent(`Hola ${creado.nombre.split(' ')[0]} 👋 Ya tienes tu cuenta en la escuelita.\nEntra en: ${window.location.origin}\nUsuario: ${creado.cedula}\nContraseña: ${creado.password}`)}`}
            >
              📲 Enviar por WhatsApp
            </a>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setModalOpen(false)}>
                Listo
              </button>
              <button className="btn-primary flex-1 justify-center" onClick={openInvite}>
                + Crear otra
              </button>
            </div>
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
              <label className="label">Usuario (su cédula, o un código fácil si no la sabes)</label>
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
              <p className="mt-1 text-xs text-ink/65">Con esto va a entrar, y también es parte de su contraseña.</p>
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
            {esEquipo && nivelesTodos.length > 0 && (
              <div>
                <label className="label">¿En qué niveles enseña o ayuda? (opcional)</label>
                <div className="flex flex-wrap gap-2">
                  {nivelesTodos.map((n) => {
                    const on = nivelesElegidos.includes(n.id)
                    return (
                      <button
                        key={n.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleNivel(n.id)}
                        className={`rounded-full px-3 py-2 text-sm font-bold transition-colors ${on ? 'bg-sky-400 text-white' : 'bg-ink/5 text-ink/75 hover:bg-sky-50'}`}
                      >
                        {on ? '✓ ' : ''}{n.nombre}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1 text-xs text-ink/65">Puedes elegir varios. Un nivel puede tener uno o más docentes.</p>
              </div>
            )}

            <div>
              <label className="label">Correo electrónico (opcional)</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label className="label">WhatsApp (opcional, con código de país)</label>
              <input
                className="input"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="Ej. 18091234567"
              />
              <p className="mt-1 text-xs text-ink/65">Si no lo saben ahora, el docente puede agregarlo después.</p>
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
                      {ninosFiltrados.length === 0 && <p className="px-3 py-2 text-sm text-ink/65">Sin resultados.</p>}
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

      <ConfirmModal
        open={!!confirmBorrar}
        onClose={() => setConfirmBorrar(null)}
        onConfirm={confirmarBorrar}
        busy={borrarBusy}
        title="¿Borrar esta cuenta permanentemente?"
        confirmLabel="Sí, borrar"
        message={
          confirmBorrar
            ? `${confirmBorrar.nombre_completo} lleva más de 3 meses desactivado/a. Se borrará su perfil y vínculos. Esta acción NO se puede deshacer.`
            : ''
        }
      />
    </div>
  )
}
