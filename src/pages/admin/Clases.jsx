import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Skeleton from '../../components/Skeleton'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import { BADGE_CLASSES, DOT_CLASSES } from '../../lib/colors'

const COLOR_OPTIONS = ['sky', 'grass', 'sunshine', 'coral', 'grape']

export default function Clases() {
  const { profile } = useAuth()
  const [niveles, setNiveles] = useState(null)
  const [docentes, setDocentes] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nombre: '', edad_min: '', edad_max: '', color: 'sky' })
  const [selectedDocentes, setSelectedDocentes] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDesactivar, setConfirmDesactivar] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const load = useCallback(async () => {
    const [{ data: n }, { data: d }, { data: a }] = await Promise.all([
      supabase.from('niveles').select('*').order('edad_min', { ascending: true, nullsFirst: true }),
      supabase.from('profiles').select('id, nombre_completo').eq('role', 'docente').eq('activo', true),
      supabase.from('docentes_niveles').select('*'),
    ])
    setNiveles(n || [])
    setDocentes(d || [])
    setAsignaciones(a || [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setEditing(null)
    setForm({ nombre: '', edad_min: '', edad_max: '', color: 'sky' })
    setSelectedDocentes([])
    setError('')
    setModalOpen(true)
  }

  function openEdit(nivel) {
    setEditing(nivel)
    setForm({
      nombre: nivel.nombre,
      edad_min: nivel.edad_min ?? '',
      edad_max: nivel.edad_max ?? '',
      color: nivel.color || 'sky',
    })
    setSelectedDocentes(asignaciones.filter((a) => a.nivel_id === nivel.id).map((a) => a.docente_id))
    setError('')
    setModalOpen(true)
  }

  function toggleDocente(id) {
    setSelectedDocentes((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    const payload = {
      nombre: form.nombre,
      edad_min: form.edad_min === '' ? null : Number(form.edad_min),
      edad_max: form.edad_max === '' ? null : Number(form.edad_max),
      color: form.color,
    }

    let nivelId = editing?.id
    if (editing) {
      const { error } = await supabase.from('niveles').update(payload).eq('id', editing.id)
      if (error) return fail(error)
    } else {
      const { data, error } = await supabase.from('niveles').insert(payload).select().single()
      if (error) return fail(error)
      nivelId = data.id
    }

    await supabase.from('docentes_niveles').delete().eq('nivel_id', nivelId)
    if (selectedDocentes.length) {
      await supabase.from('docentes_niveles').insert(selectedDocentes.map((docente_id) => ({ docente_id, nivel_id: nivelId })))
    }

    setBusy(false)
    setModalOpen(false)
    load()

    function fail(error) {
      setError(error.message)
      setBusy(false)
    }
  }

  async function toggleActivo(nivel) {
    await supabase.from('niveles').update({ activo: !nivel.activo }).eq('id', nivel.id)
    load()
  }

  function handleToggleClick(nivel) {
    if (nivel.activo) {
      setConfirmDesactivar(nivel)
    } else {
      toggleActivo(nivel)
    }
  }

  async function confirmarDesactivar() {
    setConfirmBusy(true)
    await toggleActivo(confirmDesactivar)
    setConfirmBusy(false)
    setConfirmDesactivar(null)
  }

  if (!niveles) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-2 h-4 w-56" />
          </div>
          <Skeleton className="h-12 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Clases 🎒</h1>
          <p className="text-ink/50">Niveles por edad de tu escuelita</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          + Nueva clase
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {niveles.map((nivel) => {
          const docs = asignaciones.filter((a) => a.nivel_id === nivel.id)
          return (
            <div key={nivel.id} className={`card ${!nivel.activo ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">{nivel.nombre}</h3>
                  <p className="text-sm text-ink/50">
                    {nivel.edad_min ?? '?'} - {nivel.edad_max ?? '?'} años
                  </p>
                </div>
                <span className={`badge ${BADGE_CLASSES[nivel.color] || BADGE_CLASSES.sky}`}>{docs.length} docente(s)</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="btn-secondary flex-1 !py-2" onClick={() => openEdit(nivel)}>
                  Editar
                </button>
                {profile.role === 'admin' && (
                  <button className="btn-secondary flex-1 !py-2" onClick={() => handleToggleClick(nivel)}>
                    {nivel.activo ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {niveles.length === 0 && <p className="text-ink/40">Aún no hay clases. ¡Crea la primera!</p>}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar clase' : 'Nueva clase'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Nombre</label>
            <input
              required
              className="input"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej. Exploradores"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Edad mínima</label>
              <input
                type="number"
                className="input"
                value={form.edad_min}
                onChange={(e) => setForm({ ...form, edad_min: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Edad máxima</label>
              <input
                type="number"
                className="input"
                value={form.edad_max}
                onChange={(e) => setForm({ ...form, edad_max: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-10 w-10 rounded-full ${DOT_CLASSES[c]} ${form.color === c ? 'ring-4 ring-ink/20' : ''}`}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="label">Docentes asignados</label>
            <div className="flex flex-col gap-2 rounded-2xl border-2 border-ink/10 p-3 max-h-40 overflow-y-auto">
              {docentes.length === 0 && <p className="text-sm text-ink/40">Aún no hay docentes invitados.</p>}
              {docentes.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={selectedDocentes.includes(d.id)}
                    onChange={() => toggleDocente(d.id)}
                    className="h-5 w-5 rounded"
                  />
                  {d.nombre_completo}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmDesactivar}
        onClose={() => setConfirmDesactivar(null)}
        onConfirm={confirmarDesactivar}
        busy={confirmBusy}
        title="¿Desactivar esta clase?"
        confirmLabel="Sí, desactivar"
        message={
          confirmDesactivar
            ? `"${confirmDesactivar.nombre}" dejará de aparecer como clase activa. Puedes reactivarla cuando quieras.`
            : ''
        }
      />
    </div>
  )
}
