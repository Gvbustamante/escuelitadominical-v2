import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BADGE_CLASSES, DOT_CLASSES } from '../lib/colors'

const DIAS_NOMBRE = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function HorarioSemanal({
  diasClase,
  niveles,
  docentes,
  asignaciones,
  asignacionesHorario,
  devocionalesMes,
  esDocente,
  miId,
}) {
  const navigate = useNavigate()

  const diasActivos = useMemo(
    () => (diasClase || []).filter((d) => d.activo).map((d) => d.dia_semana).sort((a, b) => a - b),
    [diasClase],
  )

  const equipoData = useMemo(() => {
    return (docentes || []).map((docente) => {
      const clasesIds = new Set()
      ;(asignaciones || [])
        .filter((a) => a.docente_id === docente.id)
        .forEach((a) => clasesIds.add(a.nivel_id))
      ;(asignacionesHorario || [])
        .filter((a) => a.docente_id === docente.id)
        .forEach((a) => clasesIds.add(a.nivel_id))

      const clases = (niveles || []).filter((n) => clasesIds.has(n.id))
      const devos = (devocionalesMes || []).filter((d) => clasesIds.has(d.nivel_id) || !d.nivel_id)

      return { docente, clases, devos }
    }).sort((a, b) => {
      if (a.clases.length > 0 && b.clases.length === 0) return -1
      if (a.clases.length === 0 && b.clases.length > 0) return 1
      return a.docente.nombre_completo.localeCompare(b.docente.nombre_completo)
    })
  }, [docentes, asignaciones, asignacionesHorario, niveles, devocionalesMes])

  if (diasActivos.length === 0) {
    return (
      <div className="card border-2 border-sunshine-200 bg-sunshine-50">
        <p className="font-bold text-sunshine-800">No hay días de clase configurados.</p>
        <p className="mt-1 text-sm text-ink/75">Ve a Ajustes → Días de clase para activarlos.</p>
      </div>
    )
  }

  if (equipoData.length === 0) {
    return <p className="text-center text-ink/65">No hay miembros del equipo registrados.</p>
  }

  const diasLabel = diasActivos.map((d) => DIAS_NOMBRE[d]).join(', ')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="card flex items-center gap-2 !px-3 !py-2">
          <span className="text-lg font-extrabold text-sky-600">{equipoData.filter((e) => e.clases.length > 0).length}</span>
          <span className="text-xs font-bold text-ink/65">Docentes activos</span>
        </div>
        <div className="card flex items-center gap-2 !px-3 !py-2">
          <span className="text-lg font-extrabold text-grass-600">{(niveles || []).length}</span>
          <span className="text-xs font-bold text-ink/65">Clases</span>
        </div>
        <div className="card flex items-center gap-2 !px-3 !py-2">
          <span className="text-lg font-extrabold text-sunshine-600">{(devocionalesMes || []).length}</span>
          <span className="text-xs font-bold text-ink/65">Devocionales</span>
        </div>
        <span className="text-xs text-ink/65">Días de clase: {diasLabel}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {equipoData.map(({ docente, clases, devos }) => {
          const esMio = docente.id === miId
          const primerColor = clases[0]?.color || 'sky'

          return (
            <div
              key={docente.id}
              className={`card overflow-hidden !p-0 ${esMio ? 'ring-2 ring-sky-300' : ''}`}
            >
              <div className="flex items-center gap-2.5 bg-ink/[0.02] px-3 py-2.5">
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${DOT_CLASSES[primerColor] || DOT_CLASSES.sky}`}>
                  {docente.nombre_completo.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{docente.nombre_completo}</p>
                  {clases.length > 0 ? (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {clases.map((c) => (
                        <span key={c.id} className={`inline-block rounded-full px-1.5 py-0 text-xs font-bold ${BADGE_CLASSES[c.color || 'sky'] || BADGE_CLASSES.sky}`}>
                          {c.nombre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-ink/65">Sin clases asignadas</p>
                  )}
                </div>
              </div>

              {clases.length > 0 && (
                <div className="border-t border-ink/5 px-3 py-2">
                  <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-ink/65">Devocionales del mes</p>
                  {devos.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {devos.slice(0, 4).map((d) => {
                        const fecha = new Date(d.fecha + 'T00:00:00')
                        const fechaStr = fecha.toLocaleDateString('es', { day: 'numeric', month: 'short' })
                        return (
                          <div
                            key={d.id}
                            className="flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-sunshine-50/80"
                            onClick={() => navigate(`/devocionales/${d.id}`)}
                          >
                            <p className="min-w-0 flex-1 truncate text-xs font-medium text-sunshine-800">{d.titulo}</p>
                            <span className="shrink-0 text-xs text-ink/65">{fechaStr}</span>
                          </div>
                        )
                      })}
                      {devos.length > 4 && (
                        <p className="px-1.5 text-xs text-ink/65">+{devos.length - 4} más</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-ink/65">Sin devocionales este mes</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!esDocente && (
        <p className="text-center text-xs text-ink/65">
          Para cambiar las asignaciones de docentes, ve a <strong>Clases</strong>.
        </p>
      )}
    </div>
  )
}
