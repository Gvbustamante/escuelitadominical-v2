import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function ActividadesAdmin() {
  const { user } = useAuth()
  const [niveles, setNiveles] = useState(null)
  const [nivelId, setNivelId] = useState('')
  const [actividades, setActividades] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ titulo: '', descripcion: '', fecha: hoyISO(), versiculo_clave: '', historia_biblica: '' })
  const [archivos, setArchivos] = useState([])
  const [busy, setBusy] = useState(false)
  const [progreso, setProgreso] = useState('')
  const [error, setError] = useState('')

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
    setForm({ titulo: '', descripcion: '', fecha: hoyISO(), versiculo_clave: '', historia_biblica: '' })
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

  async function eliminar(id) {
    await supabase.from('actividades').delete().eq('id', id)
    load()
  }

  function fileUrl(path) {
    return supabase.storage.from('actividades').getPublicUrl(path).data.publicUrl
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
        <button className="btn-primary" onClick={openNew}>
          + Nueva actividad
        </button>
      </div>

      <select className="input max-w-xs" value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
        {niveles.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>

      {!actividades ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-4">
          {actividades.map((a) => (
            <div key={a.id} className="card">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-bold">{a.titulo}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink/40">{a.fecha}</span>
                  <button onClick={() => eliminar(a.id)} className="text-lg text-ink/30 hover:text-coral-500">
                    🗑️
                  </button>
                </div>
              </div>
              {a.descripcion && <p className="mt-1 text-ink/70">{a.descripcion}</p>}
              {(a.versiculo_clave || a.historia_biblica) && (
                <div className="mt-3 rounded-2xl bg-sunshine-50 p-3">
                  {a.versiculo_clave && <p className="italic text-ink/80">📖 "{a.versiculo_clave}"</p>}
                  {a.historia_biblica && <p className="mt-1 text-sm font-bold text-sunshine-700">Historia: {a.historia_biblica}</p>}
                </div>
              )}
              {a.actividad_archivos?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.actividad_archivos.map((f) => (
                    <a
                      key={f.id}
                      href={fileUrl(f.storage_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-600 hover:bg-sky-100"
                    >
                      📎 {f.nombre_archivo}
                    </a>
                  ))}
                </div>
              )}
              <p className="mt-3 text-sm font-bold text-coral-500">{a.actividad_reacciones?.length || 0} reacciones ❤️</p>
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
            <label className="label">Archivos (fotos, PDFs, etc.)</label>
            <input type="file" multiple className="input" onChange={(e) => setArchivos(Array.from(e.target.files))} />
            {archivos.length > 0 && <p className="mt-1 text-sm text-ink/50">{archivos.length} archivo(s) seleccionado(s)</p>}
          </div>
          {progreso && <p className="text-sm font-bold text-sky-600">{progreso}</p>}
          {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : 'Publicar actividad'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
