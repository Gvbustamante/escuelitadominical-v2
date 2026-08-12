import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useMisClases } from '../../lib/useMisClases'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'
import ActivityFiles from '../../components/ActivityFiles'
import TareaEntregas from '../../components/TareaEntregas'
import ActividadFila from '../../components/ActividadFila'
import VistaToggle from '../../components/VistaToggle'

const VISTA_OPTIONS = [
  { value: 'tarjetas', label: '🔲 Tarjetas' },
  { value: 'compacta', label: '📃 Compacta' },
]

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Actividades() {
  const { user } = useAuth()
  const { clases, nivelId, setNivelId } = useMisClases()
  const [actividades, setActividades] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    fecha: hoyISO(),
    versiculo_clave: '',
    historia_biblica: '',
    visible_padres: true,
    es_tarea: false,
    enlace_externo: '',
  })
  const [archivos, setArchivos] = useState([])
  const [busy, setBusy] = useState(false)
  const [progreso, setProgreso] = useState('')
  const [error, setError] = useState('')
  const [tareaActividad, setTareaActividad] = useState(null)
  const [vista, setVista] = useState('tarjetas')

  const load = useCallback(async () => {
    if (!nivelId) return
    const { data } = await supabase
      .from('actividades')
      .select('*, actividad_archivos(*), actividad_reacciones(*)')
      .eq('nivel_id', nivelId)
      .order('fecha', { ascending: false })
    setActividades(data || [])
  }, [nivelId])

  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setForm({
      titulo: '',
      descripcion: '',
      fecha: hoyISO(),
      versiculo_clave: '',
      historia_biblica: '',
      visible_padres: true,
      es_tarea: false,
      enlace_externo: '',
    })
    setArchivos([])
    setError('')
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    const { data: actividad, error: actError } = await supabase
      .from('actividades')
      .insert({
        nivel_id: nivelId,
        docente_id: user.id,
        titulo: form.titulo,
        descripcion: form.descripcion,
        fecha: form.fecha,
        versiculo_clave: form.versiculo_clave || null,
        historia_biblica: form.historia_biblica || null,
        visible_padres: form.visible_padres,
        es_tarea: form.es_tarea,
        enlace_externo: form.enlace_externo || null,
      })
      .select()
      .single()

    if (actError) {
      setError(actError.message)
      setBusy(false)
      return
    }

    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i]
      setProgreso(`Subiendo ${i + 1} de ${archivos.length}...`)
      const path = `${nivelId}/${actividad.id}/${Date.now()}-${file.name}`
      const { error: upError } = await supabase.storage.from('actividades').upload(path, file)
      if (!upError) {
        await supabase.from('actividad_archivos').insert({
          actividad_id: actividad.id,
          storage_path: path,
          nombre_archivo: file.name,
          tipo: file.type,
        })
      }
    }

    setProgreso('')
    setBusy(false)
    setModalOpen(false)
    load()
  }

  if (!clases) return <Spinner />
  if (clases.length === 0) return <p className="card text-ink/50">No tienes clases asignadas todavía.</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Actividades 🎨</h1>
          <p className="text-ink/50">Comparte lo que hicieron en clase</p>
        </div>
        <div className="flex items-center gap-3">
          <VistaToggle vista={vista} onChange={setVista} options={VISTA_OPTIONS} />
          <button className="btn-primary" onClick={openNew}>
            + Nueva actividad
          </button>
        </div>
      </div>

      <select className="input max-w-xs" value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
        {clases.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>

      {!actividades ? (
        <Spinner />
      ) : vista === 'compacta' ? (
        <div className="card divide-y divide-ink/5 !p-0">
          {actividades.map((a) => (
            <ActividadFila key={a.id} a={a} onVerEntregas={setTareaActividad} />
          ))}
          {actividades.length === 0 && <p className="p-6 text-center text-ink/50">Aún no hay actividades para esta clase.</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {actividades.map((a, i) => (
            <div
              key={a.id}
              className="card animate-pop-in transition-transform duration-200 hover:-translate-y-0.5"
              style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{a.titulo}</h3>
                  {a.visible_padres === false && <span className="badge bg-grape-100 text-grape-700">🙈 Solo equipo</span>}
                  {a.es_tarea && <span className="badge bg-sky-100 text-sky-700">📝 Tarea</span>}
                </div>
                <span className="text-sm text-ink/40">{a.fecha}</span>
              </div>
              {a.descripcion && <p className="mt-1 text-ink/70">{a.descripcion}</p>}
              {(a.versiculo_clave || a.historia_biblica) && (
                <div className="mt-3 rounded-2xl border-l-4 border-sunshine-300 bg-sunshine-50 p-3">
                  {a.versiculo_clave && <p className="italic text-ink/80">📖 "{a.versiculo_clave}"</p>}
                  {a.historia_biblica && <p className="mt-1 text-sm font-bold text-sunshine-700">Historia: {a.historia_biblica}</p>}
                </div>
              )}
              <ActivityFiles archivos={a.actividad_archivos} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-coral-500">{a.actividad_reacciones?.length || 0} reacciones ❤️</p>
                {a.es_tarea && (
                  <button className="btn-secondary !py-1 !px-3 !text-xs" onClick={() => setTareaActividad(a)}>
                    📋 Ver entregas
                  </button>
                )}
              </div>
            </div>
          ))}
          {actividades.length === 0 && <p className="card text-ink/50">Aún no hay actividades para esta clase.</p>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva actividad">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Título</label>
            <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input"
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
          <div>
            <label className="label">Versículo clave (opcional)</label>
            <input
              className="input"
              placeholder='Ej. "Todo lo puedo en Cristo..." — Filipenses 4:13'
              value={form.versiculo_clave}
              onChange={(e) => setForm({ ...form, versiculo_clave: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Historia bíblica que aprendieron (opcional)</label>
            <input
              className="input"
              placeholder="Ej. David y Goliat"
              value={form.historia_biblica}
              onChange={(e) => setForm({ ...form, historia_biblica: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Quién la puede ver</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, visible_padres: true })}
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${form.visible_padres ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
              >
                👀 Visible para padres
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, visible_padres: false })}
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${!form.visible_padres ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
              >
                🙈 Solo el equipo
              </button>
            </div>
          </div>
          <div>
            <label className="label">¿Pide una tarea?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, es_tarea: false })}
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${!form.es_tarea ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
              >
                Solo informativa
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, es_tarea: true })}
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${form.es_tarea ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
              >
                📝 Es una tarea
              </button>
            </div>
            {form.es_tarea && (
              <p className="mt-1 text-xs text-ink/40">
                Cada niño del nivel podrá entregar su evidencia desde la cuenta de su padre/madre.
              </p>
            )}
          </div>
          {form.es_tarea && (
            <div>
              <label className="label">Enlace externo (opcional)</label>
              <input
                type="url"
                className="input"
                placeholder="https://... (video, formulario, etc.)"
                value={form.enlace_externo}
                onChange={(e) => setForm({ ...form, enlace_externo: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="label">Archivos (fotos, PDFs, etc.)</label>
            <input
              type="file"
              multiple
              className="input"
              onChange={(e) => setArchivos(Array.from(e.target.files))}
            />
            {archivos.length > 0 && <p className="mt-1 text-sm text-ink/50">{archivos.length} archivo(s) seleccionado(s)</p>}
          </div>
          {progreso && <p className="text-sm font-bold text-sky-600">{progreso}</p>}
          {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : 'Publicar actividad'}
          </button>
        </form>
      </Modal>

      <TareaEntregas actividad={tareaActividad} open={!!tareaActividad} onClose={() => setTareaActividad(null)} />
    </div>
  )
}
