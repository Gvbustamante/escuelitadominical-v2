import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

const cuenta = (q) => q.then(({ count }) => (count ?? 0) > 0)

// Cada paso: cómo saber si está hecho, y a dónde ir para hacerlo.
const PASOS = [
  { key: 'iglesia', titulo: 'Pon el nombre y logo de tu iglesia', ayuda: 'Así la plataforma se ve como tuya.', to: '/ajustes',
    check: () => supabase.from('config_iglesia').select('nombre_iglesia, logo_url').limit(1).maybeSingle().then(({ data }) => !!(data?.nombre_iglesia || data?.logo_url)) },
  { key: 'dias', titulo: 'Elige los días de clase', ayuda: 'Por ejemplo, domingo. Se usa en asistencia y planeación.', to: '/ajustes',
    check: () => cuenta(supabase.from('dias_clase').select('dia_semana', { count: 'exact', head: true }).eq('activo', true)) },
  { key: 'clases', titulo: 'Crea tus clases', ayuda: 'Una por grupo de edad (ej. Pequeños Héroes, 3–5 años).', to: '/clases',
    check: () => cuenta(supabase.from('niveles').select('id', { count: 'exact', head: true })) },
  { key: 'docentes', titulo: 'Agrega a tu equipo docente', ayuda: 'Cada docente recibe su usuario y contraseña.', to: '/docentes',
    check: () => cuenta(supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'docente')) },
  { key: 'asignar', titulo: 'Asigna cada docente a su clase', ayuda: 'En Clases, edita una clase y marca sus docentes.', to: '/clases',
    check: () => cuenta(supabase.from('docentes_niveles').select('docente_id', { count: 'exact', head: true })) },
  { key: 'ninos', titulo: 'Registra a los niños', ayuda: 'Nombre, edad y clase. Lo pueden hacer también los docentes.', to: '/ninos',
    check: () => cuenta(supabase.from('ninos').select('id', { count: 'exact', head: true })) },
  { key: 'padres', titulo: 'Vincula a los padres', ayuda: 'En la tarjeta de cada niño → Vincular padre.', to: '/ninos',
    check: () => cuenta(supabase.from('ninos_padres').select('nino_id', { count: 'exact', head: true })) },
  { key: 'devocional', titulo: 'Publica tu primer devocional', ayuda: 'La enseñanza que verán niños y familias.', to: '/devocionales',
    check: () => cuenta(supabase.from('devocionales_ninos').select('id', { count: 'exact', head: true })) },
  { key: 'asistencia', titulo: 'Toma asistencia el día de clase', ayuda: 'Los docentes marcan quién vino, en segundos.', to: '/asistencia',
    check: () => cuenta(supabase.from('asistencia').select('id', { count: 'exact', head: true })) },
]

function claveOculto(userId) {
  return `primeros-pasos-oculto:${userId}`
}

/** Lista de configuración inicial para admins. Se oculta sola cuando todo está hecho. */
export default function PrimerosPasos() {
  const { user } = useAuth()
  const [hechos, setHechos] = useState(null)
  const [oculto, setOculto] = useState(() => {
    try { return localStorage.getItem(claveOculto(user?.id)) === '1' } catch { return false }
  })
  const [abierto, setAbierto] = useState(true)

  useEffect(() => {
    if (oculto) return
    Promise.all(PASOS.map((p) => p.check().catch(() => false))).then((r) =>
      setHechos(Object.fromEntries(PASOS.map((p, i) => [p.key, r[i]]))),
    )
  }, [oculto])

  if (oculto || !hechos) return null
  const total = PASOS.length
  const listos = PASOS.filter((p) => hechos[p.key]).length
  if (listos === total) return null
  const siguiente = PASOS.find((p) => !hechos[p.key])

  function ocultar() {
    try { localStorage.setItem(claveOculto(user?.id), '1') } catch { /* sin almacenamiento */ }
    setOculto(true)
  }

  return (
    <section className="card border-2 border-sky-200 !p-0" aria-labelledby="primeros-pasos-titulo">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6">
        <div>
          <h2 id="primeros-pasos-titulo" className="text-xl font-bold">🚀 Primeros pasos</h2>
          <p className="text-sm text-ink/70">Configura tu escuelita en este orden. Vas {listos} de {total}.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setAbierto((a) => !a)} className="rounded-full bg-ink/5 px-3 py-1.5 text-sm font-bold text-ink/75 hover:bg-ink/10">
            {abierto ? 'Contraer' : 'Ver pasos'}
          </button>
          <button type="button" onClick={ocultar} className="rounded-full px-3 py-1.5 text-sm font-bold text-ink/65 hover:bg-ink/5">
            Ocultar
          </button>
        </div>
      </div>

      <div className="mx-4 mt-3 h-2 overflow-hidden rounded-full bg-ink/5 sm:mx-6" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={listos}>
        <div className="h-full rounded-full bg-grass-400 transition-all" style={{ width: `${(listos / total) * 100}%` }} />
      </div>

      {abierto ? (
        <ol className="mt-3 divide-y divide-ink/5">
          {PASOS.map((p, i) => {
            const hecho = hechos[p.key]
            const esSiguiente = p.key === siguiente?.key
            return (
              <li key={p.key} className={`flex items-center gap-3 px-4 py-3 sm:px-6 ${esSiguiente ? 'bg-sky-50/70' : ''}`}>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${hecho ? 'bg-grass-100 text-grass-700' : esSiguiente ? 'bg-sky-400 text-white' : 'bg-ink/5 text-ink/65'}`}
                  aria-hidden="true"
                >
                  {hecho ? '✓' : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`font-bold ${hecho ? 'text-ink/65 line-through' : ''}`}>{p.titulo}</p>
                  {!hecho && <p className="text-sm text-ink/70">{p.ayuda}</p>}
                </div>
                {!hecho && (
                  <Link to={p.to} className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold ${esSiguiente ? 'bg-sky-400 text-white hover:bg-sky-500' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'}`}>
                    Ir →
                  </Link>
                )}
                <span className="sr-only">{hecho ? 'Hecho' : 'Pendiente'}</span>
              </li>
            )
          })}
        </ol>
      ) : (
        siguiente && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm"><span className="font-bold">Siguiente:</span> {siguiente.titulo}</p>
            <Link to={siguiente.to} className="shrink-0 rounded-full bg-sky-400 px-4 py-1.5 text-sm font-bold text-white hover:bg-sky-500">Ir →</Link>
          </div>
        )
      )}
      <div className="h-2" />
    </section>
  )
}
