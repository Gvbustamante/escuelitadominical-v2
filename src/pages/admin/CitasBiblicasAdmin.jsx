import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'

function hoyStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function CitasBiblicasAdmin() {
  const [citas, setCitas] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ texto: '', referencia: '', activo: true, fecha_mostrar: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('citas_biblicas')
      .select('*')
      .order('fecha_mostrar', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    setCitas(data || [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setEditing(null)
    setForm({ texto: '', referencia: '', activo: true, fecha_mostrar: '' })
    setError('')
    setModalOpen(true)
  }

  function openEdit(cita) {
    setEditing(cita)
    setForm({
      texto: cita.texto,
      referencia: cita.referencia,
      activo: cita.activo,
      fecha_mostrar: cita.fecha_mostrar || '',
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    const payload = {
      texto: form.texto,
      referencia: form.referencia,
      activo: form.activo,
      fecha_mostrar: form.fecha_mostrar || null,
    }

    const query = editing
      ? supabase.from('citas_biblicas').update(payload).eq('id', editing.id)
      : supabase.from('citas_biblicas').insert(payload)

    const { error } = await query
    setBusy(false)
    if (error) {
      setError(
        error.code === '23505'
          ? 'Ya hay otra cita programada para esa fecha. Elige otro día o quítale la fecha.'
          : error.message
      )
      return
    }
    setModalOpen(false)
    load()
  }

  async function quitarFecha(cita) {
    await supabase.from('citas_biblicas').update({ fecha_mostrar: null }).eq('id', cita.id)
    load()
  }

  async function usarHoy(cita) {
    await supabase.from('citas_biblicas').update({ fecha_mostrar: hoyStr() }).eq('id', cita.id)
    load()
  }

  async function eliminar(cita) {
    if (!confirm('¿Eliminar esta cita bíblica?')) return
    await supabase.from('citas_biblicas').delete().eq('id', cita.id)
    load()
  }

  async function toggleActivo(cita) {
    await supabase.from('citas_biblicas').update({ activo: !cita.activo }).eq('id', cita.id)
    load()
  }

  if (!citas) return <Spinner />

  const hoy = hoyStr()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Versículos 📖</h1>
          <p className="text-ink/50">Arma la lista de citas y programa cuál se muestra cada día.</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          + Nueva cita
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {citas.map((c) => (
          <div key={c.id} className={`card ${!c.activo ? 'opacity-50' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  {c.fecha_mostrar === hoy && <span className="badge bg-grass-100 text-grass-700">Hoy</span>}
                  {c.fecha_mostrar && c.fecha_mostrar !== hoy && (
                    <span className="badge bg-sky-100 text-sky-700">
                      {new Date(c.fecha_mostrar + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {!c.fecha_mostrar && <span className="badge bg-ink/5 text-ink/40">Sin fecha</span>}
                  {!c.activo && <span className="badge bg-coral-100 text-coral-600">Inactiva</span>}
                </div>
                <p className="italic text-ink/80">"{c.texto}"</p>
                <p className="mt-1 text-sm font-bold text-ink/50">— {c.referencia}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.fecha_mostrar !== hoy && (
                  <button className="btn-secondary !py-2 !text-sm" onClick={() => usarHoy(c)}>
                    Usar hoy
                  </button>
                )}
                {c.fecha_mostrar && (
                  <button className="btn-secondary !py-2 !text-sm" onClick={() => quitarFecha(c)}>
                    Quitar fecha
                  </button>
                )}
                <button className="btn-secondary !py-2 !text-sm" onClick={() => toggleActivo(c)}>
                  {c.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button className="btn-secondary !py-2 !text-sm" onClick={() => openEdit(c)}>
                  Editar
                </button>
                <button className="btn-secondary !py-2 !text-sm !text-coral-600" onClick={() => eliminar(c)}>
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
        {citas.length === 0 && <p className="text-ink/40">Aún no hay citas. ¡Agrega la primera!</p>}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar cita' : 'Nueva cita'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Texto</label>
            <textarea
              required
              rows={3}
              className="input"
              value={form.texto}
              onChange={(e) => setForm({ ...form, texto: e.target.value })}
              placeholder='Ej. "Todo lo puedo en Cristo que me fortalece."'
            />
          </div>
          <div>
            <label className="label">Referencia</label>
            <input
              required
              className="input"
              value={form.referencia}
              onChange={(e) => setForm({ ...form, referencia: e.target.value })}
              placeholder="Ej. Filipenses 4:13"
            />
          </div>
          <div>
            <label className="label">Mostrar el día (opcional)</label>
            <input
              type="date"
              className="input"
              value={form.fecha_mostrar}
              onChange={(e) => setForm({ ...form, fecha_mostrar: e.target.value })}
            />
            <p className="mt-1 text-xs text-ink/40">Déjalo vacío para que quede disponible sin fecha fija.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              className="h-5 w-5 rounded"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Activa
          </label>
          {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
