import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

const STAFF = ['admin', 'coordinador']

function hoyStr() {
  return new Date().toISOString().slice(0, 10)
}

function diaDelAnio() {
  const hoy = new Date()
  const inicio = new Date(hoy.getFullYear(), 0, 0)
  const diff = hoy - inicio
  return Math.floor(diff / 86400000)
}

const THEMES = [
  { from: '#0a5f80', to: '#1cade4', text: '#ffffff', sub: 'rgba(255,255,255,0.82)', bubble: 'rgba(255,255,255,0.4)', pill: 'rgba(255,255,255,0.22)' },
  { from: '#ff4d6d', to: '#c81e3d', text: '#ffffff', sub: 'rgba(255,255,255,0.82)', bubble: 'rgba(255,255,255,0.4)', pill: 'rgba(255,255,255,0.22)' },
  { from: '#ffd54d', to: '#ff6a35', text: '#4a2600', sub: 'rgba(74,38,0,0.72)', bubble: 'rgba(255,255,255,0.5)', pill: 'rgba(255,255,255,0.35)' },
]

const INTROS = [
  (n) => (n ? `Mira, ${n}: hoy Dios te dice` : 'Hoy Dios te dice'),
  (n) => (n ? `${n}, escucha lo que el Señor tiene para ti hoy` : 'Escucha lo que el Señor tiene para ti hoy'),
  (n) => (n ? `Oye, ${n}, esto es lo que te mando hoy` : 'Esto es lo que se te manda hoy'),
  (n) => (n ? `${n}, guarda esta palabra en tu corazón hoy` : 'Guarda esta palabra en tu corazón hoy'),
  (n) => (n ? `Para ti, ${n}, con todo su amor` : 'Para ti, con todo su amor'),
]

const GREETINGS = ['Hola', '¿Qué tal', 'Hola de nuevo']

const BUBBLES = [
  { side: 'left', top: '8%', size: 46, delay: '0s', dur: '7s' },
  { side: 'left', top: '48%', size: 30, delay: '1.4s', dur: '8.5s' },
  { side: 'left', top: '80%', size: 60, delay: '0.7s', dur: '9.5s' },
  { side: 'right', top: '14%', size: 36, delay: '0.9s', dur: '8s' },
  { side: 'right', top: '52%', size: 58, delay: '0.2s', dur: '7.5s' },
  { side: 'right', top: '82%', size: 28, delay: '1.8s', dur: '9s' },
]

export default function CitaDelDia() {
  const { profile } = useAuth()
  const esStaff = STAFF.includes(profile?.role)

  const [status, setStatus] = useState('cargando') // cargando | listo | elegir
  const [cita, setCita] = useState(null)
  const [pool, setPool] = useState([])
  const [elegido, setElegido] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const hoy = hoyStr()
    const { data: deHoy } = await supabase.from('citas_biblicas').select('*').eq('fecha_mostrar', hoy).maybeSingle()
    if (deHoy) {
      setCita(deHoy)
      setStatus('listo')
      return
    }
    if (esStaff) {
      const { data: todas } = await supabase.from('citas_biblicas').select('id, texto, referencia').order('referencia')
      setPool(todas || [])
      setElegido(todas?.[0]?.id || '')
      setStatus('elegir')
      return
    }
    const { data } = await supabase.from('citas_biblicas').select('*').eq('activo', true).order('created_at')
    if (data && data.length > 0) {
      setCita(data[diaDelAnio() % data.length])
      setStatus('listo')
    } else {
      setStatus('elegir')
    }
  }, [esStaff])

  useEffect(() => {
    load()
  }, [load])

  async function usarHoy() {
    if (!elegido) return
    setBusy(true)
    const { error } = await supabase.from('citas_biblicas').update({ fecha_mostrar: hoyStr() }).eq('id', elegido)
    if (!error) {
      const { data } = await supabase.from('citas_biblicas').select('*').eq('id', elegido).maybeSingle()
      setCita(data)
      setStatus('listo')
    }
    setBusy(false)
  }

  if (status === 'cargando') return null

  if (status === 'elegir') {
    return (
      <div className="card border-4 border-sky-200 bg-sky-50">
        <p className="text-lg font-extrabold text-sky-700">📖 Aún no elegiste la cita de hoy</p>
        <p className="mt-1 text-sm text-ink/60">
          ¿Cuál será la cita del día para todos? Elige una de tu lista o crea una nueva.
        </p>
        {pool.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <select className="input flex-1" value={elegido} onChange={(e) => setElegido(e.target.value)}>
              {pool.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.referencia} — {c.texto.slice(0, 40)}
                  {c.texto.length > 40 ? '…' : ''}
                </option>
              ))}
            </select>
            <button disabled={busy} onClick={usarHoy} className="btn-primary !py-3 whitespace-nowrap">
              {busy ? 'Guardando...' : 'Usar hoy'}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/50">Todavía no hay ninguna cita cargada.</p>
        )}
        <Link to="/citas-biblicas" className="mt-3 inline-block text-sm font-bold text-sky-600 hover:underline">
          Ir a Versículos para crear una nueva →
        </Link>
      </div>
    )
  }

  const theme = THEMES[diaDelAnio() % THEMES.length]
  const intro = INTROS[diaDelAnio() % INTROS.length]
  const primerNombre = profile?.nombre_completo?.trim().split(/\s+/)[0] || ''
  const greeting = GREETINGS[diaDelAnio() % GREETINGS.length]

  return (
    <div
      className="cd-card relative overflow-hidden rounded-blob p-6 shadow-card sm:p-8"
      style={{ '--cd-from': theme.from, '--cd-to': theme.to }}
    >
      <style>{`
        @keyframes cd-pan { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
        @keyframes cd-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        @keyframes cd-greet { 0% { transform: scale(2.6); opacity: 0; } 55% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes cd-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .cd-card {
          background: linear-gradient(135deg, var(--cd-from), var(--cd-to));
          background-size: 220% 220%;
          animation: cd-pan 12s ease-in-out infinite alternate;
        }
        .cd-bubble { animation: cd-float ease-in-out infinite; }
        .cd-greet { animation: cd-greet 1s cubic-bezier(0.22, 1, 0.36, 1) both; transform-origin: left center; }
        .cd-body { animation: cd-in 0.6s ease-out 0.15s both; }
        @media (prefers-reduced-motion: reduce) {
          .cd-card, .cd-bubble, .cd-greet, .cd-body { animation: none !important; }
        }
      `}</style>

      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="cd-bubble pointer-events-none absolute rounded-full"
          style={{
            [b.side]: '-10px',
            top: b.top,
            width: b.size,
            height: b.size,
            background: theme.bubble,
            filter: 'blur(6px)',
            animationDuration: b.dur,
            animationDelay: b.delay,
          }}
        />
      ))}

      <div className="relative">
        {primerNombre && (
          <span
            className="cd-greet mb-3 inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-extrabold backdrop-blur-sm"
            style={{ background: theme.pill, color: theme.text }}
          >
            👋 {greeting}, {primerNombre}
          </span>
        )}

        <div className="cd-body">
          <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: theme.sub }}>
            📖 Versículo del día
          </p>
          <p className="mt-2 text-sm font-bold" style={{ color: theme.sub }}>
            {intro(primerNombre)}:
          </p>
          <p className="mt-1 text-xl font-extrabold italic leading-snug sm:text-2xl" style={{ color: theme.text }}>
            "{cita.texto}"
          </p>
          <p className="mt-2 text-sm font-bold" style={{ color: theme.sub }}>
            — {cita.referencia}
          </p>
        </div>
      </div>
    </div>
  )
}
