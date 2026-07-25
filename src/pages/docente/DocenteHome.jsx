import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/Spinner'
import { BADGE_CLASSES } from '../../lib/colors'
import CitaDelDia from '../../components/CitaDelDia'

export default function DocenteHome() {
  const { profile, user } = useAuth()
  const [clases, setClases] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: asign } = await supabase.from('docentes_niveles').select('nivel_id').eq('docente_id', user.id)
      const nivelIds = (asign || []).map((a) => a.nivel_id)
      if (nivelIds.length === 0) {
        setClases([])
        return
      }
      const { data: niveles } = await supabase.from('niveles').select('*').in('id', nivelIds)
      const { data: ninos } = await supabase.from('ninos').select('id, nivel_id').eq('activo', true).in('nivel_id', nivelIds)
      const withCounts = (niveles || []).map((n) => ({
        ...n,
        count: (ninos || []).filter((c) => c.nivel_id === n.id).length,
      }))
      setClases(withCounts)
    }
    load()
  }, [user.id])

  if (!clases) return <Spinner />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">¡Hola, miss {profile.nombre_completo.split(' ')[0]}! 🌟</h1>
        <p className="text-ink/50">Tus clases asignadas</p>
      </div>

      <CitaDelDia />

      {clases.length === 0 && (
        <p className="card text-ink/50">
          Aún no tienes clases asignadas. Pide al administrador que te asigne una en la sección de Clases.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clases.map((c) => (
          <div key={c.id} className="card">
            <span className={`badge ${BADGE_CLASSES[c.color] || BADGE_CLASSES.sky}`}>{c.edad_min}-{c.edad_max} años</span>
            <h3 className="mt-2 text-xl font-bold">{c.nombre}</h3>
            <p className="text-ink/50">{c.count} niños activos</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/asistencia" className="card-link flex items-center gap-3">
          <span className="text-3xl">✅</span>
          <p className="font-bold">Tomar asistencia</p>
        </Link>
        <Link to="/actividades" className="card-link flex items-center gap-3">
          <span className="text-3xl">🎨</span>
          <p className="font-bold">Subir actividad</p>
        </Link>
        <Link to="/agenda" className="card-link flex items-center gap-3">
          <span className="text-3xl">📅</span>
          <p className="font-bold">Agendar evento</p>
        </Link>
      </div>
    </div>
  )
}
