import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'
import ActivityFiles from '../../components/ActivityFiles'
import CalendarioAgenda from '../../components/CalendarioAgenda'
import VistaToggle from '../../components/VistaToggle'

const VISTA_OPTIONS = [
  { value: 'lista', label: '☰ Lista' },
  { value: 'calendario', label: '🗓️ Plan del mes' },
]

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function ActividadesAdmin() {
  const { user } = useAuth()
  const [niveles, setNiveles] = useState(null)
  const [nivelId, setNivelId] = useState('')
  const [actividades, setActividades] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ titulo: '', descripcion: '', fecha: hoyISO(), versiculo_clave: '', historia_biblica: '', visible_padres: true })
  const [archivos, setArchivos] = useState([])
  const [previews, setPreviews] = useState([])
  const [busy, setBusy] = useState(false)
  const [progreso, setProgreso] = useState('')
  const [error, setError] = useState('')
  const [vista, setVista] = useState('lista')
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    supabase
      .from('niveles')
      .select('*')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => {
        setNiveles(data || [])
        setNivelId((data || [])[0]?.id || '')
      })
  }, [])

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
    setEditing(null)
    setForm({ titulo: '', descripcion: '', fecha: selectedDay || hoyISO(), versiculo_clave: '', historia_biblica: '', visible_padres: true })
    setArchivos([])
    setPreviews([])
    setError('')
    setModalOpen(true)
  }

  function openEdit(actividad) {
    setEditing(actividad)
    setForm({
      titulo: actividad.titulo,
      descripcion: actividad.descripcion || '',
      fecha: actividad.fecha,
      versiculo_clave: actividad.versiculo_clave || '',
      historia_biblica: actividad.historia_biblica || '',
      visible_padres: actividad.visible_padres ?? true,
    })
    setArchivos([])
    setPreviews([])
    setError('')
    setModalOpen(true)
  }

  function handleArchivos(files) {
    const lista = Array.from(files)
    setArchivos(lista)
    setPreviews(lista.filter((f) => f.type.startsWith('image/')).map((f) => URL.createObjectURL(f)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    const payload = {
      titulo: form.titulo,
      descripcion: form.descripcion,
      fecha: form.fecha,
      versiculo_clave: form.versiculo_clave || null,
      historia_biblica: form.historia_biblica || null,
      visible_padres: form.visible_padres,
    }

    let actividadId = editing?.id
    if (editing) {
      const { error: updError } = await supabase.from('actividades').update(payload).eq('id', editing.id)
      if (updError) {
        setError(updError.message)
        setBusy(false)
        return
      }
    } else {
      const { data: actividad, error: actError } = await supabase
        .from('actividades')
        .insert({ ...payload, nivel_id: nivelId, docente_id: user.id })
        .select()
        .single()
      if (actError) {
        setError(actError.message)
        setBusy(false)
        return
      }
      actividadId = actividad.id
    }

    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i]
      setProgreso(`Subiendo ${i + 1} de ${archivos.length}...`)
      const path = `${nivelId}/${actividadId}/${Date.now()}-${file.name}`
      const { error: upError } = await supabase.storage.from('actividades').upload(path, file)
      if (!upError) {
        await supabase.from('actividad_archivos').insert({
          actividad_id: actividadId,
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

  async function eliminar(id) {
    await supabase.from('actividades').delete().eq('id', id)
    load()
  }

  if (!niveles) return <Spinner />
  if (niveles.length === 0) return <p className="card text-ink/50">Todavía no hay clases creadas.</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Actividades 🎨</h1>
          <p className="text-ink/50">Lo que se hace en cada clase — fotos, versículo e historia bíblica</p>
        </div>
        <div className="flex items-center gap-3">
          <VistaToggle vista={vista} onChange={setVista} options={VISTA_OPTIONS} />
          <button className="btn-primary" onClick={openNew}>
            + Nueva actividad
          </button>
        </div>
      </div>

      <select
        className="input max-w-xs"
        value={nivelId}
        onChange={(e) => {
          setNivelId(e.target.value)
          setSelectedDay(null)
        }}
      >
        {niveles.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>

      {!actividades ? (
        <Spinner />
      ) : vista === 'calendario' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CalendarioAgenda eventos={actividades} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
          <div className="flex flex-col gap-4">
            {selectedDay && (
              <button onClick={() => setSelectedDay(null)} className="self-start text-sm font-bold text-sky-500 hover:underline">
                ← Ver todas las actividades
              </button>
            )}
            {(selectedDay ? actividades.filter((a) => a.fecha === selectedDay) : actividades).map((a, i) => (
              <ActividadCard key={a.id} a={a} i={i} onEdit={openEdit} onDelete={eliminar} />
            ))}
            {(selectedDay ? actividades.filter((a) => a.fecha === selectedDay) : actividades).length === 0 && (
              <p className="card text-ink/50">{selectedDay ? 'Nada planeado este día.' : 'Aún no hay actividades para esta clase.'}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {actividades.map((a, i) => (
            <ActividadCard key={a.id} a={a} i={i} onEdit={openEdit} onDelete={eliminar} />
          ))}
          {actividades.length === 0 && <p className="card text-ink/50">Aún no hay actividades para esta clase.</p>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar actividad' : 'Nueva actividad'}>
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
            <label className="label">{editing ? 'Agregar más archivos (opcional)' : 'Archivos (fotos, PDFs, etc.)'}</label>
            <input type="file" multiple className="input" onChange={(e) => handleArchivos(e.target.files)} />
            {previews.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {previews.map((src, i) => (
                  <img key={i} src={src} alt="" className="aspect-square w-full rounded-xl object-cover" />
                ))}
              </div>
            )}
            {archivos.length > 0 && <p className="mt-1 text-sm text-ink/50">{archivos.length} archivo(s) seleccionado(s)</p>}
            {editing && <ActivityFiles archivos={editing.actividad_archivos} />}
          </div>
          {progreso && <p className="text-sm font-bold text-sky-600">{progreso}</p>}
          {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : editing ? 'Guardar cambios' : 'Publicar actividad'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

function ActividadCard({ a, i, onEdit, onDelete }) {
  return (
    <div
      className="card animate-pop-in transition-transform duration-200 hover:-translate-y-0.5"
      style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold">{a.titulo}</h3>
          {a.visible_padres === false && <span className="badge bg-grape-100 text-grape-700">🙈 Solo equipo</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink/40">{a.fecha}</span>
          <button onClick={() => onEdit(a)} className="text-lg text-ink/30 hover:text-sky-500">
            ✏️
          </button>
          <button onClick={() => onDelete(a.id)} className="text-lg text-ink/30 hover:text-coral-500">
            🗑️
          </button>
        </div>
      </div>
      {a.descripcion && <p className="mt-1 text-ink/70">{a.descripcion}</p>}
      {(a.versiculo_clave || a.historia_biblica) && (
        <div className="mt-3 rounded-2xl border-l-4 border-sunshine-300 bg-sunshine-50 p-3">
          {a.versiculo_clave && <p className="italic text-ink/80">📖 "{a.versiculo_clave}"</p>}
          {a.historia_biblica && <p className="mt-1 text-sm font-bold text-sunshine-700">Historia: {a.historia_biblica}</p>}
        </div>
      )}
      <ActivityFiles archivos={a.actividad_archivos} />
      <p className="mt-3 text-sm font-bold text-coral-500">{a.actividad_reacciones?.length || 0} reacciones ❤️</p>
    </div>
  )
}
