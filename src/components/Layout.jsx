import { useEffect, useState, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import CambiarPasswordModal from './CambiarPasswordModal'
import AppLogo from './AppLogo'
import AppName from './AppName'

const NAV = {
  admin: [
    { to: '/', label: 'Inicio', icon: '🏠', end: true },
    { to: '/asistencia', label: 'Asistencia', icon: '✅' },
    { to: '/actividades', label: 'Actividades', icon: '🎨' },
    { to: '/bitacora', label: 'Bitácora', icon: '📋' },
    { to: '/agenda', label: 'Agenda', icon: '📅' },
    { to: '/devocionales', label: 'Devocionales', icon: '🙏' },
    { to: '/foro', label: 'Nuestra comunidad', icon: '🤝' },
    { to: '/ninos', label: 'Niños', icon: '🧒' },
    { to: '/clases', label: 'Clases', icon: '🎒' },
    { to: '/docentes', label: 'Docentes', icon: '🍎' },
    { to: '/materiales', label: 'Materiales', icon: '🧰' },
    { to: '/estrellas', label: 'Estrellas', icon: '⭐' },
    { to: '/citas-biblicas', label: 'Versículos', icon: '📖' },
    { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
    { to: '/ayuda', label: 'Ayuda', icon: '🎓' },
  ],
  coordinador: [
    { to: '/', label: 'Inicio', icon: '🏠', end: true },
    { to: '/asistencia', label: 'Asistencia', icon: '✅' },
    { to: '/actividades', label: 'Actividades', icon: '🎨' },
    { to: '/bitacora', label: 'Bitácora', icon: '📋' },
    { to: '/agenda', label: 'Agenda', icon: '📅' },
    { to: '/devocionales', label: 'Devocionales', icon: '🙏' },
    { to: '/foro', label: 'Nuestra comunidad', icon: '🤝' },
    { to: '/ninos', label: 'Niños', icon: '🧒' },
    { to: '/clases', label: 'Clases', icon: '🎒' },
    { to: '/docentes', label: 'Docentes', icon: '🍎' },
    { to: '/materiales', label: 'Materiales', icon: '🧰' },
    { to: '/estrellas', label: 'Estrellas', icon: '⭐' },
    { to: '/citas-biblicas', label: 'Versículos', icon: '📖' },
    { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
    { to: '/ayuda', label: 'Ayuda', icon: '🎓' },
  ],
  docente: [
    { to: '/', label: 'Mis clases', icon: '🏠', end: true },
    { to: '/asistencia', label: 'Asistencia', icon: '✅' },
    { to: '/actividades', label: 'Actividades', icon: '🎨' },
    { to: '/bitacora', label: 'Bitácora', icon: '📋' },
    { to: '/progreso', label: 'Progreso', icon: '🌱' },
    { to: '/agenda', label: 'Agenda', icon: '📅' },
    { to: '/devocionales', label: 'Devocionales', icon: '🙏' },
    { to: '/foro', label: 'Nuestra comunidad', icon: '🤝' },
    { to: '/ayuda', label: 'Ayuda', icon: '🎓' },
  ],
  padre: [
    { to: '/', label: 'Mi hijo/a', icon: '🏠', end: true },
    { to: '/actividades', label: 'Actividades', icon: '🎨' },
    { to: '/progreso', label: 'Progreso', icon: '🌱' },
    { to: '/agenda', label: 'Agenda', icon: '📅' },
    { to: '/devocionales', label: 'Devocionales', icon: '🙏' },
    { to: '/foro', label: 'Nuestra comunidad', icon: '🤝' },
    { to: '/ayuda', label: 'Ayuda', icon: '🎓' },
  ],
}

const ROLE_LABEL = {
  admin: 'Administrador',
  coordinador: 'Coordinador',
  docente: 'Docente',
  padre: 'Padre / Madre',
}

export default function Layout() {
  const { profile, user, signOut, refreshProfile } = useAuth()
  const { pathname } = useLocation()
  const [pwOpen, setPwOpen] = useState(false)
  const [tieneHijos, setTieneHijos] = useState(false)
  const [bienvenidaDeVuelta, setBienvenidaDeVuelta] = useState(false)
  const yaRevisadoPausado = useRef(null)
  const mainRef = useRef(null)

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    if (!user || profile?.role === 'padre') return
    supabase
      .from('ninos_padres')
      .select('nino_id', { count: 'exact', head: true })
      .eq('padre_id', user.id)
      .then(({ count }) => setTieneHijos((count || 0) > 0))
  }, [user, profile?.role])

  useEffect(() => {
    if (!profile || profile.role !== 'padre' || !profile.pausado) return
    if (yaRevisadoPausado.current === profile.id) return
    yaRevisadoPausado.current = profile.id
    setBienvenidaDeVuelta(true)
    supabase
      .from('profiles')
      .update({ pausado: false })
      .eq('id', profile.id)
      .then(() => refreshProfile())
  }, [profile, refreshProfile])

  const items = [...(NAV[profile?.role] || [])]
  if (tieneHijos && ['admin', 'coordinador', 'docente'].includes(profile?.role)) {
    items.splice(1, 0, { to: '/mi-familia', label: 'Mi familia', icon: '👪' })
  }

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="flex w-24 flex-col items-center gap-2 border-r-4 border-sky-100 bg-white py-6 md:w-64 md:items-stretch md:px-4">
        <div className="mb-6 flex flex-col items-center gap-1 px-2 text-center">
          <AppLogo emojiClassName="text-4xl" imgClassName="h-11 w-11 object-contain" />
          <span className="hidden font-display text-lg font-extrabold uppercase leading-tight tracking-wide text-sky-500 md:block">
            <AppName />
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center justify-center gap-3 rounded-2xl px-3 py-3 text-lg font-bold transition-colors md:justify-start ${
                  isActive
                    ? 'bg-sky-400 text-white shadow-pop'
                    : 'text-ink/60 hover:bg-sky-50'
                }`
              }
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="hidden md:block">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 flex flex-col items-center gap-2 border-t-2 border-ink/5 pt-4 md:items-stretch">
          <div className="hidden text-center md:block">
            <p className="truncate text-sm font-bold">{profile?.nombre_completo}</p>
            <p className="text-xs text-ink/50">{ROLE_LABEL[profile?.role]}</p>
          </div>
          <button onClick={() => setPwOpen(true)} className="btn-secondary w-full !py-2 !text-base">
            <span>🔑</span>
            <span className="hidden md:block">Contraseña</span>
          </button>
          <button onClick={signOut} className="btn-secondary w-full !py-2 !text-base">
            <span>🚪</span>
            <span className="hidden md:block">Salir</span>
          </button>
          <a
            href="https://gobeapp.com"
            target="_blank"
            rel="noreferrer"
            className="mt-1 hidden text-center text-[10px] font-bold uppercase tracking-wide text-ink/30 hover:text-sky-500 md:block"
          >
            Gobe App Technology
          </a>
        </div>
      </aside>

      <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:p-8">
        {bienvenidaDeVuelta && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border-2 border-sky-200 bg-sky-50 px-4 py-3">
            <p className="text-sm font-bold text-sky-700">
              👋 ¡Bienvenido/a de vuelta! Habíamos marcado tu cuenta como inactiva porque llevaba un tiempo sin
              entrar — ya quedó activa de nuevo.
            </p>
            <button
              onClick={() => setBienvenidaDeVuelta(false)}
              className="shrink-0 text-lg font-bold text-sky-400 hover:text-sky-600"
              aria-label="Cerrar aviso"
            >
              ×
            </button>
          </div>
        )}
        <Outlet />
      </main>

      <CambiarPasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}
