import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'

export default function Foro() {
  const { user, profile } = useAuth()
  const esStaff = ['admin', 'coordinador'].includes(profile.role)

  const [foros, setForos] = useState(null)
  const [eventos, setEventos] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [mensajes, setMensajes] = useState(null)
  const [nuevoMensaje, setNuevoMensaje] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ titulo: '', categoria: 'general', evento_id: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('foros')
      .select('*, creador:profiles(nombre_completo), evento:agenda(titulo), mensajes:foro_mensajes(count)')
      .order('created_at', { ascending: false })
    setForos(data || [])
  }, [])

  useEffect(() => {
    load()
    supabase.from('agenda').select('id, titulo, fecha').gte('fecha', new Date().toISOString().slice(0, 10)).order('fecha').then(({ data }) => setEventos(data || []))
  }, [load])

  async function abrirForo(foro) {
    setSeleccionado(foro)
    setMensajes(null)
    const { data } = await supabase
      .from('foro_mensajes')
      .select('*, autor:profiles(nombre_completo, role)')
      .eq('foro_id', foro.id)
      .order('created_at')
    setMensajes(data || [])
  }

  function openNew() {
    setForm({ titulo: '', categoria: 'general', evento_id: '' })
    setModalOpen(true)
  }

  async function crearForo(e) {
    e.preventDefault()
    setBusy(true)
    await supabase.from('foros').insert({
      titulo: form.titulo,
      categoria: form.categoria,
      evento_id: form.categoria === 'evento' ? form.evento_id || null : null,
      creado_por: user.id,
    })
    setBusy(false)
    setModalOpen(false)
    load()
  }

  async function enviarMensaje(e) {
    e.preventDefault()
    if (!nuevoMensaje.trim()) return
    await supabase.from('foro_mensajes').insert({ foro_id: seleccionado.id, autor_id: user.id, mensaje: nuevoMensaje.trim() })
    setNuevoMensaje('')
    abrirForo(seleccionado)
  }

  async function borrarForo(id) {
    await supabase.from('foros').delete().eq('id', id)
    setSeleccionado(null)
    load()
  }

  async function borrarMensaje(id) {
    await supabase.from('foro_mensajes').delete().eq('id', id)
    abrirForo(seleccionado)
  }

  if (!foros) return <Spinner />

  if (seleccionado) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <button onClick={() => setSeleccionado(null)} className="mb-2 text-sm font-bold text-sky-500 hover:underline">
              ← Volver al foro
            </button>
            <h1 className="text-2xl font-bold">{seleccionado.titulo}</h1>
            {seleccionado.evento?.titulo && (
              <span className="badge mt-1 bg-sunshine-100 text-sunshine-700">📅 {seleccionado.evento.titulo}</span>
            )}
          </div>
          {(esStaff || seleccionado.creado_por === user.id) && (
            <button onClick={() => borrarForo(seleccionado.id)} className="text-2xl text-ink/30 hover:text-coral-500">
              🗑️
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {!mensajes ? (
            <Spinner />
          ) : (
            <>
              {mensajes.map((m) => (
                <div key={m.id} className="card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">{m.autor?.nombre_completo}</p>
                      <p className="text-xs text-ink/40">{new Date(m.created_at).toLocaleString('es')}</p>
                    </div>
                    {(esStaff || m.autor_id === user.id) && (
                      <button onClick={() => borrarMensaje(m.id)} className="text-lg text-ink/30 hover:text-coral-500">
                        🗑️
                      </button>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-ink/70">{m.mensaje}</p>
                </div>
              ))}
              {mensajes.length === 0 && <p className="card text-ink/50">Sé el primero en escribir en este tema.</p>}
            </>
          )}
        </div>

        <form onSubmit={enviarMensaje} className="card flex flex-col gap-3">
          <textarea
            className="input"
            rows={3}
            placeholder="Escribe tu mensaje..."
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
          />
          <button className="btn-primary self-end">Enviar</button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Foro 💬</h1>
          <p className="text-ink/50">Conversemos — temas generales y de eventos</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          + Nuevo tema
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {foros.map((f) => (
          <button key={f.id} onClick={() => abrirForo(f)} className="card-link flex items-center justify-between gap-3 text-left">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{f.titulo}</h3>
                {f.categoria === 'evento' && <span className="badge bg-sunshine-100 text-sunshine-700">📅 Evento</span>}
              </div>
              <p className="text-sm text-ink/50">
                {f.creador?.nombre_completo} {f.evento?.titulo && `· ${f.evento.titulo}`}
              </p>
            </div>
            <span className="badge bg-sky-100 text-sky-700">{f.mensajes?.[0]?.count ?? 0} 💬</span>
          </button>
        ))}
        {foros.length === 0 && <p className="card text-ink/50">Todavía no hay temas. ¡Crea el primero!</p>}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo tema">
        <form onSubmit={crearForo} className="flex flex-col gap-4">
          <div>
            <label className="label">Título</label>
            <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div>
            <label className="label">Tipo</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, categoria: 'general' })}
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${form.categoria === 'general' ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
              >
                General
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, categoria: 'evento' })}
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${form.categoria === 'evento' ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
              >
                De un evento
              </button>
            </div>
          </div>
          {form.categoria === 'evento' && (
            <div>
              <label className="label">Evento</label>
              <select className="input" value={form.evento_id} onChange={(e) => setForm({ ...form, evento_id: e.target.value })}>
                <option value="">Elige un evento...</option>
                {eventos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.titulo} ({e.fecha})
                  </option>
                ))}
              </select>
            </div>
          )}
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Creando...' : 'Crear tema'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
