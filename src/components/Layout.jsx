import { useEffect, useState, useRef, useCallback } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useConfigIglesia } from '../lib/configIglesia'
import { supabase } from '../lib/supabaseClient'
import CambiarPasswordModal from './CambiarPasswordModal'
import AppLogo from './AppLogo'
import AppName from './AppName'
import {
  Home, BookHeart, ClipboardCheck, Palette, NotebookPen, CalendarRange, CalendarDays, MessagesSquare,
  FolderOpen, Baby, School, Users, BarChart3, Settings, Sprout, LifeBuoy, HeartHandshake,
} from 'lucide-react'

// Íconos de línea (se ven igual en Android, iPhone y PC). Si una ruta no tiene, se usa su emoji.
const ICONOS = {
  '/': Home,
  '/devocionales': BookHeart,
  '/asistencia': ClipboardCheck,
  '/actividades': Palette,
  '/bitacora': NotebookPen,
  '/planeacion': CalendarRange,
  '/agenda': CalendarDays,
  '/foro': MessagesSquare,
  '/drive': FolderOpen,
  '/ninos': Baby,
  '/clases': School,
  '/docentes': Users,
  '/reporte-docentes': BarChart3,
  '/ajustes': Settings,
  '/progreso': Sprout,
  '/ayuda': LifeBuoy,
  '/mi-familia': HeartHandshake,
}

// Color por sección del menú: ayuda a reconocer dónde está cada cosa.
const COLOR_SECCION = {
  inicio: 'bg-coral-100 text-coral-600',
  'Enseñanza': 'bg-sunshine-100 text-sunshine-700',
  'Día de clase': 'bg-grass-100 text-grass-700',
  Personas: 'bg-sky-100 text-sky-700',
  Comunidad: 'bg-grape-100 text-grape-700',
  'Gestión': 'bg-ink/5 text-ink/75',
}

function colorDe(ruta) {
  if (ruta === '/') return COLOR_SECCION.inicio
  const sec = SECCIONES.find((x) => x.rutas.includes(ruta))
  return COLOR_SECCION[sec?.nombre] || 'bg-ink/5 text-ink/75'
}

function Icono({ item, size = 20, activo = false }) {
  const Cmp = ICONOS[item.to]
  const chip = activo ? 'bg-white/25 text-white' : colorDe(item.to)
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${chip}`} aria-hidden="true">
      {Cmp ? <Cmp size={size} strokeWidth={2.2} /> : <span className="text-base">{item.icon}</span>}
    </span>
  )
}

// Menú por secciones cuando la iglesia no armó uno propio (Ajustes → Menú).
// Solo para menús largos; el de padres queda plano.
const SECCIONES = [
  { nombre: 'Enseñanza', rutas: ['/devocionales', '/planeacion', '/actividades', '/agenda'] },
  { nombre: 'Día de clase', rutas: ['/asistencia', '/bitacora'] },
  { nombre: 'Personas', rutas: ['/mi-familia', '/ninos', '/progreso', '/clases', '/docentes'] },
  { nombre: 'Comunidad', rutas: ['/foro', '/drive'] },
  { nombre: 'Gestión', rutas: ['/reporte-docentes', '/ajustes', '/ayuda'] },
]
const MIN_ITEMS_SECCIONES = 9

const ADMIN_NAV = [
  { to: '/', label: 'Inicio', icon: '🏠', end: true },
  { to: '/devocionales', label: 'Devocionales', icon: '🙏', modulo: 'devocionales' },
  { to: '/asistencia', label: 'Asistencia', icon: '✅', modulo: 'asistencia' },
  { to: '/actividades', label: 'Actividades', icon: '🎨', modulo: 'actividades' },
  { to: '/bitacora', label: 'Bitácora', icon: '📋', modulo: 'bitacora' },
  { to: '/planeacion', label: 'Planeación', icon: '📆', modulo: 'planeacion' },
  { to: '/agenda', label: 'Agenda', icon: '📅', modulo: 'agenda' },
  { to: '/foro', label: 'Nuestra comunidad', icon: '🤝', modulo: 'foro' },
  { to: '/drive', label: 'Drive', icon: '📁', modulo: 'drive' },
  { to: '/ninos', label: 'Niños', icon: '🧒' },
  { to: '/clases', label: 'Niveles', icon: '🎒' },
  { to: '/docentes', label: 'Equipo', icon: '🍎' },
  { to: '/reporte-docentes', label: 'Reporte docentes', icon: '📊' },
  { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
]

const NAV = {
  superadmin: ADMIN_NAV,
  admin: ADMIN_NAV,
  coordinador: [
    { to: '/', label: 'Inicio', icon: '🏠', end: true },
    { to: '/devocionales', label: 'Devocionales', icon: '🙏', modulo: 'devocionales' },
    { to: '/asistencia', label: 'Asistencia', icon: '✅', modulo: 'asistencia' },
    { to: '/actividades', label: 'Actividades', icon: '🎨', modulo: 'actividades' },
    { to: '/bitacora', label: 'Bitácora', icon: '📋', modulo: 'bitacora' },
    { to: '/planeacion', label: 'Planeación', icon: '📆', modulo: 'planeacion' },
    { to: '/agenda', label: 'Agenda', icon: '📅', modulo: 'agenda' },
    { to: '/foro', label: 'Nuestra comunidad', icon: '🤝', modulo: 'foro' },
    { to: '/drive', label: 'Drive', icon: '📁', modulo: 'drive' },
    { to: '/ninos', label: 'Niños', icon: '🧒' },
    { to: '/clases', label: 'Niveles', icon: '🎒' },
    { to: '/docentes', label: 'Equipo', icon: '🍎' },
    { to: '/reporte-docentes', label: 'Reporte docentes', icon: '📊' },
    { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
  ],
  docente: [
    { to: '/', label: 'Inicio', icon: '🏠', end: true },
    { to: '/devocionales', label: 'Devocionales', icon: '🙏', modulo: 'devocionales' },
    { to: '/asistencia', label: 'Asistencia', icon: '✅', modulo: 'asistencia' },
    { to: '/actividades', label: 'Actividades', icon: '🎨', modulo: 'actividades' },
    { to: '/bitacora', label: 'Bitácora', icon: '📋', modulo: 'bitacora' },
    { to: '/planeacion', label: 'Planeación', icon: '📆', modulo: 'planeacion' },
    { to: '/ninos', label: 'Niños', icon: '🧒' },
    { to: '/progreso', label: 'Progreso', icon: '🌱', modulo: 'progreso' },
    { to: '/agenda', label: 'Agenda', icon: '📅', modulo: 'agenda' },
    { to: '/foro', label: 'Nuestra comunidad', icon: '🤝', modulo: 'foro' },
    { to: '/drive', label: 'Drive', icon: '📁', modulo: 'drive' },
    { to: '/ayuda', label: 'Ayuda', icon: '🎓' },
  ],
  padre: [
    { to: '/', label: 'Mi hijo/a', icon: '🏠', end: true },
    { to: '/devocionales', label: 'Devocionales', icon: '🙏', modulo: 'devocionales' },
    { to: '/actividades', label: 'Actividades', icon: '🎨', modulo: 'actividades' },
    { to: '/progreso', label: 'Progreso', icon: '🌱', modulo: 'progreso' },
    { to: '/agenda', label: 'Agenda', icon: '📅', modulo: 'agenda' },
    { to: '/foro', label: 'Nuestra comunidad', icon: '🤝', modulo: 'foro' },
    { to: '/ayuda', label: 'Ayuda', icon: '🎓' },
  ],
}

const ROLE_LABEL = {
  superadmin: 'Administrador',
  admin: 'Administrador',
  coordinador: 'Coordinador',
  docente: 'Docente',
  padre: 'Padre / Madre',
}

function NavItem({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-3 py-2 text-base font-bold transition-colors ${
          isActive ? 'bg-sky-400 text-white shadow-pop' : 'text-ink/75 hover:bg-sky-50'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icono item={item} activo={isActive} />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

function NavSubItem({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-xl px-3 py-1.5 pl-6 text-sm font-bold transition-colors sm:text-base ${
          isActive ? 'bg-sky-400 text-white shadow-pop' : 'text-ink/70 hover:bg-sky-50'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icono item={item} size={16} activo={isActive} />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

function SidebarNav({ items, menuEstructura, pathname }) {
  const estructura = Array.isArray(menuEstructura) && menuEstructura.length > 0 ? menuEstructura : null
  const [openCats, setOpenCats] = useState({})

  const toggleCat = useCallback((idx) => {
    setOpenCats((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }, [])

  useEffect(() => {
    if (!estructura) return
    const initial = {}
    estructura.forEach((cat, idx) => {
      if ((cat.items || []).some((ruta) => pathname === ruta)) {
        initial[idx] = true
      }
    })
    setOpenCats(initial)
  }, [estructura, pathname])

  if (!estructura) {
    if (items.length < MIN_ITEMS_SECCIONES) {
      return (
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {items.map((item) => <NavItem key={item.to} item={item} />)}
        </nav>
      )
    }
    const enSeccion = new Set(SECCIONES.flatMap((sec) => sec.rutas))
    const arriba = items.filter((i) => !enSeccion.has(i.to))
    return (
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Menú principal">
        {arriba.map((item) => <NavItem key={item.to} item={item} />)}
        {SECCIONES.map((sec) => {
          const secItems = sec.rutas.map((r) => items.find((i) => i.to === r)).filter(Boolean)
          if (secItems.length === 0) return null
          return (
            <div key={sec.nombre} className="mt-2">
              <p className="px-3 pb-1 text-xs font-extrabold uppercase tracking-wider text-ink/65">{sec.nombre}</p>
              <div className="flex flex-col gap-0.5">
                {secItems.map((item) => <NavItem key={item.to} item={item} />)}
              </div>
            </div>
          )
        })}
      </nav>
    )
  }

  const itemMap = new Map(items.map((i) => [i.to, i]))
  const asignados = new Set(estructura.flatMap((c) => c.items || []))

  const inicio = itemMap.get('/')
  const ajustes = itemMap.get('/ajustes')
  const sueltos = items.filter((i) => i.to !== '/' && i.to !== '/ajustes' && !asignados.has(i.to))

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto sm:gap-2">
      {inicio && <NavItem item={inicio} />}

      {estructura.map((cat, idx) => {
        const catItems = (cat.items || []).map((ruta) => itemMap.get(ruta)).filter(Boolean)
        if (catItems.length === 0) return null
        const open = !!openCats[idx]
        return (
          <div key={idx}>
            <button
              type="button"
              onClick={() => toggleCat(idx)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-base font-bold text-ink/75 transition-colors hover:bg-sky-50 sm:py-3 sm:text-lg"
            >
              <span className="text-xl sm:text-2xl">{cat.icon}</span>
              <span className="flex-1 text-left">{cat.nombre}</span>
              <span className={`text-xs text-ink/65 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
            </button>
            {open && (
              <div className="flex flex-col gap-0.5">
                {catItems.map((item) => <NavSubItem key={item.to} item={item} />)}
              </div>
            )}
          </div>
        )
      })}

      {sueltos.map((item) => <NavItem key={item.to} item={item} />)}

      {ajustes && <NavItem item={ajustes} />}
    </nav>
  )
}

export default function Layout() {
  const { profile, user, signOut, refreshProfile } = useAuth()
  const config = useConfigIglesia()
  const { pathname } = useLocation()
  const [pwOpen, setPwOpen] = useState(false)
  const [tieneHijos, setTieneHijos] = useState(false)
  const [bienvenidaDeVuelta, setBienvenidaDeVuelta] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const yaRevisadoPausado = useRef(null)
  const mainRef = useRef(null)

  useEffect(() => {
    // El scroll real pasa en la ventana (el <main> no queda con altura
    // fija porque el contenedor de afuera usa min-h-screen, no h-screen),
    // así que hay que resetear window, no solo el <main>.
    window.scrollTo({ top: 0 })
    mainRef.current?.scrollTo({ top: 0 })
    setMenuOpen(false)
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

  const modulosActivos = config?.modulos_activos
  const allItems = [...(NAV[profile?.role] || [])]
  if (tieneHijos && ['superadmin', 'admin', 'coordinador', 'docente'].includes(profile?.role)) {
    allItems.splice(1, 0, { to: '/mi-familia', label: 'Mi familia', icon: '👪' })
  }
  const items = modulosActivos
    ? allItems.filter((item) => !item.modulo || modulosActivos.includes(item.modulo))
    : allItems

  return (
    <div className="flex min-h-screen bg-cream">
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-ink/40 md:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 border-r-4 border-sky-100 bg-white px-4 py-4 transition-transform duration-300 ease-out
          ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:z-auto md:w-64 md:translate-x-0 md:py-6`}
      >
        <div className="mb-3 flex items-center justify-between gap-2 px-1 sm:mb-6">
          <div className="flex items-center gap-2">
            <AppLogo emojiClassName="text-3xl sm:text-4xl" imgClassName="h-9 w-9 object-contain sm:h-11 sm:w-11" />
            <span className="font-display text-lg font-extrabold uppercase leading-tight tracking-wide text-sky-500">
              <AppName />
            </span>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="shrink-0 rounded-full p-1.5 text-2xl leading-none text-ink/65 hover:bg-ink/5 md:hidden"
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>

        <SidebarNav items={items} menuEstructura={config?.menu_estructura} pathname={pathname} />

        <div className="mt-2 flex flex-col gap-2 border-t-2 border-ink/5 pt-3 sm:mt-4 sm:pt-4">
          <div className="text-center">
            <p className="truncate text-sm font-bold">{profile?.nombre_completo}</p>
            <p className="text-xs text-ink/70">{ROLE_LABEL[profile?.role]}</p>
          </div>
          {!['superadmin', 'admin', 'coordinador'].includes(profile?.role) && (
            <button onClick={() => setPwOpen(true)} className="btn-secondary w-full !px-2 !py-2 !text-sm sm:!text-base">
              <span>🔑</span>
              <span>Contraseña</span>
            </button>
          )}
          <button onClick={signOut} className="btn-secondary w-full !px-2 !py-2 !text-sm sm:!text-base">
            <span>🚪</span>
            <span>Salir</span>
          </button>
          <a
            href="https://gobeapp.com"
            target="_blank"
            rel="noreferrer"
            className="mt-1 text-center text-xs font-bold uppercase tracking-wide text-ink/65 hover:text-sky-500"
          >
            Gobe App Technology
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b-4 border-sky-100 bg-white px-3 py-2.5 md:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-full p-2 text-2xl leading-none text-ink/75 hover:bg-sky-50"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <div className="flex items-center gap-2">
            <AppLogo emojiClassName="text-2xl" imgClassName="h-7 w-7 object-contain" />
            <span className="font-display text-base font-extrabold uppercase tracking-wide text-sky-500">
              <AppName />
            </span>
          </div>
          <span className="w-9" aria-hidden="true" />
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8">
          <div className="mx-auto w-full max-w-screen-2xl">
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
          </div>
        </main>
      </div>

      <CambiarPasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}
