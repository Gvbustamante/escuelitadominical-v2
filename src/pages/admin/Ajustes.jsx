import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/Spinner'
import AppLogo from '../../components/AppLogo'
import PermisosTab from '../../components/PermisosTab'
import CambiarPasswordModal from '../../components/CambiarPasswordModal'
import ConfigEstrellas from './ConfigEstrellas'
import MenuTab from '../../components/MenuTab'
import { AyudaContenido } from '../Tutorial'
import { useConfigIglesia, refreshConfigIglesia } from '../../lib/configIglesia'
import { MODULOS_KEYS } from '../../lib/modulos'
import TituloPagina from '../../components/ui/TituloPagina'

const DIAS_SEMANA = [
  { dia_semana: 0, label: 'Domingo' },
  { dia_semana: 1, label: 'Lunes' },
  { dia_semana: 2, label: 'Martes' },
  { dia_semana: 3, label: 'Miércoles' },
  { dia_semana: 4, label: 'Jueves' },
  { dia_semana: 5, label: 'Viernes' },
  { dia_semana: 6, label: 'Sábado' },
]

export default function Ajustes() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('general')
  const [pwOpen, setPwOpen] = useState(false)
  const config = useConfigIglesia()
  const [nombreIglesia, setNombreIglesia] = useState('')
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const inputRef = useRef(null)

  const [revisando, setRevisando] = useState(false)
  const [resultadoRevision, setResultadoRevision] = useState('')

  const [solicitudes, setSolicitudes] = useState([])
  const [solicitudesBusy, setSolicitudesBusy] = useState(null)

  const [diasClase, setDiasClase] = useState(null)
  const [horarios, setHorarios] = useState(null)
  const [nuevoHorario, setNuevoHorario] = useState('')
  const [nuevoHorarioDia, setNuevoHorarioDia] = useState('')
  const [busyHorario, setBusyHorario] = useState(false)

  const loadHorarios = () => supabase.from('horarios').select('*').order('orden').then(({ data }) => setHorarios(data || []))

  const loadSolicitudes = () =>
    supabase
      .from('solicitudes_reset')
      .select('*')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
      .then(({ data }) => setSolicitudes(data || []))

  useEffect(() => {
    supabase
      .from('dias_clase')
      .select('*')
      .order('dia_semana')
      .then(({ data }) => setDiasClase(data || []))
    loadHorarios()
    if (['superadmin', 'admin'].includes(profile.role)) loadSolicitudes()
  }, [])

  async function toggleDiaClase(dia_semana) {
    const actual = diasClase.find((d) => d.dia_semana === dia_semana)
    const nuevoActivo = !actual?.activo
    setDiasClase((prev) => prev.map((d) => (d.dia_semana === dia_semana ? { ...d, activo: nuevoActivo } : d)))
    await supabase.from('dias_clase').upsert({ dia_semana, activo: nuevoActivo }, { onConflict: 'dia_semana' })
  }

  async function agregarHorario(e) {
    e.preventDefault()
    if (!nuevoHorario.trim()) return
    setBusyHorario(true)
    const orden = (horarios.reduce((max, h) => Math.max(max, h.orden), 0) || 0) + 1
    await supabase
      .from('horarios')
      .insert({ nombre: nuevoHorario.trim(), orden, dia_semana: nuevoHorarioDia === '' ? null : Number(nuevoHorarioDia) })
    setNuevoHorario('')
    setNuevoHorarioDia('')
    setBusyHorario(false)
    loadHorarios()
  }

  async function toggleHorarioActivo(h) {
    await supabase.from('horarios').update({ activo: !h.activo }).eq('id', h.id)
    loadHorarios()
  }

  async function renombrarHorario(h, nombre) {
    if (!nombre.trim() || nombre === h.nombre) return
    await supabase.from('horarios').update({ nombre: nombre.trim() }).eq('id', h.id)
    loadHorarios()
  }

  async function cambiarDiaHorario(h, valor) {
    await supabase.from('horarios').update({ dia_semana: valor === '' ? null : Number(valor) }).eq('id', h.id)
    loadHorarios()
  }

  async function handleRevisarInactividad() {
    setRevisando(true)
    setResultadoRevision('')
    const { data, error: rpcError } = await supabase.rpc('revisar_inactividad')
    setRevisando(false)
    if (rpcError) {
      setResultadoRevision('❌ ' + rpcError.message)
      return
    }
    const fila = Array.isArray(data) ? data[0] : data
    setResultadoRevision(
      `✅ Se pausaron ${fila?.ninos_pausados ?? 0} niño(s) y ${fila?.padres_pausados ?? 0} cuenta(s) de padre/madre por inactividad.`,
    )
  }

  async function aprobarReset(sol) {
    setSolicitudesBusy(sol.id)
    await supabase.auth.resetPasswordForEmail(sol.email, {
      redirectTo: window.location.origin,
    })
    await supabase
      .from('solicitudes_reset')
      .update({ estado: 'aprobada', resuelta_en: new Date().toISOString(), resuelta_por: profile.id })
      .eq('id', sol.id)
    setSolicitudesBusy(null)
    loadSolicitudes()
  }

  async function rechazarReset(sol) {
    setSolicitudesBusy(sol.id)
    await supabase
      .from('solicitudes_reset')
      .update({ estado: 'rechazada', resuelta_en: new Date().toISOString(), resuelta_por: profile.id })
      .eq('id', sol.id)
    setSolicitudesBusy(null)
    loadSolicitudes()
  }

  useEffect(() => {
    setNombreIglesia(config?.nombre_iglesia || '')
  }, [config])

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setError('')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleGuardar() {
    setBusy(true)
    setError('')
    setOk('')

    let logo_url = config?.logo_url || null

    if (file) {
      const path = `logo-${Date.now()}-${file.name}`
      const { error: upError } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
      if (upError) {
        setError(upError.message)
        setBusy(false)
        return
      }
      logo_url = supabase.storage.from('logos').getPublicUrl(path).data.publicUrl
    }

    const payload = { nombre_iglesia: nombreIglesia || null, logo_url, updated_at: new Date().toISOString() }
    const { error: saveError } = config?.id
      ? await supabase.from('config_iglesia').update(payload).eq('id', config.id)
      : await supabase.from('config_iglesia').insert(payload)

    setBusy(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setOk('¡Guardado! Los cambios ya se ven en toda la plataforma.')
    setFile(null)
    setPreview(null)
    await refreshConfigIglesia()
  }

  async function handleQuitarLogo() {
    if (!config?.id) return
    setBusy(true)
    setError('')
    setOk('')
    const { error: saveError } = await supabase
      .from('config_iglesia')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', config.id)
    setBusy(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setOk('Logo quitado. Volviste al ícono por defecto.')
    setFile(null)
    setPreview(null)
    await refreshConfigIglesia()
  }

  if (config === null) return <Spinner />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <TituloPagina ruta="/ajustes">Ajustes</TituloPagina>
        <p className="text-ink/70">Personaliza tu escuelita, tu cuenta, y consulta la ayuda</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab('general')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'general' ? 'bg-sky-600 text-white' : 'bg-white text-ink/70'}`}
        >
          General
        </button>
        <button
          onClick={() => setTab('cuenta')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'cuenta' ? 'bg-sky-600 text-white' : 'bg-white text-ink/70'}`}
        >
          Mi cuenta
        </button>
        <button
          onClick={() => setTab('ayuda')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'ayuda' ? 'bg-sky-600 text-white' : 'bg-white text-ink/70'}`}
        >
          Ayuda
        </button>
        <button
          onClick={() => setTab('estrellas')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'estrellas' ? 'bg-sky-600 text-white' : 'bg-white text-ink/70'}`}
        >
          🌟 Estrellas
        </button>
        {profile.role === 'superadmin' && (
          <button
            onClick={() => setTab('modulos')}
            className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'modulos' ? 'bg-sky-600 text-white' : 'bg-white text-ink/70'}`}
          >
            📦 Módulos
          </button>
        )}
        {profile.role === 'superadmin' && (
          <button
            onClick={() => setTab('menu')}
            className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'menu' ? 'bg-sky-600 text-white' : 'bg-white text-ink/70'}`}
          >
            📋 Menú
          </button>
        )}
        {['superadmin', 'admin'].includes(profile.role) && (
          <button
            onClick={() => setTab('permisos')}
            className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'permisos' ? 'bg-sky-600 text-white' : 'bg-white text-ink/70'}`}
          >
            Roles y permisos
          </button>
        )}
      </div>

      {tab === 'cuenta' && (
        <div className="card max-w-xl">
          <p className="label mb-1">Contraseña</p>
          <p className="mb-4 text-sm text-ink/70">Cambia la contraseña con la que entras a tu propia cuenta.</p>
          <button type="button" onClick={() => setPwOpen(true)} className="btn-secondary">
            🔑 Cambiar mi contraseña
          </button>
        </div>
      )}

      {tab === 'ayuda' && <AyudaContenido />}

      {tab === 'estrellas' && <ConfigEstrellas />}

      {tab === 'permisos' && ['superadmin', 'admin'].includes(profile.role) && <PermisosTab />}

      {tab === 'general' && (
        <>
          <div className="card max-w-xl">
            <p className="label mb-3">Logo de la escuelita</p>

            <div className="flex flex-wrap items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-sky-50">
                {preview ? (
                  <img src={preview} alt="Vista previa" className="h-16 w-16 object-contain" />
                ) : (
                  <AppLogo emojiClassName="text-5xl" imgClassName="h-16 w-16 object-contain" />
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary">
                  📷 Elegir imagen
                </button>
                {config?.logo_url && !preview && (
                  <button
                    type="button"
                    onClick={handleQuitarLogo}
                    disabled={busy}
                    className="text-sm font-bold text-coral-600 hover:underline"
                  >
                    Quitar logo y usar el ícono por defecto
                  </button>
                )}
                <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </div>
            </div>
            <p className="mt-3 text-sm text-ink/70">
              Usa una imagen cuadrada de fondo transparente si puedes (PNG). Se verá en el menú, la pantalla de
              ingreso y la página pública.
            </p>

            <div className="mt-5">
              <label className="label">Nombre de la iglesia o escuelita (opcional)</label>
              <input
                className="input"
                value={nombreIglesia}
                onChange={(e) => setNombreIglesia(e.target.value)}
                placeholder="Ej. Escuelita Dominical Casa de Fe"
              />
            </div>

            {error && <p className="mt-3 rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
            {ok && <p className="mt-3 rounded-xl bg-grass-50 px-3 py-2 text-sm font-bold text-grass-600">{ok}</p>}

            <button type="button" onClick={handleGuardar} disabled={busy} className="btn-primary mt-5 justify-center">
              {busy ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>

          <div className="card max-w-xl">
            <p className="label mb-1">Revisar inactividad</p>
            <p className="mb-4 text-sm text-ink/70">
              Pausa automáticamente a los niños sin asistencia hace más de 3 meses, y a los padres/madres que no han
              entrado en más de 2 meses. No borra nada — es reversible, y un padre se reactiva solo la próxima vez
              que entra. Tócalo cuando quieras (ej. cada domingo).
            </p>
            <button type="button" onClick={handleRevisarInactividad} disabled={revisando} className="btn-secondary">
              {revisando ? 'Revisando...' : '🔍 Revisar inactividad'}
            </button>
            {resultadoRevision && <p className="mt-3 text-sm font-bold text-ink/70">{resultadoRevision}</p>}
          </div>

          {['superadmin', 'admin'].includes(profile.role) && solicitudes.length > 0 && (
            <div className="card max-w-xl">
              <p className="label mb-1">Solicitudes de restablecimiento de contraseña</p>
              <p className="mb-4 text-sm text-ink/70">
                Usuarios que pidieron restablecer su contraseña desde la pantalla de inicio de sesión.
              </p>
              <div className="flex flex-col gap-2">
                {solicitudes.map((sol) => (
                  <div key={sol.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sunshine-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold">{sol.nombre || 'Sin nombre'}</p>
                      <p className="text-xs text-ink/70">{sol.email} — {new Date(sol.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={solicitudesBusy === sol.id}
                        onClick={() => aprobarReset(sol)}
                        className="rounded-lg bg-grass-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-grass-600"
                      >
                        {solicitudesBusy === sol.id ? '...' : '✅ Aprobar'}
                      </button>
                      <button
                        disabled={solicitudesBusy === sol.id}
                        onClick={() => rechazarReset(sol)}
                        className="rounded-lg bg-coral-100 px-3 py-1.5 text-xs font-bold text-coral-700 hover:bg-coral-200"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card max-w-xl">
            <p className="label mb-1">Días de clase</p>
            <p className="mb-4 text-sm text-ink/70">
              Qué días de la semana hay escuelita. Se usa en <strong>Planeación</strong> para saber qué días marcar
              en el calendario y pedirte cubrir cada clase.
            </p>
            {!diasClase ? (
              <p className="text-sm text-ink/65">Cargando...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA.map((d) => {
                  const activo = diasClase.find((x) => x.dia_semana === d.dia_semana)?.activo
                  return (
                    <button
                      key={d.dia_semana}
                      type="button"
                      onClick={() => toggleDiaClase(d.dia_semana)}
                      className={`rounded-full px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm ${
                        activo ? 'bg-sky-600 text-white' : 'bg-ink/5 text-ink/70'
                      }`}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card max-w-xl">
            <p className="label mb-1">Horarios</p>
            <p className="mb-4 text-sm text-ink/70">
              Si el mismo día de clase hay más de un servicio (ej. 9:00 am y 11:00 am), agrégalos aquí. Con uno solo
              no necesitas tocar nada — ya viene creado por defecto. Si un horario es solo de un día (ej. los 3
              servicios son del domingo, pero el sábado solo hay uno), dile a cuál día pertenece para que Planeación
              y "Cobertura de hoy" no lo mezclen con los demás días.
            </p>
            {!horarios ? (
              <p className="text-sm text-ink/65">Cargando...</p>
            ) : (
              <div className="flex flex-col gap-2">
                {horarios.map((h) => (
                  <div key={h.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-ink/5 px-3 py-2">
                    <input
                      defaultValue={h.nombre}
                      onBlur={(e) => renombrarHorario(h, e.target.value)}
                      className="input !w-auto flex-1 !py-1.5 !text-sm"
                    />
                    <select
                      defaultValue={h.dia_semana ?? ''}
                      onChange={(e) => cambiarDiaHorario(h, e.target.value)}
                      className="input !w-auto !py-1.5 !text-sm"
                    >
                      <option value="">Todos los días</option>
                      {DIAS_SEMANA.map((d) => (
                        <option key={d.dia_semana} value={d.dia_semana}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => toggleHorarioActivo(h)}
                      className={`badge shrink-0 ${h.activo ? 'bg-grass-100 text-grass-700' : 'bg-ink/10 text-ink/65'}`}
                    >
                      {h.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                ))}
                {horarios.length === 0 && <p className="text-sm text-ink/65">Aún no hay horarios.</p>}
              </div>
            )}
            <form onSubmit={agregarHorario} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                className="input flex-1"
                value={nuevoHorario}
                onChange={(e) => setNuevoHorario(e.target.value)}
                placeholder="Ej. 11:00 am"
              />
              <select
                value={nuevoHorarioDia}
                onChange={(e) => setNuevoHorarioDia(e.target.value)}
                className="input !w-auto"
              >
                <option value="">Todos los días</option>
                {DIAS_SEMANA.map((d) => (
                  <option key={d.dia_semana} value={d.dia_semana}>
                    {d.label}
                  </option>
                ))}
              </select>
              <button disabled={busyHorario} className="btn-secondary shrink-0">
                {busyHorario ? 'Agregando...' : '+ Agregar horario'}
              </button>
            </form>
          </div>
        </>
      )}

      {tab === 'modulos' && profile.role === 'superadmin' && (
        <ModulosTab config={config} />
      )}

      {tab === 'menu' && profile.role === 'superadmin' && (
        <MenuTab config={config} />
      )}

      <CambiarPasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}

const MODULOS_DISPONIBLES = [
  { key: 'devocionales', label: 'Devocionales', icon: '🙏', desc: 'Reflexiones y devocionales para niños' },
  { key: 'asistencia', label: 'Asistencia', icon: '✅', desc: 'Registro de asistencia semanal' },
  { key: 'actividades', label: 'Actividades', icon: '🎨', desc: 'Fotos y actividades de clase' },
  { key: 'bitacora', label: 'Bitácora', icon: '📋', desc: 'Registro del estado del salón y refrigerio' },
  { key: 'planeacion', label: 'Planeación', icon: '📆', desc: 'Calendario y cobertura de clases' },
  { key: 'agenda', label: 'Agenda', icon: '📅', desc: 'Eventos y reuniones del equipo' },
  { key: 'foro', label: 'Comunidad / Foro', icon: '🤝', desc: 'Espacio de comunidad y peticiones de oración' },
  { key: 'drive', label: 'Drive', icon: '📁', desc: 'Archivos compartidos del equipo' },
  { key: 'progreso', label: 'Progreso', icon: '🌱', desc: 'Seguimiento del progreso de cada niño' },
  { key: 'reconocimientos', label: 'Reconocimientos', icon: '⭐', desc: 'Estrellas e insignias de los niños' },
]

function ModulosTab({ config }) {
  // null = nunca configurado = todos activos (igual que el menú)
  const [activos, setActivos] = useState(Array.isArray(config?.modulos_activos) ? config.modulos_activos : MODULOS_KEYS)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')

  useEffect(() => {
    setActivos(Array.isArray(config?.modulos_activos) ? config.modulos_activos : MODULOS_KEYS)
  }, [config?.modulos_activos])

  function toggle(key) {
    setActivos((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
    setOk('')
  }

  async function guardar() {
    if (!config?.id) return
    setSaving(true)
    const { error } = await supabase.from('config_iglesia').update({ modulos_activos: activos, updated_at: new Date().toISOString() }).eq('id', config.id)
    setSaving(false)
    if (error) {
      setOk('No se pudo guardar: ' + error.message)
      return
    }
    setOk('¡Módulos actualizados! El menú se ajusta automáticamente.')
    await refreshConfigIglesia()
  }

  return (
    <div className="card max-w-xl">
      <p className="label mb-1">Módulos activos</p>
      <p className="mb-4 text-sm text-ink/70">
        Activa o desactiva las secciones que usa tu iglesia. Los módulos desactivados se ocultan del menú para todos los usuarios.
      </p>
      <div className="flex flex-col gap-2">
        {MODULOS_DISPONIBLES.map((m) => {
          const on = activos.includes(m.key)
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => toggle(m.key)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${on ? 'bg-sky-50 ring-2 ring-sky-400' : 'bg-ink/5 ring-1 ring-ink/10'}`}
            >
              <span className="text-2xl">{m.icon}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${on ? 'text-sky-700' : 'text-ink/65'}`}>{m.label}</p>
                <p className="text-xs text-ink/65">{m.desc}</p>
              </div>
              <div className={`flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${on ? 'bg-sky-400' : 'bg-ink/20'}`}>
                <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </button>
          )
        })}
      </div>
      {ok && <p className="mt-3 rounded-xl bg-grass-50 px-3 py-2 text-sm font-bold text-grass-600">{ok}</p>}
      <button type="button" onClick={guardar} disabled={saving} className="btn-primary mt-4 justify-center">
        {saving ? 'Guardando...' : '💾 Guardar módulos'}
      </button>
    </div>
  )
}
