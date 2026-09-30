import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { urlArchivo, useArchivosFirmados } from '../lib/archivos'
import { fechaCorta } from '../lib/fechas'
import Emo from './ui/Emo'

// PQR: peticiones, quejas, reclamos, sugerencias y felicitaciones.
// Cada persona ve solo las suyas; solo los revisores (tabla pqr_revisores) ven todas y responden.

export const TIPOS_PQR = [
  { v: 'sugerencia', t: 'Sugerencia', icon: '💡', ayuda: 'Una idea para mejorar' },
  { v: 'peticion', t: 'Petición', icon: '🙋', ayuda: 'Algo que necesitas' },
  { v: 'queja', t: 'Queja', icon: '😕', ayuda: 'Algo que no te gustó' },
  { v: 'reclamo', t: 'Reclamo', icon: '⚠️', ayuda: 'Algo que no funcionó bien' },
  { v: 'felicitacion', t: 'Felicitación', icon: '🎉', ayuda: 'Algo que te gustó' },
]
const TIPO = Object.fromEntries(TIPOS_PQR.map((x) => [x.v, x]))

export const ESTADOS_PQR = {
  nuevo: { t: 'Recibido', c: 'bg-sky-100 text-sky-800' },
  en_revision: { t: 'En revisión', c: 'bg-sunshine-100 text-sunshine-800' },
  respondido: { t: 'Respondido', c: 'bg-grass-100 text-grass-800' },
  cerrado: { t: 'Cerrado', c: 'bg-ink/5 text-ink/70' },
}

const ROL = { superadmin: 'Admin', admin: 'Admin', coordinador: 'Coordinador', docente: 'Docente', padre: 'Padre/madre' }
const MAX_ARCHIVOS = 5
const MAX_MB = 20
const ACEPTA = 'image/*,video/*,.pdf,.doc,.docx'

/** ¿El usuario actual revisa los PQR? (Solo Gisella.) */
export function useEsRevisorPqr() {
  const { user } = useAuth()
  const [es, setEs] = useState(false)
  useEffect(() => {
    if (!user?.id) return
    supabase.from('pqr_revisores').select('user_id').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => setEs(!error && !!data))
  }, [user?.id])
  return es
}

function Evidencias({ archivos }) {
  const lista = (archivos || []).map((a) => ({ ...a, bucket: 'pqr' }))
  useArchivosFirmados(lista)
  if (lista.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {lista.map((a) => {
        const url = urlArchivo('pqr', a.storage_path)
        const esImg = (a.tipo || '').startsWith('image/')
        return (
          <a
            key={a.id}
            href={url || undefined}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 text-xs font-bold text-sky-800 ring-1 ring-ink/10 hover:bg-sky-50"
          >
            {esImg && url ? <img src={url} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <Emo e="📎" />}
            <span className="max-w-[10rem] truncate">{a.nombre}</span>
          </a>
        )
      })}
    </div>
  )
}

/** Formulario para enviar un PQR con evidencia. */
export function PqrFormulario({ onEnviado }) {
  const { user } = useAuth()
  const [tipo, setTipo] = useState('sugerencia')
  const [asunto, setAsunto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [archivos, setArchivos] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const inputRef = useRef(null)

  function elegir(e) {
    const nuevos = Array.from(e.target.files || [])
    e.target.value = ''
    const grandes = nuevos.filter((f) => f.size > MAX_MB * 1024 * 1024)
    const buenos = nuevos.filter((f) => f.size <= MAX_MB * 1024 * 1024)
    const total = [...archivos, ...buenos].slice(0, MAX_ARCHIVOS)
    setArchivos(total)
    setError(
      grandes.length
        ? `Pesan más de ${MAX_MB} MB: ${grandes.map((f) => f.name).join(', ')}.`
        : archivos.length + buenos.length > MAX_ARCHIVOS ? `Máximo ${MAX_ARCHIVOS} archivos.` : '',
    )
  }

  async function enviar(e) {
    e.preventDefault()
    if (!asunto.trim() || !descripcion.trim()) return setError('Escribe el asunto y cuéntanos qué pasó.')
    setBusy(true)
    setError('')
    const { data: fila, error: insError } = await supabase
      .from('pqr')
      .insert({ autor_id: user.id, tipo, asunto: asunto.trim(), descripcion: descripcion.trim() })
      .select('id')
      .single()
    if (insError) {
      setBusy(false)
      return setError('No se pudo enviar: ' + insError.message)
    }
    const fallidos = []
    const subidos = []
    await Promise.all(archivos.map(async (f, i) => {
      const limpio = f.name.replace(/[^\w.-]+/g, '_')
      const path = `${user.id}/${fila.id}/${Date.now()}-${i}-${limpio}`
      const { error: upError } = await supabase.storage.from('pqr').upload(path, f, { contentType: f.type || undefined })
      if (upError) fallidos.push(f.name)
      else subidos.push({ pqr_id: fila.id, storage_path: path, nombre: f.name, tipo: f.type || null, tamano: f.size })
    }))
    if (subidos.length) await supabase.from('pqr_archivos').insert(subidos)
    setBusy(false)
    setTipo('sugerencia')
    setAsunto('')
    setDescripcion('')
    setArchivos([])
    setOk(true)
    if (fallidos.length) setError(`Se envió, pero no se pudieron subir: ${fallidos.join(', ')}.`)
    onEnviado?.()
  }

  return (
    <form onSubmit={enviar} className="card flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-bold">Cuéntanos</h3>
        <p className="text-sm text-ink/70">Lo recibe directamente el equipo que desarrolla la plataforma. Te responderemos aquí mismo.</p>
      </div>

      <fieldset>
        <legend className="label">¿Qué quieres enviar?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {TIPOS_PQR.map((x) => (
            <button
              key={x.v}
              type="button"
              aria-pressed={tipo === x.v}
              onClick={() => setTipo(x.v)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2.5 text-center text-sm font-bold transition-colors ${
                tipo === x.v ? 'bg-sky-50 text-sky-800 ring-2 ring-sky-600' : 'bg-white text-ink/80 ring-1 ring-ink/10 hover:bg-sky-50'
              }`}
            >
              <span className="text-xl" aria-hidden="true">{x.icon}</span>
              {x.t}
              <span className="text-xs font-normal text-ink/65">{x.ayuda}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="pqr-asunto">Asunto</label>
        <input id="pqr-asunto" className="input" maxLength={120} value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Ej. No puedo subir fotos en Actividades" />
      </div>
      <div>
        <label className="label" htmlFor="pqr-desc">Descripción</label>
        <textarea id="pqr-desc" className="input" rows={4} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Qué pasó, en qué pantalla, qué esperabas que pasara…" />
      </div>

      <div>
        <p className="label">Evidencia (opcional)</p>
        <input ref={inputRef} type="file" multiple accept={ACEPTA} className="hidden" onChange={elegir} />
        {archivos.length > 0 && (
          <ul className="mb-2 flex flex-col gap-1.5">
            {archivos.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-xl bg-sky-50 px-3 py-1.5 text-sm">
                <span className="min-w-0 truncate font-bold"><Emo e="📎" /> {f.name}</span>
                <button type="button" onClick={() => setArchivos((a) => a.filter((_, j) => j !== i))} className="shrink-0 text-sm font-bold text-coral-600">
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
        {archivos.length < MAX_ARCHIVOS && (
          <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary !py-2 !text-sm">
            <Emo e="📎" /> {archivos.length ? 'Agregar más' : 'Adjuntar capturas, fotos o archivos'}
          </button>
        )}
        <p className="mt-1 text-xs text-ink/65">Hasta {MAX_ARCHIVOS} archivos de {MAX_MB} MB. Solo los ve el equipo que revisa.</p>
      </div>

      {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-700">{error}</p>}
      {ok && !error && <p className="rounded-xl bg-grass-50 px-3 py-2 text-sm font-bold text-grass-800">¡Gracias! Lo recibimos. Puedes ver cómo va abajo, en "Mis envíos".</p>}

      <button type="submit" disabled={busy} className="btn-primary justify-center">
        {busy ? 'Enviando…' : 'Enviar'}
      </button>
    </form>
  )
}

/** Lo que yo envié, con estado y respuesta. */
export function MisPqr({ recargar }) {
  const { user } = useAuth()
  const [lista, setLista] = useState(null)
  useEffect(() => {
    if (!user?.id) return
    supabase.from('pqr').select('*, pqr_archivos(*)').eq('autor_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setLista(data || []))
  }, [user?.id, recargar])

  if (!lista) return null
  return (
    <section className="flex flex-col gap-3" aria-labelledby="mis-pqr">
      <h3 id="mis-pqr" className="text-lg font-bold">Mis envíos</h3>
      {lista.length === 0 ? (
        <p className="card text-sm text-ink/70">Aún no has enviado nada.</p>
      ) : (
        lista.map((p) => (
          <article key={p.id} className="card flex flex-col gap-2 !p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold">{TIPO[p.tipo]?.icon} {TIPO[p.tipo]?.t}</span>
              <span className={`badge ${ESTADOS_PQR[p.estado]?.c}`}>{ESTADOS_PQR[p.estado]?.t}</span>
              <span className="ml-auto text-xs text-ink/65">{fechaCorta(p.created_at.slice(0, 10))}</span>
            </div>
            <p className="font-bold">{p.asunto}</p>
            <p className="whitespace-pre-line text-sm text-ink/75">{p.descripcion}</p>
            <Evidencias archivos={p.pqr_archivos} />
            {p.respuesta && (
              <div className="rounded-xl bg-grass-50 px-3 py-2">
                <p className="text-xs font-extrabold uppercase text-grass-800">Respuesta</p>
                <p className="whitespace-pre-line text-sm">{p.respuesta}</p>
              </div>
            )}
          </article>
        ))
      )}
    </section>
  )
}

/** Bandeja del revisor: todos los PQR, filtrar por estado, responder. */
export function BandejaPqr({ onCambio }) {
  const [lista, setLista] = useState(null)
  const [filtro, setFiltro] = useState('abiertos')
  const [abierto, setAbierto] = useState(null)

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('pqr')
      .select('*, autor:profiles(nombre_completo, role), pqr_archivos(*)')
      .order('created_at', { ascending: false })
    setLista(data || [])
  }, [])
  useEffect(() => { cargar() }, [cargar])

  if (!lista) return <div className="card h-40 animate-pulse bg-white/60" aria-busy="true" />
  const visibles = lista.filter((p) => (filtro === 'abiertos' ? ['nuevo', 'en_revision'].includes(p.estado) : filtro === 'todos' ? true : p.estado === filtro))
  const nuevos = lista.filter((p) => p.estado === 'nuevo').length

  return (
    <section className="flex flex-col gap-3" aria-labelledby="bandeja-pqr">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="bandeja-pqr" className="text-lg font-bold">PQR recibidos {nuevos > 0 && <span className="badge bg-coral-600 text-white">{nuevos} nuevos</span>}</h3>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar">
          {[['abiertos', 'Por atender'], ['respondido', 'Respondidos'], ['cerrado', 'Cerrados'], ['todos', 'Todos']].map(([v, t]) => (
            <button key={v} type="button" aria-pressed={filtro === v} onClick={() => setFiltro(v)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filtro === v ? 'bg-sky-600 text-white' : 'bg-white text-ink/75 ring-1 ring-ink/10'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {visibles.length === 0 && <p className="card text-sm text-ink/70">No hay nada aquí.</p>}
      {visibles.map((p) => (
        <FilaBandeja key={p.id} p={p} abierto={abierto === p.id} onToggle={() => setAbierto(abierto === p.id ? null : p.id)} onGuardado={() => { cargar(); onCambio?.() }} />
      ))}
    </section>
  )
}

function FilaBandeja({ p, abierto, onToggle, onGuardado }) {
  const [respuesta, setRespuesta] = useState(p.respuesta || '')
  const [estado, setEstado] = useState(p.estado)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function guardar(nuevoEstado) {
    setBusy(true)
    setError('')
    const est = nuevoEstado || estado
    const { error: e } = await supabase
      .from('pqr')
      .update({ respuesta: respuesta.trim() || null, estado: est, respondido_at: respuesta.trim() && est === 'respondido' ? new Date().toISOString() : p.respondido_at })
      .eq('id', p.id)
    setBusy(false)
    if (e) return setError(e.message)
    setEstado(est)
    onGuardado()
  }

  return (
    <article className={`card flex flex-col gap-2 !p-4 ${p.estado === 'nuevo' ? 'ring-2 ring-sky-300' : ''}`}>
      <button type="button" onClick={onToggle} aria-expanded={abierto} className="flex flex-col gap-1 text-left">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">{TIPO[p.tipo]?.icon} {TIPO[p.tipo]?.t}</span>
          <span className={`badge ${ESTADOS_PQR[p.estado]?.c}`}>{ESTADOS_PQR[p.estado]?.t}</span>
          {p.pqr_archivos?.length > 0 && <span className="text-xs text-ink/65"><Emo e="📎" /> {p.pqr_archivos.length}</span>}
          <span className="ml-auto text-xs text-ink/65">{fechaCorta(p.created_at.slice(0, 10))}</span>
        </span>
        <span className="font-bold">{p.asunto}</span>
        <span className="text-xs text-ink/70">{p.autor?.nombre_completo} · {ROL[p.autor?.role] || p.autor?.role}</span>
      </button>

      {abierto && (
        <div className="flex flex-col gap-3 border-t border-ink/5 pt-3">
          <p className="whitespace-pre-line text-sm text-ink/80">{p.descripcion}</p>
          <Evidencias archivos={p.pqr_archivos} />
          <div>
            <label className="label" htmlFor={`resp-${p.id}`}>Respuesta (la verá quien lo envió)</label>
            <textarea id={`resp-${p.id}`} className="input" rows={3} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />
          </div>
          {error && <p className="text-sm font-bold text-coral-700">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || !respuesta.trim()} onClick={() => guardar('respondido')} className="btn-primary !py-2 !text-sm">Responder</button>
            {estado === 'nuevo' && <button type="button" disabled={busy} onClick={() => guardar('en_revision')} className="btn-secondary !py-2 !text-sm">Marcar en revisión</button>}
            {estado !== 'cerrado' && <button type="button" disabled={busy} onClick={() => guardar('cerrado')} className="btn-secondary !py-2 !text-sm">Cerrar</button>}
          </div>
        </div>
      )}
    </article>
  )
}
