import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useMisClases } from '../../lib/useMisClases'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'

const COMPORTAMIENTOS = ['Excelente', 'Bueno', 'Regular', 'Necesita apoyo']
const EMOCIONES = ['😊 Feliz', '🤩 Emocionado', '😐 Tranquilo', '😢 Triste', '😡 Molesto', '😴 Cansado']

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Progreso() {
  const { user } = useAuth()
  const { clases, nivelId, setNivelId } = useMisClases()
  const [ninos, setNinos] = useState(null)
  const [notasPorNino, setNotasPorNino] = useState({})
  const [modalNino, setModalNino] = useState(null)
  const [historialNino, setHistorialNino] = useState(null)
  const [form, setForm] = useState({ fecha: hoyISO(), comportamiento: '', emocion: '', logros: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!nivelId) return
    const { data: n } = await supabase.from('ninos').select('*').eq('nivel_id', nivelId).eq('activo', true).order('nombre_completo')
    const { data: notas } = await supabase
      .from('progreso_notas')
      .select('*')
      .eq('nivel_id', nivelId)
      .order('fecha', { ascending: false })
    setNinos(n || [])
    const grouped = {}
    ;(notas || []).forEach((nota) => {
      grouped[nota.nino_id] = grouped[nota.nino_id] || []
      grouped[nota.nino_id].push(nota)
    })
    setNotasPorNino(grouped)
  }, [nivelId])

  useEffect(() => {
    load()
  }, [load])

  function openNew(nino) {
    setModalNino(nino)
    setForm({ fecha: hoyISO(), comportamiento: '', emocion: '', logros: '' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    await supabase.from('progreso_notas').insert({
      nino_id: modalNino.id,
      nivel_id: nivelId,
      docente_id: user.id,
      ...form,
    })
    setBusy(false)
    setModalNino(null)
    load()
  }

  if (!clases) return <Spinner />
  if (clases.length === 0) return <p className="card text-ink/50">No tienes clases asignadas todavía.</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Progreso 🌱</h1>
        <p className="text-ink/50">Comportamiento, emociones y logros de cada niño/a</p>
      </div>

      <select className="input max-w-xs" value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
        {clases.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>

      {!ninos ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ninos.map((n) => {
            const notas = notasPorNino[n.id] || []
            const ultima = notas[0]
            return (
              <div key={n.id} className="card">
                <h3 className="text-lg font-bold">{n.nombre_completo}</h3>
                {ultima ? (
                  <div className="mt-2 text-sm text-ink/60">
                    <p>Última nota: {ultima.fecha}</p>
                    {ultima.emocion && <p>{ultima.emocion}</p>}
                    {ultima.comportamiento && <p>Comportamiento: {ultima.comportamiento}</p>}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-ink/40">Sin notas todavía</p>
                )}
                <div className="mt-4 flex gap-2">
                  <button className="btn-secondary flex-1 !py-2 !text-sm" onClick={() => openNew(n)}>
                    + Nota
                  </button>
                  <button className="btn-secondary flex-1 !py-2 !text-sm" onClick={() => setHistorialNino(n)}>
                    Historial ({notas.length})
                  </button>
                </div>
              </div>
            )
          })}
          {ninos.length === 0 && <p className="text-ink/40">No hay niños activos en esta clase.</p>}
        </div>
      )}

      <Modal open={!!modalNino} onClose={() => setModalNino(null)} title={`Nota de progreso — ${modalNino?.nombre_completo || ''}`}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
          <div>
            <label className="label">¿Cómo se comportó?</label>
            <div className="flex flex-wrap gap-2">
              {COMPORTAMIENTOS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setForm({ ...form, comportamiento: c })}
                  className={`rounded-full px-3 py-2 text-sm font-bold ${form.comportamiento === c ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">¿Cómo se sintió?</label>
            <div className="flex flex-wrap gap-2">
              {EMOCIONES.map((em) => (
                <button
                  type="button"
                  key={em}
                  onClick={() => setForm({ ...form, emocion: em })}
                  className={`rounded-full px-3 py-2 text-sm font-bold ${form.emocion === em ? 'bg-coral-400 text-white' : 'bg-ink/5'}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">¿Qué logró hoy?</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Ej. Aprendió a compartir sus crayones, memorizó el versículo..."
              value={form.logros}
              onChange={(e) => setForm({ ...form, logros: e.target.value })}
            />
          </div>
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : 'Guardar nota'}
          </button>
        </form>
      </Modal>

      <Modal open={!!historialNino} onClose={() => setHistorialNino(null)} title={`Historial — ${historialNino?.nombre_completo || ''}`}>
        <div className="flex flex-col gap-3">
          {(notasPorNino[historialNino?.id] || []).map((nota) => (
            <div key={nota.id} className="rounded-2xl bg-ink/5 p-3">
              <p className="text-sm font-bold text-ink/50">{nota.fecha}</p>
              {nota.emocion && <p>{nota.emocion}</p>}
              {nota.comportamiento && <p className="text-sm">Comportamiento: {nota.comportamiento}</p>}
              {nota.logros && <p className="mt-1 text-sm text-ink/70">{nota.logros}</p>}
            </div>
          ))}
          {(notasPorNino[historialNino?.id] || []).length === 0 && <p className="text-ink/40">Sin notas todavía.</p>}
        </div>
      </Modal>
    </div>
  )
}
