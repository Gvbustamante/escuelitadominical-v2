import {
  Home, BookHeart, ClipboardCheck, Palette, NotebookPen, CalendarRange, CalendarDays, MessagesSquare,
  FolderOpen, Baby, School, Users, BarChart3, Settings, Sprout, LifeBuoy, HeartHandshake,
} from 'lucide-react'

// Íconos de línea (se ven igual en Android, iPhone y PC). Si una ruta no tiene, se usa su emoji.
export const ICONOS = {
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
export const COLOR_SECCION = {
  inicio: 'bg-coral-100 text-coral-600',
  'Enseñanza': 'bg-sunshine-100 text-sunshine-800',
  'Día de clase': 'bg-grass-100 text-grass-700',
  Personas: 'bg-sky-100 text-sky-700',
  Comunidad: 'bg-grape-100 text-grape-700',
  'Gestión': 'bg-ink/5 text-ink/75',
}

export function colorDe(ruta) {
  if (ruta === '/') return COLOR_SECCION.inicio
  const sec = SECCIONES.find((x) => x.rutas.includes(ruta))
  return COLOR_SECCION[sec?.nombre] || 'bg-ink/5 text-ink/75'
}

export function Icono({ item, size = 20, activo = false }) {
  const Cmp = ICONOS[item.to]
  const chip = activo ? 'bg-white/25 text-white' : colorDe(item.to)
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl lg:h-7 lg:w-7 ${chip}`} aria-hidden="true">
      {Cmp ? <Cmp size={size} strokeWidth={2.2} /> : <span className="text-base">{item.icon}</span>}
    </span>
  )
}

// Menú por secciones cuando la iglesia no armó uno propio (Ajustes → Menú).
// Solo para menús largos; el de padres queda plano.
export const SECCIONES = [
  { nombre: 'Enseñanza', rutas: ['/devocionales', '/planeacion', '/actividades', '/agenda'] },
  { nombre: 'Día de clase', rutas: ['/asistencia', '/bitacora'] },
  { nombre: 'Personas', rutas: ['/mi-familia', '/ninos', '/progreso', '/clases', '/docentes'] },
  { nombre: 'Comunidad', rutas: ['/foro', '/drive'] },
  { nombre: 'Gestión', rutas: ['/reporte-docentes', '/ajustes', '/ayuda'] },
]
export const MIN_ITEMS_SECCIONES = 9
