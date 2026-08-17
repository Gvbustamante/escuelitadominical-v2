import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { coincide } from '../../lib/busqueda'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'
import ActivityFiles from '../../components/ActivityFiles'
import TareaEntregas from '../../components/TareaEntregas'
import ActividadFila from '../../components/ActividadFila'
import RichTextEditor from '../../components/RichTextEditor'
import MultiFilePicker from '../../components/MultiFilePicker'
import DrivePicker from '../../components/DrivePicker'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function formVacio(fecha) {
  return {
    titulo: '',
    descripcion: '',
    fecha: fecha || hoyISO(),
    versiculo_clave: '',
    historia_biblica: '',
    visible_padres: true,
    es_tarea: false,
    enlace_externo: '',
  }
}

export default function ActividadesAdmin() {
  const { user } = useAuth()
  const [niveles, setNiveles] = useState(null)
  const [nivelId, setNivelId] = useState('')
  const [audiencia, setAudiencia] = useState('ninos')
  const [actividades, setActividades] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(formVacio())
  const [archivos, setArchivos] = useState([])
  const [busy, setBusy] = useState(false)
  const [progreso, setProgreso] = useState('')
  const [error, setError] = useState('')
  const [tareaActividad, setTareaActividad] = useState(null)
  const [drivePickerOpen, setDrivePickerOpen] = useState(false)
  const [archivosDrive, setArchivosDrive] = useState([]) // archivos elegidos del drive

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
    if (audiencia === 'docentes') {
      const { data } = await supabase
        .from('actividades')
        .select('*, actividad_archivos(*), actividad_reacciones(*)')
        .eq('audiencia', 'docentes')
        .order('fecha', { ascending: false })
      setActividades(data || [])
      return
    }
    if (!nivelId) return
    const { data } = await supabase
      .from('actividades')
      .select('*, actividad_archivos(*), actividad_reacciones(*)')
      .eq('nivel_id', nivelId)
      .eq('audiencia', 'ninos')
      .order('fecha', { ascending: false })
    setActividades(data || [])
  }, [nivelId, audiencia])

  useEffect(() => {
    load()
  }, [load])

  function cambiarAudiencia(nueva) {
    setAudiencia(nueva)
    setActividades(null)
  }

  function openNew() {
    setEditing(null)
    setForm(formVacio())
    setArchivos([])
    setArchivosDrive([])
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
      es_tarea: actividad.es_tarea ?? false,
      enlace_externo: actividad.enlace_externo || '',
    })
    setArchivos([])
    setArchivosDrive([])
    setError('')
    setModalOpen(true)
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
      visible_padres: audiencia === 'docentes' ? false : form.visible_padres,
      es_tarea: form.es_tarea,
      enlace_externo: form.enlace_externo || null,
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
        .insert({
          ...payload,
          nivel_id: audiencia === 'docentes' ? null : nivelId,
          audiencia,
          docente_id: user.id,
        })
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
      const path = `${nivelId || 'equipo-docente'}/${actividadId}/${Date.now()}-${file.name}`
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

    // Vincular archivos elegidos del Drive (ya están subidos, solo crear registro)
    for (const df of archivosDrive) {
      await supabase.from('actividad_archivos').insert({
        actividad_id: actividadId,
        storage_path: df.storage_path,
        nombre_archivo: df.nombre,
        tipo: df.tipo,
        bucket: 'drive',
      })
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

  const actividadesFiltradas = (actividades || []).filter((a) =>
    coincide(busqueda, a.titulo, a.descripcion, a.versiculo_clave, a.historia_biblica),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Actividades 🎨</h1>
          <p className="text-ink/50">Lo que se hace en cada clase — fotos, versículo e historia bíblica</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          + Nueva actividad
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cambiarAudiencia('ninos')}
            className={`rounded-full px-4 py-2 text-sm font-bold ${audiencia === 'ninos' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50 border-2 border-ink/10'}`}
          >
            🧒 Niños
          </button>
          <button
            type="button"
            onClick={() => cambiarAudiencia('docentes')}
            className={`rounded-full px-4 py-2 text-sm font-bold ${audiencia === 'docentes' ? 'bg-grape-400 text-white' : 'bg-white text-ink/50 border-2 border-ink/10'}`}
          >
            🍎 Equipo docente
          </button>
        </div>
        {audiencia === 'ninos' && (
          <select className="input max-w-xs" value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
            {niveles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        )}
      </div>
      {audiencia === 'docentes' && (
        <p className="-mt-3 text-sm text-ink/50">Comunicados, capacitaciones o tareas dirigidas a todo el equipo docente, no a una clase en particular.</p>
      )}

      <input
        className="input max-w-xs"
        placeholder="Buscar actividad..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {!actividades ? (
        <Spinner />
      ) : (
        <div className="card divide-y divide-ink/5 !p-0">
          {actividadesFiltradas.map((a) => (
            <ActividadFila key={a.id} a={a} onEdit={openEdit} onDelete={eliminar} onVerEntregas={setTareaActividad} />
          ))}
          {actividades.length === 0 && <p className="p-6 text-center text-ink/50">Aún no hay actividades para esta clase.</p>}
          {actividades.length > 0 && actividadesFiltradas.length === 0 && (
            <p className="p-6 text-center text-ink/50">No hay actividades que coincidan con "{busqueda}".</p>
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar actividad' : audiencia === 'docentes' ? 'Nuevo comunicado para el equipo' : 'Nueva actividad'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Título</label>
            <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div>
            <label className="label">Descripción</label>
            <RichTextEditor value={form.descripcion} onChange={(html) => setForm({ ...form, descripcion: html })} />
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
          {audiencia === 'ninos' && (
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
          )}
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
                {audiencia === 'docentes'
                  ? 'Cada docente podrá marcarla como hecha desde su cuenta.'
                  : 'Cada niño del nivel podrá entregar su evidencia desde la cuenta de su padre/madre.'}
              </p>
            )}
          </div>
          {form.es_tarea && (
            <div>
              <label className="label">Enlace externo / Video de YouTube o Vimeo (opcional)</label>
              <input
                type="url"
                className="input"
                placeholder="https://youtube.com/watch?v=... o cualquier URL"
                value={form.enlace_externo}
                onChange={(e) => setForm({ ...form, enlace_externo: e.target.value })}
              />
              <p className="mt-1 text-xs text-ink/40">Si pegas un enlace de YouTube o Vimeo se mostrará el video embebido.</p>
            </div>
          )}
          <div>
            <label className="label">{editing ? 'Agregar más archivos (opcional)' : 'Archivos (fotos, PDFs, etc.)'}</label>
            <div className="flex flex-wrap items-center gap-2">
              <MultiFilePicker archivos={archivos} onChange={setArchivos} />
              <button type="button" onClick={() => setDrivePickerOpen(true)} className="btn-secondary !py-2 !text-sm">
                📁 Desde el Drive
              </button>
            </div>
            {archivosDrive.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {archivosDrive.map((df, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-xl bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                    📁 {df.nombre}
                    <button type="button" onClick={() => setArchivosDrive(archivosDrive.filter((_, j) => j !== i))} className="ml-1 text-coral-500">×</button>
                  </span>
                ))}
              </div>
            )}
            {editing && <ActivityFiles archivos={editing.actividad_archivos} />}
          </div>
          {progreso && <p className="text-sm font-bold text-sky-600">{progreso}</p>}
          {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : editing ? 'Guardar cambios' : 'Publicar actividad'}
          </button>
        </form>
      </Modal>

      <TareaEntregas actividad={tareaActividad} open={!!tareaActividad} onClose={() => setTareaActividad(null)} />

      <DrivePicker
        open={drivePickerOpen}
        onClose={() => setDrivePickerOpen(false)}
        onSelect={(files) => setArchivosDrive([...archivosDrive, ...files])}
      />
    </div>
  )
}
