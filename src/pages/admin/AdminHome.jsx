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
      <div className="relative">
        <span className="animate-float-soft pointer-events-none absolute -right-2 -top-6 text-5xl opacity-10 sm:text-6xl" aria-hidden="true">
          🎒
        </span>
        <h1 className="text-3xl font-bold">¡Hola, {profile.nombre_completo.split(' ')[0]}! 👋</h1>
        <p className="text-ink/50">Este es el resumen de tu escuelita hoy.</p>
      </div>

      <CitaDelDia />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="🧒" label="Niños activos" value={stats.ninos} color="sky" delay={0} />
        <StatCard icon="🎒" label="Clases activas" value={stats.clases} color="grass" delay={80} />
        <StatCard icon="🍎" label="Equipo" value={stats.docentes} color="sunshine" delay={160} />
        <StatCard icon="✅" label="Asistencia hoy" value={stats.asistenciaHoy} color="grape" delay={240} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link to="/ninos" className="card-link animate-pop-in group flex items-center gap-3" style={{ animationDelay: '80ms' }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-2xl">🧒</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Gestionar niños</p>
            <p className="text-sm text-ink/50">Agregar, editar, desactivar</p>
          </div>
          <span className="text-ink/20 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink/40">→</span>
        </Link>
        <Link to="/clases" className="card-link animate-pop-in group flex items-center gap-3" style={{ animationDelay: '160ms' }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-grass-100 text-2xl">🎒</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Gestionar clases</p>
            <p className="text-sm text-ink/50">Niveles y edades</p>
          </div>
          <span className="text-ink/20 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink/40">→</span>
        </Link>
        <Link to="/docentes" className="card-link animate-pop-in group flex items-center gap-3" style={{ animationDelay: '240ms' }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sunshine-100 text-2xl">🍎</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Invitar docentes</p>
            <p className="text-sm text-ink/50">Gestionar el equipo</p>
          </div>
          <span className="text-ink/20 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink/40">→</span>
        </Link>
      </div>
    </div>
  )
}
