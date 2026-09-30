import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNivelesEstrella, badgeActual } from '../lib/nivelesEstrella'
import { useMotivosReconocimiento } from '../lib/motivosReconocimiento'
import { mensajeAleatorio, playSound } from '../lib/gamification'
import Avatar from './Avatar'
import RewardBurst from './RewardBurst'
import FechaCampo from './ui/FechaCampo'
import { fechaLarga } from '../lib/fechas'

// Fecha local (no UTC): un domingo a las 8 p. m. en América sigue siendo domingo.
function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const MENSAJES_COMPLETO = ['¡Asistencia completa! 🎉', '¡Todos presentes hoy! 🙌', '¡Qué domingo tan lleno! 🌟']
const ESPERA_GUARDADO_MS = 500

/** Selector de motivo en línea: el primer chip da la estrella sin motivo. */
function MotivoChips({ motivos, onElegir, onCancelar, busy, titulo }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-sunshine-50 p-3 ring-1 ring-sunshine-200">
      <p className="text-xs font-extrabold uppercase tracking-wide text-sunshine-800">{titulo}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => onElegir(null)} className="rounded-full bg-sunshine-400 px-3 py-2 text-sm font-bold text-ink hover:bg-sunshine-500 disabled:opacity-50">
          ⭐ Dar estrella
        </button>
        {motivos.map((m) => (
          <button key={m.id} type="button" disabled={busy} onClick={() => onElegir(m.texto)} className="rounded-full bg-white px-3 py-2 text-sm font-bold text-ink/80 ring-1 ring-sunshine-200 hover:bg-sunshine-100 disabled:opacity-50">
            {m.emoji} {m.texto}
          </button>
        ))}
        <button type="button" onClick={onCancelar} className="rounded-full px-3 py-2 text-sm font-bold text-ink/65 hover:bg-white">
          Cancelar
        </button>
      </div>
    </div>
  )
}

export default function TomarAsistenciaInline({ nivelId, nivelNombre, ninos, userId, onSaved, onProgreso, esStaff }) {
  const nivelesEstrella = useNivelesEstrella()
  const motivos = useMotivosReconocimiento()
  const [fecha, setFecha] = useState(hoyISO())
  const [marcados, setMarcados] = useState({})
  const [estrellasPorNino, setEstrellasPorNino] = useState({})
  const [hoyPorNino, setHoyPorNino] = useState({}) // ids de estrellas dadas en esta sesión, para deshacer
  const [cargando, setCargando] = useState(false)
  const [estadoGuardado, setEstadoGuardado] = useState('') // '' | 'guardando' | 'guardado' | 'error'
  const [toast, setToast] = useState(null)
  const [diasClaseSet, setDiasClaseSet] = useState(null)
  const [eligiendo, setEligiendo] = useState(null) // nino_id | 'todos' | null
  const [busyEstrella, setBusyEstrella] = useState(false)
  const celebradoRef = useRef(false)
  const timerRef = useRef(null)
  const pendienteRef = useRef(null)
  const onSavedRef = useRef(onSaved)
  onSavedRef.current = onSaved

  useEffect(() => {
    supabase.from('dias_clase').select('*').then(({ data }) => {
      const activos = (data || []).filter((d) => d.activo).map((d) => d.dia_semana)
      setDiasClaseSet(new Set(activos))
    })
  }, [])

  useEffect(() => {
    if (!nivelId) return
    setCargando(true)
    setEstadoGuardado('')
    setEligiendo(null)
    setHoyPorNino({})
    celebradoRef.current = false
    Promise.all([
      supabase.from('asistencia').select('nino_id, presente').eq('nivel_id', nivelId).eq('fecha', fecha),
      supabase.from('reconocimientos').select('nino_id').eq('nivel_id', nivelId),
    ]).then(([{ data: asist }, { data: recs }]) => {
      const map = {}
      ;(asist || []).forEach((r) => (map[r.nino_id] = r.presente))
      setMarcados(map)
      if ((asist || []).length > 0) setEstadoGuardado('guardado')
      const stars = {}
      ;(recs || []).forEach((r) => {
        stars[r.nino_id] = (stars[r.nino_id] || 0) + 1
      })
      setEstrellasPorNino(stars)
      setCargando(false)
    })
  }, [nivelId, fecha])

  const esHoy = fecha === hoyISO()
  const diaSemana = new Date(fecha + 'T00:00:00').getDay()
  const esDiaClase = diasClaseSet ? diasClaseSet.has(diaSemana) : true
  // El docente corrige durante el día de clase; los demás días queda cerrado. El staff siempre puede.
  const bloqueado = !esStaff && (!esHoy || !esDiaClase)

  // Guarda el día completo (todos los niños, presente o no) para que los reportes cuenten ausencias.
  // Cada guardado lleva su propio nivel y fecha: si cambian mientras espera, se guarda donde corresponde.
  const guardarAhora = useCallback(
    async (pend) => {
      if (!pend?.ninos?.length) return
      setEstadoGuardado('guardando')
      const rows = pend.ninos.map((n) => ({
        nino_id: n.id,
        nivel_id: pend.nivelId,
        fecha: pend.fecha,
        presente: !!pend.mapa[n.id],
        tomada_por: userId,
      }))
      const { error } = await supabase.from('asistencia').upsert(rows, { onConflict: 'nino_id,fecha' })
      if (pendienteRef.current === pend) pendienteRef.current = null
      setEstadoGuardado(error ? 'error' : 'guardado')
      if (!error) onSavedRef.current?.()
    },
    [userId],
  )
  const guardarRef = useRef(guardarAhora)
  guardarRef.current = guardarAhora

  function programarGuardado(mapa) {
    const pend = { mapa, fecha, nivelId, ninos }
    pendienteRef.current = pend
    setEstadoGuardado('guardando')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(pend), ESPERA_GUARDADO_MS)
  }

  // Si cambia el nivel/fecha o se sale de la pantalla con un cambio pendiente, se guarda igual.
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
      if (pendienteRef.current) guardarRef.current(pendienteRef.current)
    }
  }, [nivelId, fecha])

  function celebrarSiCompleto(next) {
    const todosPresentes = ninos?.length > 0 && ninos.every((n) => next[n.id])
    if (todosPresentes && !celebradoRef.current) {
      celebradoRef.current = true
      setToast({ key: Date.now(), message: MENSAJES_COMPLETO[Math.floor(Math.random() * MENSAJES_COMPLETO.length)] })
    }
  }

  function toggle(ninoId) {
    if (bloqueado) return
    const next = { ...marcados, [ninoId]: !marcados[ninoId] }
    if (!next[ninoId] && eligiendo === ninoId) setEligiendo(null)
    setMarcados(next)
    celebrarSiCompleto(next)
    programarGuardado(next)
  }

  function marcarTodos() {
    if (bloqueado || !ninos) return
    const next = {}
    ninos.forEach((n) => (next[n.id] = true))
    setMarcados(next)
    celebrarSiCompleto(next)
    programarGuardado(next)
  }

  function desmarcarTodos() {
    if (bloqueado) return
    setMarcados({})
    setEligiendo(null)
    celebradoRef.current = false
    programarGuardado({})
  }

  async function darEstrellas(ids, motivo) {
    if (!ids.length) return
    setBusyEstrella(true)
    const { data, error } = await supabase
      .from('reconocimientos')
      .insert(ids.map((id) => ({ nino_id: id, nivel_id: nivelId, motivo: motivo || null, otorgado_por: userId })))
      .select('id, nino_id')
    setBusyEstrella(false)
    setEligiendo(null)
    if (error) {
      setToast({ key: Date.now(), message: 'No se pudo dar la estrella. Intenta de nuevo.' })
      return
    }
    playSound('estrella')
    setEstrellasPorNino((prev) => {
      const next = { ...prev }
      ;(data || []).forEach((r) => (next[r.nino_id] = (next[r.nino_id] || 0) + 1))
      return next
    })
    setHoyPorNino((prev) => {
      const next = { ...prev }
      ;(data || []).forEach((r) => (next[r.nino_id] = [...(next[r.nino_id] || []), r.id]))
      return next
    })
    const nombre = ids.length === 1 ? ninos.find((n) => n.id === ids[0])?.nombre_completo.split(' ')[0] : `${ids.length} niños`
    setToast({ key: Date.now(), message: `${mensajeAleatorio()} · ${nombre}` })
  }

  async function deshacerEstrella(ninoId) {
    const lista = hoyPorNino[ninoId] || []
    const ultima = lista[lista.length - 1]
    if (!ultima) return
    const { error } = await supabase.from('reconocimientos').delete().eq('id', ultima)
    if (error) return
    setHoyPorNino((prev) => ({ ...prev, [ninoId]: lista.slice(0, -1) }))
    setEstrellasPorNino((prev) => ({ ...prev, [ninoId]: Math.max(0, (prev[ninoId] || 1) - 1) }))
  }

  const presentes = (ninos || []).filter((n) => marcados[n.id]).map((n) => n.id)
  const total = ninos?.length || 0
  const pct = total > 0 ? Math.round((presentes.length / total) * 100) : 0

  if (!esStaff && diasClaseSet && !esDiaClase) {
    return (
      <div className="card flex flex-col items-center gap-3 py-12 text-center">
        <span className="text-4xl">📅</span>
        <p className="font-bold text-ink/65">Hoy no es día de clase</p>
        <p className="text-sm text-ink/65">Solo puedes tomar asistencia los días de clase</p>
      </div>
    )
  }

  const indicador =
    estadoGuardado === 'guardando' ? (
      <span className="text-sm font-bold text-ink/65">Guardando…</span>
    ) : estadoGuardado === 'guardado' ? (
      <span className="text-sm font-bold text-grass-700">✓ Guardado</span>
    ) : estadoGuardado === 'error' ? (
      <button type="button" onClick={() => guardarAhora({ mapa: marcados, fecha, nivelId, ninos })} className="text-sm font-bold text-coral-600 underline">
        ⚠️ No se guardó — reintentar
      </button>
    ) : null

  return (
    <div className="flex flex-col gap-4">
      <RewardBurst toast={toast} />

      <div className="card animate-pop-in !p-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b-2 border-ink/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-bold">{nivelNombre || 'Tomar asistencia'}</p>
            <p className="text-sm text-ink/70">
              {bloqueado ? '🔒 Solo se puede cambiar el mismo día de clase' : 'Toca a cada niño que vino. Se guarda solo.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {indicador}
            {esStaff ? (
              <FechaCampo value={fecha} onChange={(v) => setFecha(v)} flechas paso={7} className="w-full sm:w-auto sm:min-w-[20rem]" />
            ) : (
              <span className="text-sm font-bold text-ink/65">
                {fechaLarga(fecha)}
              </span>
            )}
          </div>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-ink/65">Cargando...</p>
          </div>
        ) : !ninos || total === 0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl">📭</p>
            <p className="mt-2 text-sm font-bold text-ink/65">No hay niños activos en este nivel.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/5 bg-ink/[0.02] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-grass-600">{presentes.length}</span>
                  <span className="text-sm font-bold text-ink/65">/ {total}</span>
                </div>
                <div className="h-2.5 w-24 overflow-hidden rounded-full bg-ink/10 sm:w-32">
                  <div className="h-full rounded-full bg-grass-400 transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-bold text-ink/65">{pct}%</span>
              </div>
              {!bloqueado && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={marcarTodos} className="rounded-full bg-grass-50 px-3 py-1.5 text-sm font-bold text-grass-700 hover:bg-grass-100">
                    ✅ Todos presentes
                  </button>
                  {presentes.length > 0 && (
                    <button type="button" onClick={() => setEligiendo(eligiendo === 'todos' ? null : 'todos')} className="rounded-full bg-sunshine-50 px-3 py-1.5 text-sm font-bold text-sunshine-800 hover:bg-sunshine-100">
                      ⭐ A todos los presentes
                    </button>
                  )}
                  <button type="button" onClick={desmarcarTodos} className="rounded-full px-3 py-1.5 text-sm font-bold text-ink/65 hover:bg-ink/5">
                    Limpiar
                  </button>
                </div>
              )}
            </div>

            {eligiendo === 'todos' && (
              <div className="border-b border-ink/5 p-4">
                <MotivoChips
                  titulo={`Estrella para ${presentes.length} presente${presentes.length === 1 ? '' : 's'} — ¿por qué?`}
                  motivos={motivos}
                  busy={busyEstrella}
                  onElegir={(m) => darEstrellas(presentes, m)}
                  onCancelar={() => setEligiendo(null)}
                />
              </div>
            )}

            <div className="divide-y divide-ink/5">
              {ninos.map((n) => {
                const presente = !!marcados[n.id]
                const stars = estrellasPorNino[n.id] || 0
                const badge = badgeActual(nivelesEstrella, stars)
                const hoy = (hoyPorNino[n.id] || []).length
                return (
                  <div key={n.id} className={`px-4 py-3 transition-colors ${presente ? 'bg-grass-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggle(n.id)}
                        disabled={bloqueado}
                        aria-pressed={presente}
                        aria-label={`${presente ? 'Quitar presente a' : 'Marcar presente a'} ${n.nombre_completo}`}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold shadow-pop transition-all active:translate-y-0.5 active:shadow-none ${
                          presente ? 'bg-grass-600 text-white ring-2 ring-grass-200' : 'bg-white text-ink/65 ring-2 ring-ink/10 hover:ring-ink/20'
                        } ${bloqueado ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        {presente ? '✓' : ''}
                      </button>

                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <button type="button" onClick={() => toggle(n.id)} disabled={bloqueado} className="shrink-0" tabIndex={-1} aria-hidden="true">
                          <Avatar nombre={n.nombre_completo} size="sm" />
                        </button>
                        <div className="min-w-0">
                          <button type="button" onClick={() => toggle(n.id)} disabled={bloqueado} tabIndex={-1} className={`block max-w-full truncate text-left text-sm font-bold ${presente ? 'text-grass-800' : 'text-ink'}`}>
                            {n.nombre_completo}
                          </button>
                          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-ink/65">
                            <span className="text-sm">{badge.emoji}</span>
                            <span>{stars} ⭐</span>
                            {hoy > 0 && (
                              <>
                                <span className="font-bold text-sunshine-800">+{hoy} hoy</span>
                                <button type="button" onClick={() => deshacerEstrella(n.id)} className="font-bold text-ink/65 underline" aria-label={`Quitar la última estrella de ${n.nombre_completo}`}>
                                  deshacer
                                </button>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {presente && (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEligiendo(eligiendo === n.id ? null : n.id)}
                            aria-label={`Dar estrella a ${n.nombre_completo}`}
                            title="Dar estrella"
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-sunshine-100 text-lg ring-2 ring-sunshine-200 transition-transform hover:scale-110 active:scale-95"
                          >
                            ⭐
                          </button>
                          {onProgreso && (
                            <button
                              type="button"
                              onClick={() => onProgreso(n)}
                              title="Nota de progreso"
                              aria-label={`Nota de progreso de ${n.nombre_completo}`}
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg ring-2 ring-grass-200 transition-transform hover:scale-110 active:scale-95"
                            >
                              🌱
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {eligiendo === n.id && (
                      <div className="mt-3">
                        <MotivoChips
                          titulo={`Estrella para ${n.nombre_completo.split(' ')[0]} — ¿por qué?`}
                          motivos={motivos}
                          busy={busyEstrella}
                          onElegir={(m) => darEstrellas([n.id], m)}
                          onCancelar={() => setEligiendo(null)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
