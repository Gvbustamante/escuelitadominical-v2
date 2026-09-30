import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Avatar from './Avatar'
import Skeleton from './Skeleton'
import { hoyLocal } from '../lib/fechas'

function hoyISO() {
  return hoyLocal()
}

function hora(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

export default function ChecklistDocentesHoy() {
  const [estado, setEstado] = useState(null)

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

      const hoyInicio = `${hoy}T00:00:00`
      const hoyFin = `${hoy}T23:59:59`

      const [{ data: docentes }, { data: docentesNiveles }, { data: asistencia }, { data: bitacora }, { data: actividades }, { data: progreso }, { data: ninosCreados }] =
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
          supabase.from('ninos').select('creado_por, nombre_completo, created_at').gte('created_at', hoyInicio).lte('created_at', hoyFin),
        ])

      const clasesMap = {}
      ;(docentesNiveles || []).forEach((dn) => {
        if (!dn.nivel?.nombre) return
        clasesMap[dn.docente_id] = clasesMap[dn.docente_id] || []
        clasesMap[dn.docente_id].push(dn.nivel.nombre)
      })

      const filas = (docentes || []).map((doc) => {
        const asist = (asistencia || []).filter((a) => a.tomada_por === doc.id)
        const bita = (bitacora || []).filter((b) => b.docente_id === doc.id)
        const acts = (actividades || []).filter((a) => a.docente_id === doc.id)
        const progs = (progreso || []).filter((p) => p.docente_id === doc.id)
        const ninos = (ninosCreados || []).filter((n) => n.creado_por === doc.id)
        const totalAcciones = asist.length + bita.length + acts.length + progs.length + ninos.length

        return {
          id: doc.id,
          nombre: doc.nombre_completo,
          clases: clasesMap[doc.id] || [],
          asist,
          bita,
          acts,
          progs,
          ninos,
          totalAcciones,
        }
      })

      const conActividad = filas.filter((f) => f.totalAcciones > 0)
      conActividad.sort((a, b) => b.totalAcciones - a.totalAcciones)

      setEstado({ esDiaClase: true, docentes: conActividad, totalEquipo: filas.length })
    }
    load()
  }, [])

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

  const { docentes, totalEquipo } = estado

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Actividad del equipo hoy 👀</h2>
          <p className="text-sm text-ink/70">
            {docentes.length > 0
              ? `${docentes.length} de ${totalEquipo} docentes con actividad hoy`
              : 'Ningún docente ha registrado actividad hoy'}
          </p>
        </div>
        <Link
          to="/reporte-docentes"
          className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-200"
        >
          📊 Ver reporte completo →
        </Link>
      </div>

      {docentes.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink/10 py-8 text-center">
          <span className="text-4xl">😴</span>
          <p className="text-sm font-bold text-ink/65">Sin actividad registrada aún</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {docentes.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-grass-200 bg-grass-50/30 px-3 py-2.5"
            >
              <Avatar nombre={doc.nombre} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{doc.nombre}</p>
                {doc.clases.length > 0 && (
                  <p className="truncate text-xs text-ink/65">{doc.clases.join(', ')}</p>
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
                    📋 Bitácora x{doc.bita.length}
                  </span>
                )}
                {doc.acts.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-xs font-bold text-sky-700">
                    🎨 {doc.acts.length === 1 ? doc.acts[0].titulo : `${doc.acts.length} actividades`}
                  </span>
                )}
                {doc.progs.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sunshine-100 px-2 py-1 text-xs font-bold text-sunshine-800">
                    🌱 {doc.progs.length} nota{doc.progs.length !== 1 ? 's' : ''}
                  </span>
                )}
                {doc.ninos.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-coral-100 px-2 py-1 text-xs font-bold text-coral-700">
                    🧒 {doc.ninos.length} niño{doc.ninos.length !== 1 ? 's' : ''} agregado{doc.ninos.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
