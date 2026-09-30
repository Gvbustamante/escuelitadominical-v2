import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { usePermisosRol } from '../../lib/permisosRol'
import Spinner from '../../components/Spinner'
import CitaDelDia from '../../components/CitaDelDia'
import ProximaAgenda from '../../components/ProximaAgenda'
import MiClase from '../../components/MiClase'
import ProximaClase from '../../components/inicio/ProximaClase'

/** Inicio del docente: su próxima clase (preparar y tomar asistencia) y los cuidados de sus niños. */
export default function DocenteHome() {
  const { profile, user } = useAuth()
  const { tiene } = usePermisosRol()
  const puedeElegirClase = tiene('docente', 'elegir_clase')
  const [nivelIds, setNivelIds] = useState(null)
  const [cuidados, setCuidados] = useState([])

  const load = useCallback(async () => {
    const { data: asign } = await supabase.from('docentes_niveles').select('nivel_id').eq('docente_id', user.id)
    const ids = (asign || []).map((a) => a.nivel_id)
    setNivelIds(ids)
    if (ids.length === 0) return setCuidados([])
    const { data: ninos } = await supabase
      .from('ninos')
      .select('id, nombre_completo, alergias, nivel:niveles(nombre)')
      .eq('activo', true)
      .in('nivel_id', ids)
      .not('alergias', 'is', null)
    setCuidados((ninos || []).filter((n) => n.alergias && n.alergias.trim()))
  }, [user.id])

  useEffect(() => { load() }, [load])

  if (!nivelIds) return <Spinner />

  const fechaHoy = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">¡Hola, {profile.nombre_completo.split(' ')[0]}! 🌟</h1>
        <p className="capitalize text-ink/70">{fechaHoy}</p>
      </div>

      {nivelIds.length === 0 && !puedeElegirClase && (
        <p className="card text-ink/75">Aún no tienes niveles asignados. Pide al administrador que te asigne uno en la sección Niveles.</p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {nivelIds.length > 0 && <ProximaClase nivelIds={nivelIds} userId={user.id} />}
          {puedeElegirClase && <MiClase onChange={load} />}
        </div>

        <aside className="flex flex-col gap-5">
          {cuidados.length > 0 && (
            <section className="card border-2 border-coral-200 !p-4" aria-labelledby="cuidados">
              <h2 id="cuidados" className="mb-2 font-bold text-coral-700">⚠️ Cuidados de tus niños</h2>
              <ul className="flex flex-col gap-1.5 text-sm">
                {cuidados.map((n) => (
                  <li key={n.id} className="flex flex-wrap justify-between gap-x-2">
                    <span className="font-bold">{n.nombre_completo}</span>
                    <span className="text-coral-700">{n.alergias}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <ProximaAgenda nivelIds={nivelIds} />
          <CitaDelDia />
        </aside>
      </div>
    </div>
  )
}
