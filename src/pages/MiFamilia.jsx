import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useMisHijos } from '../lib/useMisHijos'
import Spinner from '../components/Spinner'
import HijoSelector from '../components/HijoSelector'
import { BADGE_CLASSES } from '../lib/colors'

function calcularEdad(fecha) {
  if (!fecha) return '—'
  const nacimiento = new Date(fecha)
  const hoy = new Date()
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const m = hoy.getMonth() - nacimiento.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return edad
}

export default function MiFamilia() {
  const { user } = useAuth()
  const hijos = useMisHijos()
  const [selectedId, setSelectedId] = useState(null)
  const [actividades, setActividades] = useState(null)
  const [notas, setNotas] = useState(null)
  const [eventos, setEventos] = useState(null)

  const hijo = hijos?.find((h) => h.id === selectedId) || hijos?.[0]

  useEffect(() => {
    async function load() {
      if (!hijo) return
      const [{ data: acts }, { data: prog }, { data: agenda }] = await Promise.all([
        supabase
          .from('actividades')
          .select('*, actividad_archivos(*)')
          .eq('nivel_id', hijo.nivel_id)
          .order('fecha', { ascending: false })
          .limit(5),
        supabase.from('progreso_notas').select('*').eq('nino_id', hijo.id).order('fecha', { ascending: false }).limit(5),
        supabase
          .from('agenda')
          .select('*')
          .or(`nivel_id.is.null,nivel_id.eq.${hijo.nivel_id}`)
          .gte('fecha', new Date().toISOString().slice(0, 10))
          .order('fecha')
          .limit(5),
      ])
      setActividades(acts || [])
      setNotas(prog || [])
      setEventos(agenda || [])
    }
    load()
  }, [hijo])

  if (!hijos) return <Spinner />

  if (hijos.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Mi familia 👪</h1>
        <p className="card text-ink/50">Todavía no tienes ningún hijo/a vinculado en la escuelita.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Mi familia 👪</h1>
        <p className="text-ink/50">La información de tu(s) hijo/a(s) en la escuelita</p>
      </div>

      <HijoSelector hijos={hijos} selectedId={selectedId} onChange={setSelectedId} />

      {hijo && (
        <>
          <div className="card">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{hijo.nombre_completo}</h2>
                <p className="text-sm text-ink/50">{calcularEdad(hijo.fecha_nacimiento)} años · {hijo.parentesco}</p>
              </div>
              {hijo.nivel && <span className={`badge ${BADGE_CLASSES[hijo.nivel.color] || BADGE_CLASSES.sky}`}>{hijo.nivel.nombre}</span>}
            </div>
            {hijo.alergias && (
              <p className="mt-2 rounded-xl bg-coral-50 px-3 py-1 text-xs font-bold text-coral-600">⚠️ Alergias: {hijo.alergias}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card">
              <h3 className="font-bold">🎨 Últimas actividades</h3>
              <div className="mt-2 flex flex-col gap-2">
                {(actividades || []).map((a) => (
                  <div key={a.id} className="text-sm">
                    <p className="font-bold">{a.titulo}</p>
                    <p className="text-ink/40">{a.fecha}</p>
                  </div>
                ))}
                {actividades && actividades.length === 0 && <p className="text-sm text-ink/40">Sin actividades todavía.</p>}
              </div>
            </div>
            <div className="card">
              <h3 className="font-bold">🌱 Progreso reciente</h3>
              <div className="mt-2 flex flex-col gap-2">
                {(notas || []).map((n) => (
                  <div key={n.id} className="text-sm">
                    <p className="font-bold">{n.fecha}</p>
                    {n.emocion && <p>{n.emocion}</p>}
                    {n.logros && <p className="text-ink/60">🌟 {n.logros}</p>}
                  </div>
                ))}
                {notas && notas.length === 0 && <p className="text-sm text-ink/40">Sin notas todavía.</p>}
              </div>
            </div>
            <div className="card">
              <h3 className="font-bold">📅 Próximos eventos</h3>
              <div className="mt-2 flex flex-col gap-2">
                {(eventos || []).map((e) => (
                  <div key={e.id} className="text-sm">
                    <p className="font-bold">{e.titulo}</p>
                    <p className="text-ink/40">{e.fecha}</p>
                  </div>
                ))}
                {eventos && eventos.length === 0 && <p className="text-sm text-ink/40">No hay eventos próximos.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
