import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function hoyYYYYMM() {
  return new Date().toISOString().slice(0, 7)
}

function diasEnMes(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export default function Devocionales() {
  const { user, profile } = useAuth()
  const puedeCrear = ['admin', 'coordinador', 'docente'].includes(profile.role)

  const [devocionales, setDevocionales] = useState(null)
  const [niveles, setNiveles] = useState([])
  const [mes, setMes] = useState(hoyYYYYMM())
  const [verTodos, setVerTodos] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ titulo: '', versiculo: '', contenido: '', fecha: hoyISO(), nivel_id: '' })
  const [imagen, setImagen] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    let query = supabase.from('devocionales_ninos').select('*, nivel:niveles(nombre)').order('fecha', { ascending: false })
    if (!verTodos) {
      query = query.gte('fecha', `${mes}-01`).lte('fecha', `${mes}-${String(diasEnMes(mes)).padStart(2, '0')}`)
    }
    const { data } = await query
    setDevocionales(data || [])
  }, [mes, verTodos])

  useEffect(() => {
    load()
    if (puedeCrear) {
      supabase.from('niveles').select('*').eq('activo', true).then(({ data }) => setNiveles(data || []))
    }
  }, [load, puedeCrear])

  function openNew() {
    setForm({ titulo: '', versiculo: '', contenido: '', fecha: hoyISO(), nivel_id: '' })
    setImagen(null)
    setPreview(null)
    setModalOpen(true)
  }

  function handleImagen(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setImagen(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    const { data: devocional, error } = await supabase
      .from('devocionales_ninos')
      .insert({
        titulo: form.titulo,
        versiculo: form.versiculo || null,
        contenido: form.contenido,
        fecha: form.fecha,
        nivel_id: form.nivel_id || null,
        creado_por: user.id,
      })
      .select()
      .single()

    if (!error && imagen) {
      const path = `devocionales/${devocional.id}/${Date.now()}-${imagen.name}`
      const { error: upError } = await supabase.storage.from('actividades').upload(path, imagen)
      if (!upError) {
        const imagen_url = supabase.storage.from('actividades').getPublicUrl(path).data.publicUrl
        await supabase.from('devocionales_ninos').update({ imagen_url }).eq('id', devocional.id)
      }
    }

    setBusy(false)
    setModalOpen(false)
    load()
  }

  if (!devocionales) return <Spinner />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Devocionales 🙏</h1>
          <p className="text-ink/50">Reflexiones cortas pensadas para niños</p>
        </div>
        {puedeCrear && (
          <button className="btn-primary" onClick={openNew}>
            + Nuevo devocional
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!verTodos && (
          <input type="month" className="input max-w-xs" value={mes} onChange={(e) => setMes(e.target.value)} />
        )}
        <button
          onClick={() => setVerTodos((v) => !v)}
          className={`rounded-full px-4 py-2 text-sm font-bold ${verTodos ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          {verTodos ? 'Ver por mes' : 'Ver todos'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {devocionales.map((d) => (
          <div key={d.id} className="card">
            {d.imagen_url && (
              <img src={d.imagen_url} alt={d.titulo} className="mb-3 h-40 w-full rounded-2xl object-cover" />
            )}
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold">{d.titulo}</h3>
              <span className="text-sm text-ink/40">{d.fecha}</span>
            </div>
            {d.nivel?.nombre && <p className="text-xs font-bold uppercase text-sky-500">{d.nivel.nombre}</p>}
            {d.versiculo && <p className="mt-2 italic text-ink/70">📖 "{d.versiculo}"</p>}
            <p className="mt-2 whitespace-pre-line text-ink/70">{d.contenido}</p>
          </div>
        ))}
        {devocionales.length === 0 && (
          <p className="card text-ink/50">
            {verTodos ? 'Todavía no hay devocionales publicados.' : 'No hay devocionales publicados este mes.'}
          </p>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo devocional">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Título</label>
            <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div>
            <label className="label">Versículo (opcional)</label>
            <input
              className="input"
              placeholder='Ej. "Todo lo puedo en Cristo..." — Filipenses 4:13'
              value={form.versiculo}
              onChange={(e) => setForm({ ...form, versiculo: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Reflexión para el niño/a</label>
            <textarea
              required
              className="input"
              rows={5}
              placeholder="Escribe algo corto y sencillo que un niño pueda entender..."
              value={form.contenido}
              onChange={(e) => setForm({ ...form, contenido: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
            <div>
              <label className="label">Clase (opcional)</label>
              <select className="input" value={form.nivel_id} onChange={(e) => setForm({ ...form, nivel_id: e.target.value })}>
                <option value="">Para todas las clases</option>
                {niveles.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Imagen (opcional)</label>
            <input type="file" accept="image/*" className="input" onChange={handleImagen} />
            {preview && <img src={preview} alt="" className="mt-2 h-32 w-full rounded-2xl object-cover" />}
          </div>
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Publicando...' : 'Publicar devocional'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
