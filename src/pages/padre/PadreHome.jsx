import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useMisHijos } from '../../lib/useMisHijos'
import { useNivelesEstrella, badgeActual } from '../../lib/nivelesEstrella'
import { hoyLocal } from '../../lib/fechas'
import Spinner from '../../components/Spinner'
import { BADGE_CLASSES } from '../../lib/colors'
import CitaDelDia from '../../components/CitaDelDia'
import ProximaAgenda from '../../components/ProximaAgenda'
import { proximoDiaClase } from '../../components/inicio/ProximaClase'

function calcularEdad(fecha) {
  if (!fecha) return null
  const nacimiento = new Date(fecha + 'T00:00:00')
  const hoy = new Date()
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const m = hoy.getMonth() - nacimiento.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return edad
}

/** Tarjeta de un hijo: nivel, estrellas, asistencia del mes y lo último que aprendió. */
function HijoCard({ hijo, proximaClase }) {
  const niveles = useNivelesEstrella()
  const [info, setInfo] = useState(null)

  useEffect(() => {
    const hoy = hoyLocal()
    const inicioMes = hoy.slice(0, 8) + '01'
    Promise.all([
      supabase.from('reconocimientos').select('id', { count: 'exact', head: true }).eq('nino_id', hijo.id),
      supabase.from('asistencia').select('presente').eq('nino_id', hijo.id).gte('fecha', inicioMes).lte('fecha', hoy),
      hijo.nivel_id
        ? supabase.from('devocionales_ninos').select('id, titulo').lte('fecha', hoy).or(`nivel_id.eq.${hijo.nivel_id},nivel_id.is.null`).order('fecha', { ascending: false }).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
      hijo.nivel_id
        ? supabase.from('actividades').select('id, titulo').eq('nivel_id', hijo.nivel_id).eq('visible_padres', true).lte('fecha', hoy).order('fecha', { ascending: false }).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
    ]).then(([rec, asis, devo, act]) => {
      const filas = asis.data || []
      setInfo({ estrellas: rec.count ?? 0, clases: filas.length, vino: filas.filter((f) => f.presente).length, devo: devo.data, act: act.data })
    })
  }, [hijo.id, hijo.nivel_id])

  const edad = calcularEdad(hijo.fecha_nacimiento)
  const badge = badgeActual(niveles, info?.estrellas || 0)

  return (
    <article className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold">{hijo.nombre_completo}</h2>
          <p className="text-sm text-ink/70">{edad != null ? `${edad} años · ` : ''}{hijo.parentesco}</p>
        </div>
        {hijo.nivel && <span className={`badge shrink-0 ${BADGE_CLASSES[hijo.nivel.color] || BADGE_CLASSES.sky}`}>{hijo.nivel.nombre}</span>}
      </div>

      {hijo.alergias && <p className="rounded-xl bg-coral-50 px-3 py-1.5 text-sm font-bold text-coral-700">⚠️ Alergias: {hijo.alergias}</p>}

      <div className="grid grid-cols-2 gap-2">
        <Link to="/progreso" className="rounded-2xl bg-sunshine-50 p-3 hover:bg-sunshine-100">
          <p className="text-2xl font-bold leading-none">{badge.emoji} {info?.estrellas ?? '—'} ⭐</p>
          <p className="mt-1 text-xs font-bold text-sunshine-800">{badge.nombre}</p>
        </Link>
        <div className="rounded-2xl bg-grass-50 p-3">
          {info && info.clases === 0 ? (
            <p className="text-base font-bold leading-tight text-grass-800">Sin clases aún este mes</p>
          ) : (
            <>
              <p className="text-2xl font-bold leading-none">{info ? `${info.vino} de ${info.clases}` : '—'}</p>
              <p className="mt-1 text-xs font-bold text-grass-800">Clases este mes</p>
            </>
          )}
        </div>
      </div>

      {proximaClase && (
        <p className="text-sm text-ink/80">
          📅 Próxima clase: <span className="font-bold capitalize">{new Date(proximaClase + 'T00:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </p>
      )}

      {(info?.devo || info?.act) && (
        <div className="flex flex-col gap-1.5 border-t border-ink/5 pt-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/65">Lo último que aprendió</p>
          {info.devo && (
            <Link to={`/devocionales/${info.devo.id}`} className="flex items-center justify-between gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-800 hover:bg-sky-100">
              <span className="truncate">🙏 {info.devo.titulo}</span><span aria-hidden="true">→</span>
            </Link>
          )}
          {info.act && (
            <Link to={`/actividades/${info.act.id}`} className="flex items-center justify-between gap-2 rounded-xl bg-grape-50 px-3 py-2 text-sm font-bold text-grape-800 hover:bg-grape-100">
              <span className="truncate">🎨 {info.act.titulo}</span><span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      )}
    </article>
  )
}

/** Inicio del padre/madre: cada hijo con lo importante, tareas pendientes y agenda. */
export default function PadreHome() {
  const { profile } = useAuth()
  const hijos = useMisHijos()
  const [proximaClase, setProximaClase] = useState(null)

  useEffect(() => {
    supabase.from('dias_clase').select('dia_semana, activo').then(({ data }) => {
      setProximaClase(proximoDiaClase(new Set((data || []).filter((d) => d.activo).map((d) => d.dia_semana))))
    })
  }, [])

  if (!hijos) return <Spinner />

  const nivelIds = [...new Set(hijos.map((h) => h.nivel_id).filter(Boolean))]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">¡Hola, {profile.nombre_completo.split(' ')[0]}! 💛</h1>
        <p className="text-ink/70">Así va tu familia en la escuelita</p>
      </div>

      {hijos.length === 0 ? (
        <p className="card text-ink/75">Aún no tienes niños vinculados. Habla con la docente de tu hijo/a.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-2">
            {hijos.map((h) => <HijoCard key={h.id} hijo={h} proximaClase={proximaClase} />)}
          </div>
          <aside className="flex flex-col gap-5">
            <ProximaAgenda nivelIds={nivelIds} soloTareasPendientes hijoIds={hijos.map((h) => h.id)} />
            <CitaDelDia />
          </aside>
        </div>
      )}
    </div>
  )
}
