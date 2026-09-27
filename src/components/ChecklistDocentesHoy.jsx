import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Avatar from './Avatar'
import Modal from './Modal'
import Skeleton from './Skeleton'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function hora(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function fechaCorta(f) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export default function ChecklistDocentesHoy() {
  const [estado, setEstado] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [historial, setHistorial] = useState(null)

  useEffect(() => {
    async function load() {
      const hoy = hoyISO()
      const diaSemana = new Date().getDay()

      const { data: diasClase } = await supabase.from('dias_clase').select('dia_semana, activo')
      const esDiaClase = (diasClase || []).some((d) => d.dia_semana === diaSemana && d.activo)

      if (!esDiaClase) {
        setEstado({ esDiaClase: false, docentes: [] })
        return
      }

      const [{ data: docentes }, { data: docentesNiveles }, { data: asistencia }, { data: bitacora }, { data: actividades }, { data: progreso }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id, nombre_completo, role')
            .in('role', ['docente', 'coordinador'])
            .eq('activo', true)
            .order('nombre_completo'),
          supabase.from('docentes_niveles').select('docente_id, nivel:niveles(id, nombre)'),
          supabase.from('asistencia').select('tomada_por, nivel_id, created_at, nivel:niveles(nombre)').eq('fecha', hoy),
          supabase.from('bitacora_clase').select('docente_id, momento, created_at, nivel:niveles(nombre)').eq('fecha', hoy),
          supabase.from('actividades').select('docente_id, titulo, created_at, nivel:niveles(nombre)').eq('fecha', hoy),
          supabase.from('progreso_notas').select('docente_id, created_at, nino:ninos(nombre_completo)').eq('fecha', hoy),
        ])

      const clasesMap = {}
      ;(docentesNiveles || []).forEach((dn) => {
        if (!dn.nivel?.nombre) return
        clasesMap[dn.docente_id] = clasesMap[dn.docente_id] || []
        clasesMap[dn.docente_id].push(dn.nivel.nombre)
      })

      const asistPorDocente = {}
      ;(asistencia || []).forEach((a) => {
        asistPorDocente[a.tomada_por] = asistPorDocente[a.tomada_por] || []
        asistPorDocente[a.tomada_por].push(a)
      })

      const bitaPorDocente = {}
      ;(bitacora || []).forEach((b) => {
        bitaPorDocente[b.docente_id] = bitaPorDocente[b.docente_id] || []
        bitaPorDocente[b.docente_id].push(b)
      })

      const actPorDocente = {}
      ;(actividades || []).forEach((a) => {
        actPorDocente[a.docente_id] = actPorDocente[a.docente_id] || []
        actPorDocente[a.docente_id].push(a)
      })

      const progPorDocente = {}
      ;(progreso || []).forEach((p) => {
        progPorDocente[p.docente_id] = progPorDocente[p.docente_id] || []
        progPorDocente[p.docente_id].push(p)
      })

      const filas = (docentes || []).map((doc) => {
        const asist = asistPorDocente[doc.id] || []
        const bita = bitaPorDocente[doc.id] || []
        const acts = actPorDocente[doc.id] || []
        const progs = progPorDocente[doc.id] || []
        const clases = clasesMap[doc.id] || []
        const totalAcciones = asist.length + bita.length + acts.length + progs.length

        return {
          id: doc.id,
          nombre: doc.nombre_completo,
          role: doc.role,
          clases,
          asist,
          bita,
          acts,
          progs,
          totalAcciones,
        }
      })

      filas.sort((a, b) => b.totalAcciones - a.totalAcciones)

      setEstado({ esDiaClase: true, docentes: filas })
    }
    load()
  }, [])

  async function abrirHistorial(doc) {
    setDetalle(doc)
    setHistorial(null)

    const hace14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const [{ data: asist }, { data: bita }, { data: acts }, { data: progs }] = await Promise.all([
      supabase.from('asistencia').select('fecha, created_at, nivel:niveles(nombre)').eq('tomada_por', doc.id).gte('fecha', hace14).order('fecha', { ascending: false }),
      supabase.from('bitacora_clase').select('fecha, momento, created_at, nivel:niveles(nombre)').eq('docente_id', doc.id).gte('fecha', hace14).order('fecha', { ascending: false }),
      supabase.from('actividades').select('fecha, titulo, created_at, nivel:niveles(nombre)').eq('docente_id', doc.id).gte('fecha', hace14).order('fecha', { ascending: false }),
      supabase.from('progreso_notas').select('fecha, created_at, nino:ninos(nombre_completo)').eq('docente_id', doc.id).gte('fecha', hace14).order('fecha', { ascending: false }),
    ])

    const eventos = []
    const asistFechas = new Set()
    ;(asist || []).forEach((a) => {
      const key = `asist-${a.fecha}-${a.nivel?.nombre}`
      if (!asistFechas.has(key)) {
        asistFechas.add(key)
        eventos.push({ fecha: a.fecha, hora: hora(a.created_at), tipo: 'Asistencia', detalle: a.nivel?.nombre || '', icon: '✅' })
      }
    })
    ;(bita || []).forEach((b) => {
      eventos.push({ fecha: b.fecha, hora: hora(b.created_at), tipo: `Bitacora ${b.momento}`, detalle: b.nivel?.nombre || '', icon: '📋' })
    })
    ;(acts || []).forEach((a) => {
      eventos.push({ fecha: a.fecha, hora: hora(a.created_at), tipo: 'Actividad', detalle: a.titulo, icon: '🎨' })
    })
    ;(progs || []).forEach((p) => {
      eventos.push({ fecha: p.fecha, hora: hora(p.created_at), tipo: 'Nota de progreso', detalle: p.nino?.nombre_completo || '', icon: '🌱' })
    })

    eventos.sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora))

    const agrupado = {}
    eventos.forEach((e) => {
      agrupado[e.fecha] = agrupado[e.fecha] || []
      agrupado[e.fecha].push(e)
    })

    setHistorial(agrupado)
  }

  if (estado === null) {
    return (
      <div className="card">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-3 h-16 w-full" />
        <Skeleton className="mt-2 h-16 w-full" />
      </div>
    )
  }

  if (!estado.esDiaClase) return null

  const { docentes } = estado
  if (docentes.length === 0) return null

  return (
    <div className="card">
      <div>
        <h2 className="text-xl font-bold">Actividad del equipo hoy 👀</h2>
        <p className="text-sm text-ink/50">¿Que ha hecho cada docente hoy? Toca uno para ver su historial.</p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {docentes.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => abrirHistorial(doc)}
            className={`flex flex-wrap items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-left transition-colors hover:bg-sky-50/50 ${
              doc.totalAcciones > 0 ? 'border-grass-200 bg-grass-50/30' : 'border-ink/5 bg-white'
            }`}
          >
            <Avatar nombre={doc.nombre} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{doc.nombre}</p>
              {doc.clases.length > 0 && (
                <p className="truncate text-xs text-ink/40">{doc.clases.join(', ')}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {doc.asist.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-grass-100 px-2 py-1 text-xs font-bold text-grass-700">
                  ✅ Asistencia
                  {doc.asist.length > 1 && <span className="text-grass-500">x{doc.asist.length}</span>}
                </span>
              )}
              {doc.bita.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-grape-100 px-2 py-1 text-xs font-bold text-grape-700">
                  📋 Bitacora x{doc.bita.length}
                </span>
              )}
              {doc.acts.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-xs font-bold text-sky-700">
                  🎨 {doc.acts.length === 1 ? doc.acts[0].titulo : `${doc.acts.length} actividades`}
                </span>
              )}
              {doc.progs.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sunshine-100 px-2 py-1 text-xs font-bold text-sunshine-700">
                  🌱 {doc.progs.length} nota{doc.progs.length !== 1 ? 's' : ''}
                </span>
              )}
              {doc.totalAcciones === 0 && (
                <span className="text-xs text-ink/30">Sin actividad hoy</span>
              )}
            </div>

            <span className="text-ink/20">→</span>
          </button>
        ))}
      </div>

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={`Historial — ${detalle?.nombre || ''}`}>
        <div className="flex flex-col gap-4">
          {detalle && (
            <div className="flex items-center gap-3 rounded-2xl bg-sky-50 px-4 py-3">
              <Avatar nombre={detalle.nombre} size="md" />
              <div>
                <p className="font-bold">{detalle.nombre}</p>
                {detalle.clases.length > 0 && <p className="text-sm text-ink/50">{detalle.clases.join(', ')}</p>}
              </div>
            </div>
          )}

          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/40">Ultimas 2 semanas</p>

          {!historial ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : Object.keys(historial).length === 0 ? (
            <p className="text-sm text-ink/40">Sin actividad en las ultimas 2 semanas.</p>
          ) : (
            Object.entries(historial).map(([fecha, eventos]) => (
              <div key={fecha}>
                <p className="mb-1.5 text-sm font-bold text-ink/50">{fechaCorta(fecha)}</p>
                <div className="flex flex-col gap-1">
                  {eventos.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-xl bg-ink/5 px-3 py-2 text-sm">
                      <span>{e.icon}</span>
                      <span className="font-bold">{e.tipo}</span>
                      {e.detalle && <span className="text-ink/50">· {e.detalle}</span>}
                      {e.hora && <span className="ml-auto shrink-0 text-xs text-ink/30">{e.hora}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}
