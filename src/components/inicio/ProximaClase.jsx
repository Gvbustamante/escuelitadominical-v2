import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { hoyLocal, fechaLocal, capitalizar } from '../../lib/fechas'
import { DOT_CLASSES } from '../../lib/colors'
import PrepararClaseModal from '../PrepararClaseModal'

const STRIPE = { sky: 'border-l-sky-400', grass: 'border-l-grass-400', sunshine: 'border-l-sunshine-400', coral: 'border-l-coral-400', grape: 'border-l-grape-400' }
const PASOS = [
  { key: 'e', letra: 'E', nombre: 'Enseñanza', on: 'bg-sunshine-400 text-ink' },
  { key: 'a', letra: 'A', nombre: 'Actividad', on: 'bg-grass-600 text-white' },
  { key: 'p', letra: 'P', nombre: 'Planeación', on: 'bg-grape-500 text-white' },
]

/** Próximo día de clase desde hoy (incluye hoy). Sin días configurados: null. */
export function proximoDiaClase(diasActivos) {
  if (!diasActivos || diasActivos.size === 0) return null
  const d = new Date()
  for (let i = 0; i < 14; i++) {
    if (diasActivos.has(d.getDay())) return fechaLocal(d)
    d.setDate(d.getDate() + 1)
  }
  return null
}

function cuando(fecha, hoy) {
  if (fecha === hoy) return 'Hoy'
  const dias = Math.round((new Date(fecha + 'T00:00:00') - new Date(hoy + 'T00:00:00')) / 86400000)
  return dias === 1 ? 'Mañana' : `En ${dias} días`
}

/**
 * "Próxima clase": por nivel, docentes, asistencia y preparación (E·A·P), con acciones directas.
 * nivelIds: limitar a esos niveles (docente). Sin nivelIds: todos los activos (admin).
 */
export default function ProximaClase({ nivelIds, userId, puedePreparar = true }) {
  const [datos, setDatos] = useState(null)
  const [preparar, setPreparar] = useState(null)
  const hoy = hoyLocal()
  const nivelKey = nivelIds ? nivelIds.join(',') : null

  const cargar = useCallback(async () => {
    const ids = nivelKey === null ? null : nivelKey.split(',').filter(Boolean)
    const { data: dias } = await supabase.from('dias_clase').select('dia_semana, activo')
    const fecha = proximoDiaClase(new Set((dias || []).filter((d) => d.activo).map((d) => d.dia_semana)))
    if (!fecha) return setDatos({ fecha: null, niveles: [] })
    let qNiv = supabase.from('niveles').select('id, nombre, color, orden').eq('activo', true).order('orden')
    if (ids) qNiv = qNiv.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
    const [{ data: niveles }, { data: devos }, { data: acts }, { data: plans }, { data: asis }, { data: asign }, { data: cob }, { data: ninos }] = await Promise.all([
      qNiv,
      supabase.from('devocionales_ninos').select('id, titulo, nivel_id').eq('fecha', fecha),
      supabase.from('actividades').select('id, nivel_id').eq('fecha', fecha),
      supabase.from('planeacion_clase').select('id, nivel_id').eq('fecha', fecha),
      supabase.from('asistencia').select('nivel_id, presente').eq('fecha', fecha),
      supabase.from('docentes_niveles').select('nivel_id, docente:profiles(nombre_completo)'),
      supabase.from('cobertura_dia').select('nivel_id, docente:profiles(nombre_completo)').eq('fecha', fecha),
      supabase.from('ninos').select('id, nivel_id').eq('activo', true),
    ])
    setDatos({
      fecha,
      niveles: (niveles || []).map((n) => {
        const cubre = (cob || []).filter((c) => c.nivel_id === n.id).map((c) => c.docente?.nombre_completo).filter(Boolean)
        const fijos = (asign || []).filter((a) => a.nivel_id === n.id).map((a) => a.docente?.nombre_completo).filter(Boolean)
        const registros = (asis || []).filter((a) => a.nivel_id === n.id)
        return {
          ...n,
          docentes: cubre.length ? cubre : fijos,
          cubre: cubre.length > 0,
          ninos: (ninos || []).filter((x) => x.nivel_id === n.id).length,
          asistenciaTomada: registros.length > 0,
          presentes: registros.filter((r) => r.presente).length,
          ensenanza: (devos || []).find((d) => !d.nivel_id || d.nivel_id === n.id)?.titulo || null,
          est: {
            e: (devos || []).some((d) => !d.nivel_id || d.nivel_id === n.id),
            a: (acts || []).some((x) => x.nivel_id === n.id),
            p: (plans || []).some((x) => x.nivel_id === n.id),
          },
        }
      }),
    })
  }, [nivelKey])

  useEffect(() => { cargar() }, [cargar])

  if (!datos) return <div className="card h-40 animate-pulse bg-white/60" aria-busy="true" />
  if (!datos.fecha) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold">📅 Próxima clase</p>
          <p className="text-sm text-ink/70">Todavía no hay días de clase configurados.</p>
        </div>
        <Link to="/ajustes" className="btn-primary !py-2 !text-sm">Configurar días de clase</Link>
      </div>
    )
  }

  const esHoy = datos.fecha === hoy
  const fechaTxt = capitalizar(new Date(datos.fecha + 'T00:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }))
  const sinPreparar = datos.niveles.filter((n) => !(n.est.e && n.est.a && n.est.p)).length

  return (
    <section className="card !p-0 overflow-hidden" aria-labelledby="proxima-clase">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/5 bg-sky-50/70 px-4 py-3 sm:px-5">
        <div>
          <h2 id="proxima-clase" className="text-lg font-bold">📅 Próxima clase · <span>{fechaTxt}</span></h2>
          <p className="text-sm text-ink/70">
            <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-extrabold ${esHoy ? 'bg-grass-600 text-white' : 'bg-white text-sky-700'}`}>{cuando(datos.fecha, hoy)}</span>
            {datos.niveles.length === 0 ? 'Sin niveles' : sinPreparar === 0 ? 'Todos los niveles están listos ✅' : `${sinPreparar} de ${datos.niveles.length} nivel${datos.niveles.length === 1 ? '' : 'es'} por preparar`}
          </p>
        </div>
        <Link to="/planeacion" className="text-sm font-bold text-sky-700 hover:underline">Ver cronograma →</Link>
      </div>

      {datos.niveles.length === 0 ? (
        <p className="p-5 text-sm text-ink/70">No tienes niveles asignados.</p>
      ) : (
        <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
          {datos.niveles.map((n) => {
            const listos = Object.values(n.est).filter(Boolean).length
            return (
              <article key={n.id} className={`flex flex-col gap-3 rounded-2xl border-l-4 bg-white p-3 ring-1 ring-ink/10 ${STRIPE[n.color] || STRIPE.sky}`}>
                <div className="flex flex-col gap-2">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 font-bold">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_CLASSES[n.color] || DOT_CLASSES.sky}`} aria-hidden="true" />
                      <span className="truncate">{n.nombre}</span>
                    </h3>
                    <p className="text-xs text-ink/70">
                      {n.ninos} niño{n.ninos === 1 ? '' : 's'} · {n.docentes.length ? `${n.cubre ? '🔁 ' : ''}${n.docentes.map((d) => d.split(' ')[0]).join(', ')}` : <span className="font-bold text-coral-600">Sin docente</span>}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1" aria-label={`Preparación ${listos} de 3`}>
                    {PASOS.map((p) => (
                      <span key={p.key} title={`${p.nombre}: ${n.est[p.key] ? 'lista' : 'pendiente'}`} className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-extrabold ${n.est[p.key] ? p.on : 'bg-ink/5 text-ink/65'}`}>
                        {p.letra}
                      </span>
                    ))}
                    <span className="ml-1 text-xs font-bold text-ink/65">{listos === 3 ? 'Lista' : `${listos} de 3`}</span>
                  </span>
                </div>

                {n.ensenanza && <p className="truncate text-sm text-ink/80">🙏 {n.ensenanza}</p>}

                <div className="flex flex-wrap items-center gap-2">
                  {esHoy ? (
                    n.asistenciaTomada ? (
                      <Link to="/asistencia" className="rounded-full bg-grass-50 px-3 py-1.5 text-sm font-bold text-grass-800 hover:bg-grass-100">✅ {n.presentes}/{n.ninos} presentes</Link>
                    ) : (
                      <Link to="/asistencia" className="btn-success !py-1.5 !text-sm">Tomar asistencia</Link>
                    )
                  ) : null}
                  {puedePreparar && (
                    <button
                      type="button"
                      onClick={() => setPreparar(n)}
                      className={listos === 3 ? 'rounded-full bg-ink/5 px-3 py-1.5 text-sm font-bold text-ink/75 hover:bg-sky-50' : 'btn-primary !py-1.5 !text-sm'}
                    >
                      {listos === 3 ? 'Ver preparación' : '✨ Preparar clase'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <PrepararClaseModal
        open={!!preparar}
        onClose={() => { setPreparar(null); cargar() }}
        nivel={preparar}
        fecha={datos.fecha}
        userId={userId}
        onSaved={cargar}
      />
    </section>
  )
}
