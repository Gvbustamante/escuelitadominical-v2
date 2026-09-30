import { DOT_CLASSES } from '../lib/colors'

const STRIPE = {
  sky: 'border-l-sky-400',
  grass: 'border-l-grass-400',
  sunshine: 'border-l-sunshine-400',
  coral: 'border-l-coral-400',
  grape: 'border-l-grape-400',
}

const ESTADOS = [
  { key: 'ensenanza', letra: 'E', nombre: 'Enseñanza', on: 'bg-sunshine-400 text-ink' },
  { key: 'actividad', letra: 'A', nombre: 'Actividad', on: 'bg-grass-600 text-white' },
  { key: 'planeacion', letra: 'P', nombre: 'Planeación', on: 'bg-grape-500 text-white' },
]

function corto(nombre) {
  return (nombre || '').split(' ').slice(0, 2).join(' ')
}

/**
 * Cronograma estilo timeline: filas = niveles, columnas = días de clase del rango.
 * Cada celda: docentes del día y estado de la preparación (E·A·P). Tocarla abre "Preparar clase".
 */
export default function CronogramaNiveles({
  niveles,
  dias,
  hoy,
  actividades,
  devocionales,
  planeaciones,
  cobertura,
  asignaciones,
  asignacionesHorario,
  horarios,
  onAbrir,
}) {
  if (niveles.length === 0 || dias.length === 0) return null

  function docentesDe(nivelId, fecha) {
    const dia = new Date(fecha + 'T00:00:00').getDay()
    const horariosDia = horarios.filter((h) => h.dia_semana === null || h.dia_semana === dia)
    const nombres = []
    if (horariosDia.length > 0) {
      horariosDia.forEach((h) => {
        const override = cobertura.find((c) => c.nivel_id === nivelId && c.horario_id === h.id && c.fecha === fecha)
        const fijo = asignacionesHorario.find((a) => a.nivel_id === nivelId && a.horario_id === h.id)
        const n = override?.docente?.nombre_completo || fijo?.docente?.nombre_completo
        if (n) nombres.push({ nombre: n, cubre: !!override })
      })
    }
    if (nombres.length === 0) {
      asignaciones.filter((a) => a.nivel_id === nivelId).forEach((a) => a.docente?.nombre_completo && nombres.push({ nombre: a.docente.nombre_completo, cubre: false }))
    }
    const vistos = new Set()
    return nombres.filter((x) => (vistos.has(x.nombre) ? false : vistos.add(x.nombre)))
  }

  function estadoDe(nivelId, fecha) {
    return {
      ensenanza: devocionales.some((d) => d.fecha === fecha && (!d.nivel_id || d.nivel_id === nivelId)),
      actividad: actividades.some((a) => a.fecha === fecha && a.nivel_id === nivelId),
      planeacion: planeaciones.some((p) => p.fecha === fecha && p.nivel_id === nivelId),
    }
  }

  return (
    <div className="card overflow-hidden !p-0">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[8.5rem] bg-sky-50 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-ink/65">
                Nivel
              </th>
              {dias.map((f) => {
                const d = new Date(f + 'T00:00:00')
                const esHoy = f === hoy
                return (
                  <th key={f} className={`min-w-[7.5rem] px-2 py-2 text-center text-xs font-extrabold uppercase ${esHoy ? 'bg-sunshine-100 text-sunshine-800' : 'bg-sky-50 text-ink/65'}`}>
                    <span className="block">{d.toLocaleDateString('es', { weekday: 'short' })}</span>
                    <span className="block text-base normal-case text-ink">{d.getDate()} {d.toLocaleDateString('es', { month: 'short' })}</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {niveles.map((nivel) => (
              <tr key={nivel.id}>
                <th scope="row" className={`sticky left-0 z-10 border-l-4 border-t border-t-ink/5 bg-white px-3 py-2 ${STRIPE[nivel.color] || STRIPE.sky}`}>
                  <span className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_CLASSES[nivel.color] || DOT_CLASSES.sky}`} aria-hidden="true" />
                    <span className="text-sm font-bold leading-tight">{nivel.nombre}</span>
                  </span>
                </th>
                {dias.map((fecha) => {
                  const docs = docentesDe(nivel.id, fecha)
                  const est = estadoDe(nivel.id, fecha)
                  const listos = Object.values(est).filter(Boolean).length
                  const resumen = ESTADOS.map((e) => `${e.nombre} ${est[e.key] ? 'lista' : 'pendiente'}`).join(', ')
                  return (
                    <td key={fecha} className={`border-t border-ink/5 p-1.5 align-top ${fecha === hoy ? 'bg-sunshine-50/60' : ''}`}>
                      <button
                        type="button"
                        onClick={() => onAbrir(nivel, fecha)}
                        aria-label={`Preparar clase de ${nivel.nombre} el ${fecha}. ${resumen}.`}
                        className={`flex h-full w-full flex-col gap-1.5 rounded-xl p-2 text-left ring-1 transition-colors hover:bg-sky-50 hover:ring-sky-300 ${
                          listos === 3 ? 'bg-grass-50 ring-grass-200' : 'bg-white ring-ink/10'
                        }`}
                      >
                        <span className="min-h-[2.25rem] text-xs leading-snug">
                          {docs.length === 0 ? (
                            <span className="font-bold text-coral-600">Sin docente</span>
                          ) : (
                            docs.slice(0, 2).map((x) => (
                              <span key={x.nombre} className={`block truncate font-bold ${x.cubre ? 'text-grape-700' : 'text-ink/80'}`}>
                                {x.cubre ? '🔁 ' : ''}{corto(x.nombre)}
                              </span>
                            ))
                          )}
                          {docs.length > 2 && <span className="block text-ink/65">+{docs.length - 2} más</span>}
                        </span>
                        <span className="flex gap-1" aria-hidden="true">
                          {ESTADOS.map((e) => (
                            <span
                              key={e.key}
                              title={`${e.nombre}: ${est[e.key] ? 'lista' : 'pendiente'}`}
                              className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-extrabold ${est[e.key] ? e.on : 'bg-ink/5 text-ink/65'}`}
                            >
                              {e.letra}
                            </span>
                          ))}
                        </span>
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink/5 px-3 py-2 text-xs font-bold text-ink/70">
        {ESTADOS.map((e) => (
          <span key={e.key} className="flex items-center gap-1">
            <span className={`flex h-5 w-5 items-center justify-center rounded ${e.on}`}>{e.letra}</span> {e.nombre}
          </span>
        ))}
        <span>🔁 Cubre ese día</span>
        <span className="ml-auto">Toca una celda para preparar la clase</span>
      </div>
    </div>
  )
}
