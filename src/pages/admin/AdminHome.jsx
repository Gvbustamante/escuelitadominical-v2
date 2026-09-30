import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import CitaDelDia from '../../components/CitaDelDia'
import ProximaAgenda from '../../components/ProximaAgenda'
import PrimerosPasos from '../../components/PrimerosPasos'
import ProximaClase from '../../components/inicio/ProximaClase'
import AlertasAdmin from '../../components/inicio/AlertasAdmin'
import { hoyLocal, capitalizar } from '../../lib/fechas'

function Numero({ to, icon, valor, label, tono }) {
  const TONO = { sky: 'bg-sky-100 text-sky-700', grass: 'bg-grass-100 text-grass-700', sunshine: 'bg-sunshine-100 text-sunshine-800', grape: 'bg-grape-100 text-grape-700' }
  return (
    <Link to={to} className="card flex items-center gap-3 !p-3 transition-transform hover:-translate-y-0.5 sm:!p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${TONO[tono]}`} aria-hidden="true">{icon}</span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold leading-none tabular-nums">{valor ?? '—'}</span>
        <span className="block truncate text-xs font-bold text-ink/70 sm:text-sm">{label}</span>
      </span>
    </Link>
  )
}

/** Inicio del admin/coordinador (y superadmin): primero lo que hay que hacer, después los números. */
export default function AdminHome({ extra }) {
  const { profile, user } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const hoy = hoyLocal()
    const hace30 = new Date()
    hace30.setDate(hace30.getDate() - 30)
    Promise.all([
      supabase.from('ninos').select('id', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('niveles').select('id', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['docente', 'coordinador']).eq('activo', true),
      supabase.from('agenda').select('id', { count: 'exact', head: true }).gte('fecha', hoy),
    ]).then(([ninos, niveles, equipo, eventos]) =>
      setStats({ ninos: ninos.count ?? 0, niveles: niveles.count ?? 0, equipo: equipo.count ?? 0, eventos: eventos.count ?? 0 }),
    )
  }, [])

  const fechaHoy = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">¡Hola, {profile.nombre_completo.split(' ')[0]}! 👋</h1>
        <p className="text-ink/70">{capitalizar(fechaHoy)}</p>
      </div>

      <PrimerosPasos />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero to="/ninos" icon="🧒" valor={stats?.ninos} label="Niños activos" tono="sky" />
        <Numero to="/clases" icon="🎒" valor={stats?.niveles} label="Niveles" tono="grass" />
        <Numero to="/docentes" icon="🍎" valor={stats?.equipo} label="Equipo" tono="sunshine" />
        <Numero to="/agenda" icon="📅" valor={stats?.eventos} label="Eventos próximos" tono="grape" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Columna principal: acción */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <AlertasAdmin />
          <ProximaClase userId={user?.id} />
        </div>

        {/* Columna lateral: información */}
        <aside className="flex flex-col gap-5">
          <ProximaAgenda />
          <CitaDelDia />
        </aside>
      </div>

      {extra}
    </div>
  )
}
