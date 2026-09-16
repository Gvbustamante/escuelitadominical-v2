import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNivelesEstrella, badgeActual } from '../lib/nivelesEstrella'
import Avatar from './Avatar'
import RewardBurst from './RewardBurst'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

const MENSAJES_COMPLETO = ['¡Asistencia completa! 🎉', '¡Todos presentes hoy! 🙌', '¡Qué domingo tan lleno! 🌟']

export default function TomarAsistenciaInline({ nivelId, nivelNombre, ninos, userId, onSaved, onProgreso }) {
  const nivelesEstrella = useNivelesEstrella()
  const [fecha, setFecha] = useState(hoyISO())
  const [marcados, setMarcados] = useState({})
  const [estrellasPorNino, setEstrellasPorNino] = useState({})
  const [cargando, setCargando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const celebradoRef = useRef(false)

  useEffect(() => {
    if (!nivelId) return
    setCargando(true)
    celebradoRef.current = false
    Promise.all([
      supabase.from('asistencia').select('nino_id, presente').eq('nivel_id', nivelId).eq('fecha', fecha),
      supabase.from('reconocimientos').select('nino_id').eq('nivel_id', nivelId),
    ]).then(([{ data: asist }, { data: recs }]) => {
      const map = {}
      ;(asist || []).forEach((r) => (map[r.nino_id] = r.presente))
      setMarcados(map)
      const stars = {}
      ;(recs || []).forEach((r) => {
        stars[r.nino_id] = (stars[r.nino_id] || 0) + 1
      })
      setEstrellasPorNino(stars)
      setCargando(false)
    })
  }, [nivelId, fecha])

  function toggle(ninoId) {
    setMarcados((prev) => {
      const next = { ...prev, [ninoId]: !prev[ninoId] }
      const todosPresentes = ninos && ninos.length > 0 && ninos.every((n) => next[n.id])
      if (todosPresentes && !celebradoRef.current) {
        celebradoRef.current = true
        const msg = MENSAJES_COMPLETO[Math.floor(Math.random() * MENSAJES_COMPLETO.length)]
        setToast({ key: Date.now(), message: msg })
      }
      return next
    })
  }

  function marcarTodos() {
    if (!ninos) return
    const next = {}
    ninos.forEach((n) => (next[n.id] = true))
    setMarcados(next)
    if (!celebradoRef.current) {
      celebradoRef.current = true
      const msg = MENSAJES_COMPLETO[Math.floor(Math.random() * MENSAJES_COMPLETO.length)]
      setToast({ key: Date.now(), message: msg })
    }
  }

  function desmarcarTodos() {
    setMarcados({})
    celebradoRef.current = false
  }

  async function guardar() {
    setSaving(true)
    const rows = ninos.map((n) => ({
      nino_id: n.id,
      nivel_id: nivelId,
      fecha,
      presente: !!marcados[n.id],
      tomada_por: userId,
    }))
    await supabase.from('asistencia').upsert(rows, { onConflict: 'nino_id,fecha' })
    setSaving(false)
    onSaved?.()
  }

  const presentes = Object.values(marcados).filter(Boolean).length
  const total = ninos?.length || 0
  const pct = total > 0 ? Math.round((presentes / total) * 100) : 0

  return (
    <div className="flex flex-col gap-4">
      <RewardBurst toast={toast} />

      <div className="card animate-pop-in !p-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b-2 border-ink/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-bold">{nivelNombre || 'Tomar asistencia'}</p>
            <p className="text-sm text-ink/50">Marca quién vino hoy</p>
          </div>
          <input type="date" className="input !w-auto" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-ink/40">Cargando...</p>
          </div>
        ) : !ninos || total === 0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl">📭</p>
            <p className="mt-2 text-sm font-bold text-ink/40">No hay niños activos en esta clase.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/5 bg-ink/[0.02] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-grass-600">{presentes}</span>
                  <span className="text-sm font-bold text-ink/40">/ {total}</span>
                </div>
                <div className="h-2.5 w-24 overflow-hidden rounded-full bg-ink/10 sm:w-32">
                  <div
                    className="h-full rounded-full bg-grass-400 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-ink/40">{pct}%</span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={marcarTodos} className="rounded-xl px-3 py-1.5 text-xs font-bold text-sky-600 hover:bg-sky-50">
                  ✅ Todos
                </button>
                <button type="button" onClick={desmarcarTodos} className="rounded-xl px-3 py-1.5 text-xs font-bold text-ink/40 hover:bg-ink/5">
                  Limpiar
                </button>
              </div>
            </div>

            <div className="divide-y divide-ink/5">
              {ninos.map((n) => {
                const presente = !!marcados[n.id]
                const stars = estrellasPorNino[n.id] || 0
                const badge = badgeActual(nivelesEstrella, stars)
                return (
                  <div
                    key={n.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      presente ? 'bg-grass-50' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(n.id)}
                      aria-label={`Marcar presente a ${n.nombre_completo}`}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg shadow-pop transition-all active:translate-y-0.5 active:shadow-none ${
                        presente
                          ? 'bg-grass-400 text-white ring-2 ring-grass-200'
                          : 'bg-white text-ink/20 ring-2 ring-ink/10 hover:ring-ink/20'
                      }`}
                    >
                      {presente ? '✓' : ''}
                    </button>

                    <Avatar nombre={n.nombre_completo} size="sm" />

                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-bold ${presente ? 'text-grass-800' : 'text-ink'}`}>
                        {n.nombre_completo}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{badge.emoji}</span>
                        <span className="text-[0.65rem] text-ink/40">{badge.nombre} · {stars} ⭐</span>
                      </div>
                    </div>

                    {onProgreso && presente && (
                      <button
                        type="button"
                        onClick={() => onProgreso(n)}
                        title="Registrar progreso"
                        aria-label={`Registrar progreso de ${n.nombre_completo}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-soft ring-2 ring-grass-200 transition-transform hover:scale-110 active:scale-95"
                      >
                        🌱
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="border-t-2 border-ink/5 p-4">
              <button onClick={guardar} disabled={saving} className="btn-success w-full justify-center">
                {saving ? 'Guardando...' : '💾 Guardar asistencia'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
