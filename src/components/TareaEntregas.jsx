import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from './Modal'

const ESTADO_BADGE = {
  pendiente: 'bg-ink/10 text-ink/50',
  pausada: 'bg-sunshine-100 text-sunshine-700',
  entregada: 'bg-grass-100 text-grass-700',
}
const ESTADO_LABEL = { pendiente: '⏳ Pendiente', pausada: '⏸️ Pausada', entregada: '✅ Entregada' }

export default function TareaEntregas({ actividad, open, onClose }) {
  const [ninos, setNinos] = useState(null)
  const [entregas, setEntregas] = useState({})
  const [notaDraft, setNotaDraft] = useState({})
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    if (!actividad) return
    const [{ data: n }, { data: e }] = await Promise.all([
      supabase.from('ninos').select('*').eq('nivel_id', actividad.nivel_id).eq('activo', true).order('nombre_completo'),
      supabase.from('tarea_entregas').select('*').eq('actividad_id', actividad.id),
    ])
    setNinos(n || [])
    const byNino = {}
    ;(e || []).forEach((row) => {
      byNino[row.nino_id] = row
    })
    setEntregas(byNino)
    setNotaDraft({})
  }, [actividad])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  async function togglePausa(nino) {
    setBusyId(nino.id)
    const actual = entregas[nino.id]
    const nuevoEstado = actual?.estado === 'pausada' ? 'pendiente' : 'pausada'
    await supabase
      .from('tarea_entregas')
      .upsert(
        { actividad_id: actividad.id, nino_id: nino.id, estado: nuevoEstado, updated_at: new Date().toISOString() },
        { onConflict: 'actividad_id,nino_id' },
      )
    setBusyId(null)
    load()
  }

  async function guardarNota(nino) {
    setBusyId(nino.id)
    const nota = notaDraft[nino.id] ?? entregas[nino.id]?.nota_docente ?? ''
    await supabase
      .from('tarea_entregas')
      .upsert(
        { actividad_id: actividad.id, nino_id: nino.id, nota_docente: nota, updated_at: new Date().toISOString() },
        { onConflict: 'actividad_id,nino_id' },
      )
    setBusyId(null)
    load()
  }

  if (!actividad) return null

  const total = ninos?.filter((n) => !n.pausado).length || 0
  const entregadas = ninos?.filter((n) => !n.pausado && entregas[n.id]?.estado === 'entregada').length || 0

  return (
    <Modal open={open} onClose={onClose} title={`Entregas — ${actividad.titulo}`}>
      <div className="flex flex-col gap-3">
        {ninos && (
          <p className="text-sm font-bold text-ink/50">
            {entregadas} de {total} entregaron
          </p>
        )}
        {actividad.enlace_externo && (
          <a
            href={actividad.enlace_externo}
            target="_blank"
            rel="noreferrer"
            className="w-fit rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-600 hover:bg-sky-100"
          >
            🔗 Abrir enlace de la tarea
          </a>
        )}
        {!ninos ? (
          <p className="text-ink/40">Cargando...</p>
        ) : (
          ninos.map((n) => {
            const entrega = entregas[n.id]
            const estado = entrega?.estado || 'pendiente'
            return (
              <div key={n.id} className={`rounded-2xl border-2 border-ink/5 p-3 ${n.pausado ? 'opacity-50 grayscale' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{n.nombre_completo}</p>
                  {n.pausado ? (
                    <span className="badge bg-ink/10 text-ink/50">⏸️ Pausado (niño)</span>
                  ) : (
                    <span className={`badge ${ESTADO_BADGE[estado]}`}>{ESTADO_LABEL[estado]}</span>
                  )}
                </div>

                {!n.pausado && entrega?.archivo_url && (
                  <a
                    href={entrega.archivo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm font-bold text-sky-600 hover:underline"
                  >
                    📎 Ver evidencia
                  </a>
                )}
                {!n.pausado && entrega?.comentario_padre && (
                  <p className="mt-1 text-sm text-ink/60">💬 {entrega.comentario_padre}</p>
                )}

                {!n.pausado && estado !== 'entregada' && (
                  <button
                    disabled={busyId === n.id}
                    onClick={() => togglePausa(n)}
                    className="btn-secondary mt-2 !py-1 !px-3 !text-xs"
                  >
                    {estado === 'pausada' ? '▶️ Reanudar' : '⏸️ Pausar'}
                  </button>
                )}

                {!n.pausado && estado === 'entregada' && (
                  <div className="mt-2 flex gap-2">
                    <input
                      className="input !py-1 !text-sm"
                      placeholder="Escríbele una nota (ej. ¡Muy bien!)"
                      value={notaDraft[n.id] ?? entrega?.nota_docente ?? ''}
                      onChange={(e) => setNotaDraft({ ...notaDraft, [n.id]: e.target.value })}
                    />
                    <button
                      disabled={busyId === n.id}
                      onClick={() => guardarNota(n)}
                      className="btn-secondary shrink-0 !py-1 !px-3 !text-xs"
                    >
                      Guardar
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
        {ninos && ninos.length === 0 && <p className="text-ink/40">No hay niños activos en este nivel.</p>}
      </div>
    </Modal>
  )
}
