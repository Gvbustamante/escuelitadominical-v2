import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useConfigIglesia } from '../../lib/configIglesia'
import StatCard from '../../components/StatCard'
import Skeleton from '../../components/Skeleton'
import CitaDelDia from '../../components/CitaDelDia'
import CoberturaHoy from '../../components/CoberturaHoy'

export default function SuperadminHome() {
  const { profile } = useAuth()
  const config = useConfigIglesia()
  const [stats, setStats] = useState(null)
  const [equipo, setEquipo] = useState(null)
  const [modulosActivos, setModulosActivos] = useState(null)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10)
      const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const diaSemana = new Date().getDay()

      const [
        ninos,
        ninosInactivos,
        clases,
        admins,
        coordinadores,
        docentes,
        padres,
        padresInactivos,
        asistenciaHoy,
        asistenciaMes,
        eventosProximos,
        peticionesRecientes,
        actividadesMes,
        diasClase,
        devocionales,
        foroMes,
      ] = await Promise.all([
        supabase.from('ninos').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('ninos').select('id', { count: 'exact', head: true }).eq('activo', false),
        supabase.from('niveles').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['superadmin', 'admin']).eq('activo', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'coordinador').eq('activo', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'docente').eq('activo', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'padre').eq('activo', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'padre').eq('activo', false),
        supabase.from('asistencia').select('id', { count: 'exact', head: true }).eq('fecha', today).eq('presente', true),
        supabase.from('asistencia').select('id', { count: 'exact', head: true }).gte('fecha', hace30dias).eq('presente', true),
        supabase.from('agenda').select('id', { count: 'exact', head: true }).gte('fecha', today),
        supabase.from('peticiones_oracion').select('id', { count: 'exact', head: true }).gte('created_at', hace7dias),
        supabase.from('actividades').select('id', { count: 'exact', head: true }).gte('fecha', hace30dias),
        supabase.from('dias_clase').select('dia_semana, activo'),
        supabase.from('devocionales_ninos').select('id', { count: 'exact', head: true }),
        supabase.from('foro_posts').select('id', { count: 'exact', head: true }).gte('created_at', hace30dias),
      ])

      const esDiaClase = (diasClase.data || []).some((d) => d.dia_semana === diaSemana && d.activo)

      setStats({
        ninos: ninos.count ?? 0,
        ninosInactivos: ninosInactivos.count ?? 0,
        clases: clases.count ?? 0,
        admins: admins.count ?? 0,
        coordinadores: coordinadores.count ?? 0,
        docentes: docentes.count ?? 0,
        padres: padres.count ?? 0,
        padresInactivos: padresInactivos.count ?? 0,
        asistenciaHoy: asistenciaHoy.count ?? 0,
        asistenciaMes: asistenciaMes.count ?? 0,
        esDiaClase,
        eventosProximos: eventosProximos.count ?? 0,
        peticionesRecientes: peticionesRecientes.count ?? 0,
        actividadesMes: actividadesMes.count ?? 0,
        devocionales: devocionales.count ?? 0,
        foroMes: foroMes.count ?? 0,
      })
    }

    async function loadEquipo() {
      const { data } = await supabase
        .from('profiles')
        .select('id, nombre_completo, role, activo, last_sign_in_at')
        .in('role', ['superadmin', 'admin', 'coordinador', 'docente'])
        .order('role')
        .order('nombre_completo')
      setEquipo(data || [])
    }

    load()
    loadEquipo()
  }, [])

  useEffect(() => {
    setModulosActivos(config?.modulos_activos || null)
  }, [config])

  if (!stats) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const ROLE_BADGE = {
    superadmin: 'bg-grape-100 text-grape-700',
    admin: 'bg-grape-100 text-grape-700',
    coordinador: 'bg-sunshine-100 text-sunshine-700',
    docente: 'bg-sky-100 text-sky-700',
  }
  const ROLE_LABEL = {
    superadmin: 'Super Admin',
    admin: 'Admin',
    coordinador: 'Coordinador',
    docente: 'Docente',
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <span className="animate-float-soft pointer-events-none absolute -right-2 -top-6 text-5xl opacity-10 sm:text-6xl" aria-hidden="true">
          🛡️
        </span>
        <h1 className="text-3xl font-bold">Panel de control 🛡️</h1>
        <p className="text-ink/50">Vista panorámica de toda la plataforma</p>
      </div>

      <CitaDelDia />

      {/* Personas */}
      <div>
        <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-ink/40">👥 Personas</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon="🧒" label="Niños activos" value={stats.ninos} color="sky" delay={0} />
          <StatCard icon="💤" label="Niños inactivos" value={stats.ninosInactivos} color="coral" delay={80} />
          <StatCard icon="👨‍👩‍👧" label="Padres activos" value={stats.padres} color="grass" delay={160} />
          <StatCard icon="🍎" label="Docentes" value={stats.docentes} color="sunshine" delay={240} />
        </div>
      </div>

      {/* Plataforma */}
      <div>
        <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-ink/40">📊 Plataforma</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon="🎒" label="Clases activas" value={stats.clases} color="grass" delay={0} />
          {stats.esDiaClase ? (
            <StatCard icon="✅" label="Asistencia hoy" value={stats.asistenciaHoy} color="grape" delay={80} />
          ) : (
            <div className="card animate-pop-in flex items-center gap-3 !p-4 sm:gap-4 sm:!p-6" style={{ animationDelay: '80ms' }}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink/5 text-xl text-ink/30 ring-4 ring-ink/5 sm:h-16 sm:w-16 sm:text-3xl">
                💤
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold leading-none text-ink/40 sm:text-xl">Sin clase</p>
                <p className="mt-1 text-xs font-bold leading-tight text-ink/50 sm:text-sm">Hoy no toca</p>
              </div>
            </div>
          )}
          <StatCard icon="✅" label="Asistencias (30d)" value={stats.asistenciaMes} color="sky" delay={160} />
          <StatCard icon="🎨" label="Actividades (30d)" value={stats.actividadesMes} color="coral" delay={240} />
          <StatCard icon="📅" label="Eventos próximos" value={stats.eventosProximos} color="sunshine" delay={320} />
          <StatCard icon="🙏" label="Peticiones (7d)" value={stats.peticionesRecientes} color="grape" delay={400} />
          <StatCard icon="📖" label="Devocionales" value={stats.devocionales} color="sky" delay={480} />
          <StatCard icon="💬" label="Posts foro (30d)" value={stats.foroMes} color="grass" delay={560} />
        </div>
      </div>

      <CoberturaHoy />

      {/* Equipo */}
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold">🍎 Equipo de la plataforma</p>
          <div className="flex gap-2 text-xs font-bold text-ink/40">
            <span className="badge bg-grape-100 text-grape-700">{stats.admins} admin</span>
            <span className="badge bg-sunshine-100 text-sunshine-700">{stats.coordinadores} coord</span>
            <span className="badge bg-sky-100 text-sky-700">{stats.docentes} docentes</span>
          </div>
        </div>
        {!equipo ? (
          <Skeleton className="h-32 w-full" />
        ) : equipo.length === 0 ? (
          <p className="text-sm text-ink/40">No hay cuentas de equipo aún.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {equipo.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-ink/[0.03] px-3 py-2">
                <span className={`badge text-[10px] ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                <span className="flex-1 truncate text-sm font-bold">{u.nombre_completo}</span>
                {!u.activo && <span className="badge bg-coral-100 text-coral-700 text-[10px]">Inactivo</span>}
              </div>
            ))}
          </div>
        )}
        <Link to="/docentes" className="mt-3 inline-block text-sm font-bold text-sky-500 hover:underline">
          Ver todo el equipo →
        </Link>
      </div>

      {/* Módulos */}
      {modulosActivos && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-bold">📦 Módulos activos</p>
            <Link to="/ajustes" className="text-sm font-bold text-sky-500 hover:underline">
              Configurar →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {modulosActivos.map((m) => (
              <span key={m} className="badge bg-sky-100 text-sky-700">{m}</span>
            ))}
          </div>
          {modulosActivos.length === 0 && (
            <p className="text-sm text-ink/40">Todos los módulos están activos (no se ha configurado ningún filtro).</p>
          )}
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Link to="/ninos" className="card-link animate-pop-in group flex items-center gap-3" style={{ animationDelay: '80ms' }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-2xl">🧒</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Niños</p>
            <p className="text-sm text-ink/50">Gestionar niños</p>
          </div>
          <span className="text-ink/20 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink/40">→</span>
        </Link>
        <Link to="/clases" className="card-link animate-pop-in group flex items-center gap-3" style={{ animationDelay: '160ms' }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-grass-100 text-2xl">🎒</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Clases</p>
            <p className="text-sm text-ink/50">Niveles y edades</p>
          </div>
          <span className="text-ink/20 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink/40">→</span>
        </Link>
        <Link to="/docentes" className="card-link animate-pop-in group flex items-center gap-3" style={{ animationDelay: '240ms' }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sunshine-100 text-2xl">🍎</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Equipo</p>
            <p className="text-sm text-ink/50">Invitar y gestionar</p>
          </div>
          <span className="text-ink/20 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink/40">→</span>
        </Link>
        <Link to="/ajustes" className="card-link animate-pop-in group flex items-center gap-3" style={{ animationDelay: '320ms' }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-grape-100 text-2xl">⚙️</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Ajustes</p>
            <p className="text-sm text-ink/50">Módulos y config</p>
          </div>
          <span className="text-ink/20 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink/40">→</span>
        </Link>
      </div>
    </div>
  )
}
