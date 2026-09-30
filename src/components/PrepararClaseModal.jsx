import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Modal from './Modal'
import RichTextEditor from './RichTextEditor'
import RichTextView from './RichTextView'
import { PlaneacionClaseForm } from './PlaneacionClaseModal'

const PASOS = [
  { key: 'ensenanza', num: '①', label: 'Enseñanza' },
  { key: 'actividad', num: '②', label: 'Actividad' },
  { key: 'planeacion', num: '③', label: 'Planeación' },
]

const tieneTexto = (html) => !!html && html.replace(/<[^>]*>/g, '').trim().length > 0

/**
 * Preparar la clase de un nivel en una fecha: enseñanza (devocional), actividad y planeación,
 * en una sola ventana con la fecha y el nivel ya puestos.
 */
export default function PrepararClaseModal({ open, onClose, nivel, fecha, userId, onSaved, pasoInicial }) {
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [devos, setDevos] = useState([])
  const [actividad, setActividad] = useState(null)
  const [planeacion, setPlaneacion] = useState(null)
  const [paso, setPaso] = useState('ensenanza')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [formDevo, setFormDevo] = useState({ titulo: '', versiculo: '', contenido: '', paraTodos: false })
  const [formAct, setFormAct] = useState({ titulo: '', descripcion: '', versiculo_clave: '', historia_biblica: '', es_tarea: false, visible_padres: true })
  const [editorKey, setEditorKey] = useState(0)

  const cargar = useCallback(async () => {
    if (!nivel || !fecha) return null
    const [{ data: d }, { data: a }, { data: p }] = await Promise.all([
      supabase.from('devocionales_ninos').select('id, titulo, versiculo, contenido, nivel_id').eq('fecha', fecha).or(`nivel_id.eq.${nivel.id},nivel_id.is.null`),
      supabase.from('actividades').select('*').eq('fecha', fecha).eq('nivel_id', nivel.id).limit(1).maybeSingle(),
      supabase.from('planeacion_clase').select('*').eq('fecha', fecha).eq('nivel_id', nivel.id).maybeSingle(),
    ])
    setDevos(d || [])
    setActividad(a || null)
    setPlaneacion(p || null)
    return { devos: d || [], actividad: a || null, planeacion: p || null }
  }, [nivel, fecha])

  // Al abrir: cargar y empezar en el primer paso pendiente (o el pedido).
  useEffect(() => {
    if (!open) return
    setCargando(true)
    setError('')
    cargar().then((r) => {
      setCargando(false)
      if (!r) return
      const act = r.actividad
      setFormAct({
        titulo: act?.titulo || '',
        descripcion: act?.descripcion || '',
        versiculo_clave: act?.versiculo_clave || r.devos[0]?.versiculo || '',
        historia_biblica: act?.historia_biblica || '',
        es_tarea: act?.es_tarea ?? false,
        visible_padres: act?.visible_padres ?? true,
      })
      setFormDevo({ titulo: '', versiculo: '', contenido: '', paraTodos: false })
      setEditorKey((k) => k + 1)
      const pendiente = !r.devos.length ? 'ensenanza' : !r.actividad ? 'actividad' : !r.planeacion ? 'planeacion' : 'ensenanza'
      setPaso(pasoInicial || pendiente)
    })
  }, [open, cargar, pasoInicial])

  const hecho = { ensenanza: devos.length > 0, actividad: !!actividad, planeacion: !!planeacion }
  const listos = Object.values(hecho).filter(Boolean).length

  function siguiente(recien) {
    const estado = { ...hecho, [recien]: true }
    const prox = PASOS.find((p) => !estado[p.key])
    if (prox) setPaso(prox.key)
  }

  async function guardarDevo(e) {
    e.preventDefault()
    if (!tieneTexto(formDevo.contenido)) return setError('Escribe el contenido de la enseñanza.')
    setBusy(true)
    setError('')
    const { error: err } = await supabase.from('devocionales_ninos').insert({
      titulo: formDevo.titulo,
      versiculo: formDevo.versiculo || null,
      contenido: formDevo.contenido,
      fecha,
      nivel_id: formDevo.paraTodos ? null : nivel.id,
      creado_por: userId,
    })
    setBusy(false)
    if (err) return setError('No se pudo guardar: ' + err.message)
    const r = await cargar()
    if (!actividad && !formAct.versiculo_clave) setFormAct((f) => ({ ...f, versiculo_clave: r?.devos[0]?.versiculo || '' }))
    onSaved?.()
    siguiente('ensenanza')
  }

  async function guardarAct(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const payload = {
      titulo: formAct.titulo,
      descripcion: tieneTexto(formAct.descripcion) ? formAct.descripcion : null,
      versiculo_clave: formAct.versiculo_clave || null,
      historia_biblica: formAct.historia_biblica || null,
      es_tarea: formAct.es_tarea,
      visible_padres: formAct.visible_padres,
    }
    const { error: err } = actividad
      ? await supabase.from('actividades').update(payload).eq('id', actividad.id)
      : await supabase.from('actividades').insert({ ...payload, nivel_id: nivel.id, fecha, docente_id: userId })
    setBusy(false)
    if (err) return setError('No se pudo guardar: ' + err.message)
    await cargar()
    onSaved?.()
    siguiente('actividad')
  }

  async function planeacionGuardada() {
    await cargar()
    onSaved?.()
    siguiente('planeacion')
  }

  const fechaLarga = fecha ? new Date(fecha + 'T00:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }) : ''

  return (
    <Modal open={open} onClose={onClose} wide title={`Preparar clase — ${nivel?.nombre || ''}`}>
      <div className="flex flex-col gap-4">
        <div className="-mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold capitalize text-ink/75">📅 {fechaLarga}</p>
          <p className={`text-sm font-bold ${listos === 3 ? 'text-grass-700' : 'text-ink/65'}`}>{listos === 3 ? '🎉 Clase lista' : `${listos} de 3 listos`}</p>
        </div>

        {/* Pasos */}
        <div className="grid grid-cols-3 gap-2" role="tablist">
          {PASOS.map((p) => {
            const activo = paso === p.key
            return (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={activo}
                onClick={() => { setPaso(p.key); setError('') }}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-sm font-bold transition-colors ${
                  activo ? 'bg-sky-600 text-white shadow-pop' : hecho[p.key] ? 'bg-grass-50 text-grass-800' : 'bg-ink/5 text-ink/75 hover:bg-sky-50'
                }`}
              >
                <span className="text-base">{hecho[p.key] ? '✅' : p.num}</span>
                <span>{p.label}</span>
              </button>
            )
          })}
        </div>

        {listos === 3 && !cargando && (
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-grass-50 px-4 py-3">
            <p className="font-bold text-grass-800">🎉 ¡Clase lista! Enseñanza, actividad y planeación.</p>
            <button type="button" onClick={onClose} className="btn-success !py-2 !text-sm">Cerrar</button>
          </div>
        )}

        {cargando ? (
          <p className="py-10 text-center text-sm font-bold text-ink/65">Cargando…</p>
        ) : paso === 'ensenanza' ? (
          devos.length > 0 ? (
            <div className="flex flex-col gap-3">
              {devos.map((d) => (
                <div key={d.id} className="rounded-2xl bg-sunshine-50/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sunshine-900">🙏 {d.titulo}</p>
                      {d.versiculo && <p className="text-sm italic text-ink/75">📖 {d.versiculo}</p>}
                      {!d.nivel_id && <p className="text-xs font-bold text-ink/65">Para todos los niveles</p>}
                    </div>
                    <button type="button" onClick={() => navigate(`/devocionales/${d.id}`)} className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold text-sky-700 hover:bg-sky-50">
                      Ver / editar
                    </button>
                  </div>
                  {d.contenido && (
                    <div className="mt-2 max-h-28 overflow-hidden text-sm text-ink/75 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
                      <RichTextView html={d.contenido} />
                    </div>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setPaso('actividad')} className="btn-primary justify-center">
                Siguiente: Actividad →
              </button>
            </div>
          ) : (
            <form onSubmit={guardarDevo} className="flex flex-col gap-4">
              <p className="text-sm text-ink/75">La enseñanza (devocional) que verán niños y familias este día.</p>
              <div>
                <label className="label">Título</label>
                <input required className="input" value={formDevo.titulo} onChange={(e) => setFormDevo({ ...formDevo, titulo: e.target.value })} placeholder="Ej. Jonás y el gran pez" />
              </div>
              <div>
                <label className="label">Versículo (opcional)</label>
                <input className="input" value={formDevo.versiculo} onChange={(e) => setFormDevo({ ...formDevo, versiculo: e.target.value })} placeholder="Ej. Jonás 2:9" />
              </div>
              <div>
                <label className="label">Contenido</label>
                <div className="rounded-xl border border-ink/10 px-3 py-2">
                  <RichTextEditor key={`devo-${editorKey}`} value={formDevo.contenido} onChange={(html) => setFormDevo((f) => ({ ...f, contenido: html }))} placeholder="La reflexión para los niños…" />
                </div>
              </div>
              <div>
                <label className="label">¿Para quién?</label>
                <div className="flex gap-2">
                  {[[false, `Solo ${nivel?.nombre || 'este nivel'}`], [true, 'Todos los niveles']].map(([v, t]) => (
                    <button key={String(v)} type="button" onClick={() => setFormDevo({ ...formDevo, paraTodos: v })} className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${formDevo.paraTodos === v ? 'bg-sky-600 text-white' : 'bg-ink/5'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-ink/65">Imagen, video y archivos se agregan después desde Devocionales.</p>
              {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
              <button disabled={busy} className="btn-primary justify-center">{busy ? 'Guardando...' : 'Guardar y seguir →'}</button>
            </form>
          )
        ) : paso === 'actividad' ? (
          <form onSubmit={guardarAct} className="flex flex-col gap-4">
            <p className="text-sm text-ink/75">Lo que harán los niños en clase (manualidad, juego, tarea).</p>
            <div>
              <label className="label">Título</label>
              <input required className="input" value={formAct.titulo} onChange={(e) => setFormAct({ ...formAct, titulo: e.target.value })} placeholder="Ej. Pez de papel con versículo" />
            </div>
            <div>
              <label className="label">Descripción (opcional)</label>
              <div className="rounded-xl border border-ink/10 px-3 py-2">
                <RichTextEditor key={`act-${editorKey}-${actividad?.id || 'nueva'}`} value={formAct.descripcion} onChange={(html) => setFormAct((f) => ({ ...f, descripcion: html }))} placeholder="Materiales y pasos…" compact />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Versículo clave</label>
                <input className="input" value={formAct.versiculo_clave} onChange={(e) => setFormAct({ ...formAct, versiculo_clave: e.target.value })} />
              </div>
              <div>
                <label className="label">Historia bíblica</label>
                <input className="input" value={formAct.historia_biblica} onChange={(e) => setFormAct({ ...formAct, historia_biblica: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              {[[false, 'Solo informativa'], [true, '📝 Es una tarea']].map(([v, t]) => (
                <button key={String(v)} type="button" onClick={() => setFormAct({ ...formAct, es_tarea: v })} className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${formAct.es_tarea === v ? 'bg-sky-600 text-white' : 'bg-ink/5'}`}>
                  {t}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-ink/80">
              <input type="checkbox" checked={formAct.visible_padres} onChange={(e) => setFormAct({ ...formAct, visible_padres: e.target.checked })} className="h-5 w-5 accent-sky-500" />
              Visible para los padres
            </label>
            <p className="text-xs text-ink/65">Fotos y archivos se agregan después desde Actividades.</p>
            {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
            <button disabled={busy} className="btn-primary justify-center">{busy ? 'Guardando...' : actividad ? 'Guardar cambios →' : 'Guardar y seguir →'}</button>
          </form>
        ) : (
          <PlaneacionClaseForm
            key={planeacion?.id || 'nueva'}
            nivel={nivel}
            fecha={fecha}
            planeacion={planeacion}
            userId={userId}
            onSaved={planeacionGuardada}
            textoBoton="Guardar planeación"
            datosGuia={{
              versiculo: actividad?.versiculo_clave || devos[0]?.versiculo || '',
              historia: actividad?.historia_biblica || devos[0]?.titulo || '',
              actividad: actividad?.titulo || '',
            }}
          />
        )}

      </div>
    </Modal>
  )
}
