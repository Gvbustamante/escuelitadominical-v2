import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import StatCard from '../../components/StatCard'
import Spinner from '../../components/Spinner'
import CitaDelDia from '../../components/CitaDelDia'

export default function AdminHome() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10)
      const [ninos, clases, docentes, asistenciaHoy] = await Promise.all([
        supabase.from('ninos').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('niveles').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['docente', 'coordinador']).eq('activo', true),
        supabase.from('asistencia').select('id', { count: 'exact', head: true }).eq('fecha', today).eq('presente', true),
      ])
      setStats({
        ninos: ninos.count ?? 0,
        clases: clases.count ?? 0,
        docentes: docentes.count ?? 0,
        asistenciaHoy: asistenciaHoy.count ?? 0,
      })
    }
    load()
  }, [])

  if (!stats) return <Spinner />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">¡Hola, {profile.nombre_completo.split(' ')[0]}! 👋</h1>
        <p className="text-ink/50">Este es el resumen de tu escuelita hoy.</p>
      </div>

      <CitaDelDia />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon="🧒" label="Niños activos" value={stats.ninos} color="sky" />
        <StatCard icon="🎒" label="Clases activas" value={stats.clases} color="grass" />
        <StatCard icon="🍎" label="Docentes / coordinadores" value={stats.docentes} color="sunshine" />
        <StatCard icon="✅" label="Asistencia de hoy" value={stats.asistenciaHoy} color="grape" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link to="/ninos" className="card-link flex items-center gap-3">
          <span className="text-3xl">🧒</span>
          <div>
            <p className="font-bold">Gestionar niños</p>
            <p className="text-sm text-ink/50">Agregar, editar, desactivar</p>
          </div>
        </Link>
        <Link to="/clases" className="card-link flex items-center gap-3">
          <span className="text-3xl">🎒</span>
          <div>
            <p className="font-bold">Gestionar clases</p>
            <p className="text-sm text-ink/50">Niveles y edades</p>
          </div>
        </Link>
        <Link to="/docentes" className="card-link flex items-center gap-3">
          <span className="text-3xl">🍎</span>
          <div>
            <p className="font-bold">Invitar docentes</p>
            <p className="text-sm text-ink/50">Gestionar el equipo</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
