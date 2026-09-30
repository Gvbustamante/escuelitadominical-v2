import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useMisClases } from '../../lib/useMisClases'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import CalendarioAgenda from '../../components/CalendarioAgenda'
import { hoyLocal } from '../../lib/fechas'
import FechaCampo from '../../components/ui/FechaCampo'
import TituloPagina from '../../components/ui/TituloPagina'
import EmptyState from '../../components/EmptyState'
import NivelChips from '../../components/ui/NivelChips'
import ListaEventos from '../../components/ListaEventos'

function hoyISO() {
  return hoyLocal()
}

export default function Agenda() {
  const { user } = useAuth()
  const { clases, nivelId, setNivelId } = useMisClases()
  const [eventos, setEventos] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ titulo: '', descripcion: '', fecha: hoyISO() })
  const [busy, setBusy] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const load = useCallback(async () => {
    if (!nivelId) return
    const { data } = await supabase.from('agenda').select('*').eq('nivel_id', nivelId).order('fecha')
    setEventos(data || [])
  }, [nivelId])

  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setForm({ titulo: '', descripcion: '', fecha: selectedDay || hoyISO() })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    await supabase.from('agenda').insert({ nivel_id: nivelId, creado_por: user.id, ...form })
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

  if (!clases) return <Spinner />
  if (clases.length === 0) return <EmptyState icon="🎒" titulo="Todavía no tienes niveles asignados" texto="Pide al administrador que te asigne a un nivel en la sección Niveles." />


  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <TituloPagina ruta="/agenda">Agenda</TituloPagina>
          <p className="text-ink/70">Próximos eventos y actividades especiales</p>
        </div>
        <button className="btn-primary fab-movil" onClick={openNew}>
          + Nuevo evento
        </button>
      </div>

      <NivelChips niveles={clases} value={nivelId} onChange={setNivelId} />

      {!eventos ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CalendarioAgenda eventos={eventos} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
          <ListaEventos className="order-first lg:order-none" eventos={eventos} selectedDay={selectedDay} onClearDay={() => setSelectedDay(null)} onEliminar={setConfirmEliminar} mostrarNivel={false} />
        </div>
      )}

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
          <div>
            <label className="label">Fecha</label>
            <FechaCampo value={form.fecha} onChange={(v) => setForm({ ...form, fecha: v })} required />
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
