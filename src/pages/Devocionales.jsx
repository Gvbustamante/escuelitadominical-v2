import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Devocionales() {
  const { user, profile } = useAuth()
  const puedeCrear = ['admin', 'coordinador', 'docente'].includes(profile.role)

  const [devocionales, setDevocionales] = useState(null)
  const [niveles, setNiveles] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ titulo: '', versiculo: '', contenido: '', fecha: hoyISO(), nivel_id: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('devocionales_ninos')
      .select('*, nivel:niveles(nombre)')
      .order('fecha', { ascending: false })
    setDevocionales(data || [])
  }, [])

  useEffect(() => {
    load()
    if (puedeCrear) {
      supabase.from('niveles').select('*').eq('activo', true).then(({ data }) => setNiveles(data || []))
    }
  }, [load, puedeCrear])

  function openNew() {
    setForm({ titulo: '', versiculo: '', contenido: '', fecha: hoyISO(), nivel_id: '' })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    await supabase.from('devocionales_ninos').insert({
      titulo: form.titulo,
      versiculo: form.versiculo || null,
      contenido: form.contenido,
      fecha: form.fecha,
      nivel_id: form.nivel_id || null,
      creado_por: user.id,
    })
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {devocionales.map((d) => (
          <div key={d.id} className="card">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold">{d.titulo}</h3>
              <span className="text-sm text-ink/40">{d.fecha}</span>
            </div>
            {d.nivel?.nombre && <p className="text-xs font-bold uppercase text-sky-500">{d.nivel.nombre}</p>}
            {d.versiculo && <p className="mt-2 italic text-ink/70">📖 "{d.versiculo}"</p>}
            <p className="mt-2 whitespace-pre-line text-ink/70">{d.contenido}</p>
          </div>
        ))}
        {devocionales.length === 0 && <p className="card text-ink/50">Todavía no hay devocionales publicados.</p>}
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
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Publicando...' : 'Publicar devocional'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
