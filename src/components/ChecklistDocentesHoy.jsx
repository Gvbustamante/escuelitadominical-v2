import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Avatar from './Avatar'
import Skeleton from './Skeleton'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Checklist diario — muestra qué ha hecho cada docente hoy:
 * ✅ tomó asistencia, ✅ registró bitácora, ⏳ falta, etc.
 * Solo aparece en días de clase.
 */
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

      const [{ data: docentes }, { data: docentesNiveles }, { data: asistencia }, { data: bitacora }, { data: actividades }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id, nombre_completo, role')
            .in('role', ['docente', 'coordinador'])
            .eq('activo', true)
            .order('nombre_completo'),
          supabase.from('docentes_niveles').select('docente_id, nivel:niveles(nombre)'),
          supabase.from('asistencia').select('tomada_por').eq('fecha', hoy),
          supabase.from('bitacora_clase').select('docente_id, momento').eq('fecha', hoy),
          supabase.from('actividades').select('docente_id').eq('fecha', hoy),
        ])

      // Sets para lookup rápido
      const tomoPor = new Set((asistencia || []).map((a) => a.tomada_por))
      const bitacoraAntes = new Set()
      const bitacoraDespues = new Set()
      ;(bitacora || []).forEach((b) => {
        if (b.momento === 'antes') bitacoraAntes.add(b.docente_id)
        if (b.momento === 'despues') bitacoraDespues.add(b.docente_id)
      })
      const creoActividad = new Set((actividades || []).map((a) => a.docente_id))

      // Clases asignadas por docente
      const clasesMap = {}
      ;(docentesNiveles || []).forEach((dn) => {
        if (!dn.nivel?.nombre) return
        clasesMap[dn.docente_id] = clasesMap[dn.docente_id] || []
        clasesMap[dn.docente_id].push(dn.nivel.nombre)
      })

      const filas = (docentes || []).map((doc) => {
        const asist = tomoPor.has(doc.id)
        const bitAntes = bitacoraAntes.has(doc.id)
        const bitDespues = bitacoraDespues.has(doc.id)
        const activ = creoActividad.has(doc.id)
        const clases = clasesMap[doc.id] || []
        const tareas = [asist, bitAntes, bitDespues].filter(Boolean).length
        const totalTareas = 3 // asistencia + bitácora antes + bitácora después

        return {
          id: doc.id,
          nombre: doc.nombre_completo,
          role: doc.role,
          clases,
          asist,
          bitAntes,
          bitDespues,
          activ,
          tareas,
          totalTareas,
          pct: Math.round((tareas / totalTareas) * 100),
        }
      })

      // Ordenar: los que tienen cosas pendientes primero
      filas.sort((a, b) => a.pct - b.pct)

      setEstado({ esDiaClase: true, docentes: filas })
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

  const { docentes } = estado
  if (docentes.length === 0) return null

  const todosListos = docentes.every((d) => d.pct === 100)
  const pendientes = docentes.filter((d) => d.pct < 100).length

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Checklist del equipo hoy 📝</h2>
          <p className="text-sm text-ink/50">¿Qué ha hecho cada docente hoy?</p>
        </div>
        {todosListos ? (
          <span className="badge bg-grass-100 text-grass-700">✅ Todos al día</span>
        ) : (
          <span className="badge bg-sunshine-100 text-sunshine-700">
            ⏳ {pendientes} con tareas pendientes
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {docentes.map((doc) => (
          <div
            key={doc.id}
            className={`flex flex-wrap items-center gap-3 rounded-2xl border-2 px-3 py-2.5 transition-colors ${
              doc.pct === 100 ? 'border-grass-200 bg-grass-50' : 'border-ink/5 bg-white'
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
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                  doc.asist ? 'bg-grass-100 text-grass-700' : 'bg-ink/5 text-ink/40'
                }`}
                title={doc.asist ? 'Tomó asistencia' : 'Falta tomar asistencia'}
              >
                {doc.asist ? '✅' : '⏳'} Asistencia
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                  doc.bitAntes ? 'bg-grass-100 text-grass-700' : 'bg-ink/5 text-ink/40'
                }`}
                title={doc.bitAntes ? 'Bitácora antes registrada' : 'Falta bitácora antes'}
              >
                {doc.bitAntes ? '✅' : '⏳'} Bitácora antes
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                  doc.bitDespues ? 'bg-grass-100 text-grass-700' : 'bg-ink/5 text-ink/40'
                }`}
                title={doc.bitDespues ? 'Bitácora después registrada' : 'Falta bitácora después'}
              >
                {doc.bitDespues ? '✅' : '⏳'} Bitácora después
              </span>
              {doc.activ && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-xs font-bold text-sky-700">
                  🎨 Actividad
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <Link to="/reporte-docentes" className="mt-3 inline-block text-sm font-bold text-sky-600 hover:underline">
        Ver reporte mensual completo →
      </Link>
    </div>
  )
}
