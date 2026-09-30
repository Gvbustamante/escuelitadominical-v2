import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import CalendarioAgenda from '../../components/CalendarioAgenda'
import { hoyLocal } from '../../lib/fechas'
import FechaCampo from '../../components/ui/FechaCampo'
import TituloPagina from '../../components/ui/TituloPagina'
import ListaEventos from '../../components/ListaEventos'

function hoyISO() {
  return hoyLocal()
}

export default function AgendaAdmin() {
  const { user } = useAuth()
  const [niveles, setNiveles] = useState([])
  const [eventos, setEventos] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ titulo: '', descripcion: '', fecha: hoyISO(), nivel_id: '' })
  const [busy, setBusy] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('agenda').select('*, nivel:niveles(nombre)').order('fecha')
    setEventos(data || [])
  }, [])

  useEffect(() => {
    load()
    supabase.from('niveles').select('*').eq('activo', true).order('nombre').then(({ data }) => setNiveles(data || []))
  }, [load])

  function openNew() {
    setForm({ titulo: '', descripcion: '', fecha: selectedDay || hoyISO(), nivel_id: '' })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    await supabase.from('agenda').insert({
      creado_por: user.id,
      titulo: form.titulo,
      descripcion: form.descripcion,
      fecha: form.fecha,
      nivel_id: form.nivel_id || null,
    })
    setBusy(false)
    setModalOpen(false)
    load()
  }

  async function confirmarEliminar() {
    if (!confirmEliminar) return
    setConfirmBusy(true)
    await supabase.from('agenda').delete().eq('id', confirmEliminar)
    setConfirmBusy(false)
    setConfirmEliminar(null)
    load()
  }

  if (!eventos) return <Spinner />


  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <TituloPagina ruta="/agenda">Agenda</TituloPagina>
          <p className="text-ink/70">Eventos para toda la escuelita o por nivel</p>
        </div>
        <button className="btn-primary fab-movil" onClick={openNew}>
          + Nuevo evento
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CalendarioAgenda eventos={eventos} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        <ListaEventos className="order-first lg:order-none" eventos={eventos} selectedDay={selectedDay} onClearDay={() => setSelectedDay(null)} onEliminar={setConfirmEliminar} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo evento">
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha</label>
              <FechaCampo value={form.fecha} onChange={(v) => setForm({ ...form, fecha: v })} required />
            </div>
            <div>
              <label className="label">Nivel</label>
              <select className="input" value={form.nivel_id} onChange={(e) => setForm({ ...form, nivel_id: e.target.value })}>
                <option value="">Toda la escuelita</option>
                {niveles.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : 'Guardar evento'}
          </button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmEliminar}
        onClose={() => setConfirmEliminar(null)}
        onConfirm={confirmarEliminar}
        busy={confirmBusy}
        title="¿Eliminar este evento?"
        confirmLabel="Sí, eliminar"
        message="No se puede deshacer."
      />
    </div>
  )
}
