import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppLogo from '../components/AppLogo'

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xdaqpawn'

const MOTIVOS = [
  { value: 'quiero-tenerla', label: 'Quiero tenerla en mi iglesia' },
  { value: 'sugerencia', label: 'Tengo una sugerencia o idea de mejora' },
  { value: 'soporte', label: 'Necesito ayuda o soporte' },
  { value: 'donar', label: 'Quiero donar u ofrendar' },
  { value: 'otro', label: 'Otro' },
]

const FEATURES = [
  { icon: '🎒', title: 'Clases y niveles', text: 'Organiza a los peques por edad, con su docente asignada.' },
  { icon: '✅', title: 'Asistencia', text: 'La docente marca presentes tocando la pantalla, en segundos.' },
  { icon: '🎨', title: 'Actividades', text: 'Fotos y lo que aprendieron, directo para casa.' },
  { icon: '🌱', title: 'Progreso', text: 'Comportamiento, emociones y logros de cada niño/a.' },
  { icon: '🙏', title: 'Devocionales', text: 'Reflexiones pensadas para niños, con su versículo.' },
  { icon: '📖', title: 'Versículo del día', text: 'Una palabra distinta cada día, para toda la familia.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fffaf0] text-ink">
      <style>{`
        @keyframes lp-drift { from { transform: translateX(-8%); } to { transform: translateX(8%); } }
        @keyframes lp-sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
        @keyframes lp-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes lp-flap { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.55); } }
        @keyframes lp-twinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.9; } }
        @keyframes lp-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,106,53,0.35); } 50% { box-shadow: 0 0 0 14px rgba(255,106,53,0); } }
        @keyframes lp-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .lp-cloud { animation: lp-drift 34s ease-in-out infinite alternate; }
        .lp-cloud-slow { animation: lp-drift 48s ease-in-out infinite alternate; }
        .lp-sway { animation: lp-sway 4.5s ease-in-out infinite; transform-origin: bottom center; }
        .lp-bird { animation: lp-bob 3.2s ease-in-out infinite; }
        .lp-wing { animation: lp-flap 0.5s ease-in-out infinite; transform-origin: center; }
        .lp-star { animation: lp-twinkle 2.6s ease-in-out infinite; }
        .lp-pulse { animation: lp-pulse 2.6s ease-in-out infinite; }
        .lp-in { animation: lp-in 0.7s cubic-bezier(0.22,1,0.36,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .lp-cloud, .lp-cloud-slow, .lp-sway, .lp-bird, .lp-wing, .lp-star, .lp-pulse, .lp-in { animation: none !important; }
        }
      `}</style>

      {/* HERO */}
      <header className="relative overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-[#fffaf0] pb-4 pt-10 sm:pt-14">
        {/* sol */}
        <div className="pointer-events-none absolute right-6 top-8 h-24 w-24 rounded-full bg-sunshine-300 opacity-90 shadow-[0_0_70px_28px_rgba(255,199,44,0.45)] sm:right-12 sm:top-10 sm:h-32 sm:w-32" />

        {/* estrellitas sutiles */}
        <span className="lp-star pointer-events-none absolute left-[12%] top-10 text-xl text-white sm:text-2xl">✦</span>
        <span className="lp-star pointer-events-none absolute left-[22%] top-24 text-sm text-white" style={{ animationDelay: '0.8s' }}>✦</span>
        <span className="lp-star pointer-events-none absolute right-[28%] top-6 text-base text-white" style={{ animationDelay: '1.4s' }}>✦</span>

        {/* nubes */}
        <div className="lp-cloud pointer-events-none absolute left-[6%] top-16 flex items-center sm:top-20">
          <div className="h-7 w-16 rounded-full bg-white/90 sm:h-9 sm:w-24" />
          <div className="-ml-6 h-10 w-16 rounded-full bg-white/90 sm:-ml-8 sm:h-12 sm:w-20" />
        </div>
        <div className="lp-cloud-slow pointer-events-none absolute right-[10%] top-32 flex items-center sm:top-36">
          <div className="h-6 w-14 rounded-full bg-white/80 sm:h-8 sm:w-20" />
          <div className="-ml-5 h-8 w-14 rounded-full bg-white/80 sm:-ml-6 sm:h-10 sm:w-16" />
        </div>

        {/* arcoiris sutil */}
        <svg className="pointer-events-none absolute -left-10 top-4 h-28 w-28 opacity-30 sm:h-36 sm:w-36" viewBox="0 0 100 100" fill="none">
          <path d="M5 95 A 45 45 0 0 1 95 95" stroke="#ff6a35" strokeWidth="4" strokeLinecap="round" />
          <path d="M14 95 A 36 36 0 0 1 86 95" stroke="#ffc72c" strokeWidth="4" strokeLinecap="round" />
          <path d="M23 95 A 27 27 0 0 1 77 95" stroke="#1cade4" strokeWidth="4" strokeLinecap="round" />
        </svg>

        {/* pajaritos */}
        <div className="lp-bird pointer-events-none absolute left-[38%] top-12 sm:top-16">
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
            <path className="lp-wing" d="M11 7 Q6 0 0 4 Q6 6 11 7Z" fill="#8339d6" />
            <path className="lp-wing" d="M11 7 Q16 0 22 4 Q16 6 11 7Z" fill="#8339d6" style={{ animationDelay: '0.1s' }} />
          </svg>
        </div>
        <div className="lp-bird pointer-events-none absolute right-[30%] top-20 sm:top-24" style={{ animationDelay: '0.6s' }}>
          <svg width="16" height="10" viewBox="0 0 22 14" fill="none">
            <path className="lp-wing" d="M11 7 Q6 0 0 4 Q6 6 11 7Z" fill="#f04e1d" />
            <path className="lp-wing" d="M11 7 Q16 0 22 4 Q16 6 11 7Z" fill="#f04e1d" style={{ animationDelay: '0.15s' }} />
          </svg>
        </div>

        {/* titulo */}
        <div className="lp-in relative mx-auto max-w-2xl px-6 text-center">
          <AppLogo emojiClassName="text-6xl" imgClassName="mx-auto h-20 w-20 object-contain" />
          <h1 className="mt-3 text-4xl uppercase tracking-tight text-sky-600 sm:text-6xl">
            Kids<span className="text-coral-500">Min</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg font-bold text-ink/70 sm:text-xl">
            Un espacio donde los niños descubren a Dios entre risas y colores,
            y donde cuidar de ellos se vuelve muchísimo más simple.
          </p>
        </div>

        {/* escena: colinas, arboles, sendero, niños caminando hacia la Biblia */}
        <div className="lp-in relative mt-8 h-72 sm:h-96" style={{ animationDelay: '0.15s' }}>
          <svg viewBox="0 0 800 320" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
            {/* colina trasera */}
            <path d="M0 220 Q200 150 400 200 T800 190 V320 H0 Z" fill="#a4efc3" />
            {/* colina frontal */}
            <path d="M0 260 Q220 190 420 240 T800 230 V320 H0 Z" fill="#6fe0a3" />

            {/* arboles */}
            {[[80, 210], [140, 232], [660, 200], [724, 224]].map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <rect x="-5" y="24" width="10" height="30" rx="3" fill="#a6742f" />
                <circle cx="0" cy="10" r="26" fill="#2fc46f" />
                <circle cx="-17" cy="20" r="18" fill="#2fc46f" />
                <circle cx="17" cy="20" r="18" fill="#2fc46f" />
              </g>
            ))}

            {/* sendero de huellitas serpenteando hacia la Biblia */}
            {[
              [430, 312], [392, 296], [436, 278], [398, 260], [432, 240],
              [400, 220], [428, 198], [404, 178],
            ].map(([x, y], i) => (
              <ellipse key={i} cx={x} cy={y} rx="8" ry="11" fill="#ffffff" opacity="0.8" transform={`rotate(${i % 2 ? -18 : 18} ${x} ${y})`} />
            ))}

            {/* flores a los lados del sendero, bien separadas */}
            {[
              [230, 300], [560, 292], [190, 250], [600, 244],
              [260, 210], [540, 202], [300, 165], [500, 158],
            ].map(([x, y], i) => (
              <g key={i} className="lp-sway" transform={`translate(${x} ${y})`} style={{ animationDelay: `${i * 0.3}s` }}>
                <line x1="0" y1="0" x2="0" y2="18" stroke="#188546" strokeWidth="2.5" />
                {[0, 72, 144, 216, 288].map((a) => (
                  <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 6.5} cy={Math.sin((a * Math.PI) / 180) * 6.5} r="4.4" fill={i % 2 ? '#ff9163' : '#ffd54d'} />
                ))}
                <circle cx="0" cy="0" r="3.4" fill="#f04e1d" />
              </g>
            ))}

            {/* niños tomados de la mano subiendo el sendero */}
            <line x1="356" y1="284" x2="404" y2="270" stroke="#ffcf9e" strokeWidth="4" strokeLinecap="round" />
            <line x1="404" y1="270" x2="452" y2="282" stroke="#ffcf9e" strokeWidth="4" strokeLinecap="round" />

            <g transform="translate(356 268)">
              <rect x="-6" y="18" width="6" height="16" rx="3" fill="#ff6a35" />
              <rect x="4" y="18" width="6" height="16" rx="3" fill="#ff6a35" />
              <rect x="-11" y="0" width="22" height="26" rx="9" fill="#ff6a35" />
              <circle cx="0" cy="-13" r="13" fill="#5a3a22" />
              <circle cx="0" cy="-10" r="10" fill="#ffcf9e" />
              <circle cx="-3.5" cy="-10" r="1.4" fill="#2b2b2b" />
              <circle cx="3.5" cy="-10" r="1.4" fill="#2b2b2b" />
              <path d="M-3 -5 Q0 -3 3 -5" stroke="#c96b3f" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            </g>
            <g transform="translate(404 254)">
              <rect x="-7" y="20" width="7" height="18" rx="3.5" fill="#1cade4" />
              <rect x="4" y="20" width="7" height="18" rx="3.5" fill="#1cade4" />
              <rect x="-13" y="0" width="26" height="30" rx="10" fill="#1cade4" />
              <circle cx="-14" cy="-8" r="4.4" fill="#2b2b2b" />
              <circle cx="14" cy="-8" r="4.4" fill="#2b2b2b" />
              <circle cx="0" cy="-15" r="15" fill="#2b2b2b" />
              <circle cx="0" cy="-11" r="11" fill="#ffcf9e" />
              <circle cx="-4" cy="-11" r="1.5" fill="#2b2b2b" />
              <circle cx="4" cy="-11" r="1.5" fill="#2b2b2b" />
              <path d="M-3.5 -5 Q0 -2.5 3.5 -5" stroke="#c96b3f" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </g>
            <g transform="translate(452 266)">
              <rect x="-6" y="17" width="6" height="15" rx="3" fill="#8339d6" />
              <rect x="4" y="17" width="6" height="15" rx="3" fill="#8339d6" />
              <rect x="-10" y="0" width="20" height="24" rx="8" fill="#8339d6" />
              {[-150, -115, -80, -45, -10].map((a) => (
                <circle
                  key={a}
                  cx={Math.cos((a * Math.PI) / 180) * 12}
                  cy={-12 + Math.sin((a * Math.PI) / 180) * 12}
                  r="4.2"
                  fill="#7a4a1e"
                />
              ))}
              <circle cx="0" cy="-12" r="12" fill="#7a4a1e" />
              <circle cx="0" cy="-9" r="9" fill="#ffcf9e" />
              <circle cx="-3" cy="-9" r="1.3" fill="#2b2b2b" />
              <circle cx="3" cy="-9" r="1.3" fill="#2b2b2b" />
              <path d="M-3 -4 Q0 -2 3 -4" stroke="#c96b3f" strokeWidth="1.3" strokeLinecap="round" fill="none" />
            </g>

            {/* biblia radiante en la cima */}
            <g transform="translate(400 140)">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                <line
                  key={a}
                  x1={Math.cos((a * Math.PI) / 180) * 42}
                  y1={Math.sin((a * Math.PI) / 180) * 42}
                  x2={Math.cos((a * Math.PI) / 180) * 58}
                  y2={Math.sin((a * Math.PI) / 180) * 58}
                  stroke="#ffd76b"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.7"
                />
              ))}
              <circle cx="0" cy="0" r="46" fill="#ffe685" opacity="0.55" />
              <circle cx="0" cy="0" r="32" fill="#fff3c4" opacity="0.9" />
              <path d="M-24 7 Q0 -8 24 7 V18 Q0 7 -24 18 Z" fill="#ffffff" stroke="#f0ad00" strokeWidth="2" />
              <path d="M0 7 V18" stroke="#f0ad00" strokeWidth="2" />
            </g>
          </svg>
        </div>

        <div className="relative mx-auto -mt-2 flex max-w-2xl justify-center px-6 pb-10">
          <Link
            to="/login"
            className="lp-pulse lp-in rounded-full bg-coral-400 px-10 py-4 text-xl font-extrabold text-white shadow-soft transition-transform hover:scale-105 active:scale-95"
            style={{ animationDelay: '0.3s' }}
          >
            Comenzar la aventura
          </Link>
        </div>
      </header>

      {/* FEATURES */}
      <section className="mx-auto mt-10 max-w-5xl px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="mt-2 text-lg">{f.title}</h3>
              <p className="mt-1 text-ink/60">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HISTORIA */}
      <section className="mx-auto mt-20 max-w-3xl px-6 text-center">
        <span className="badge bg-coral-100 text-coral-600">Nuestra historia</span>
        <h2 className="mt-3 text-3xl uppercase text-coral-500">Nació en el corazón</h2>
        <p className="mt-4 text-lg leading-relaxed text-ink/70">
          Esto nació de algo sencillo: quería que los niños de la iglesia tuvieran un espacio propio,
          ordenado y bonito para conocer a Dios. Y que las docentes y los padres pudieran acompañarlos
          sin enredos ni papeles perdidos, sin necesidad de ser expertos en tecnología.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-ink/70">
          La idea la llevaba en el corazón desde hacía tiempo. La primera vez que me senté a construirla
          fue un mes antes de que naciera mi segundo hijo, así que no pude seguir. Cuando quise retomarla,
          ya no pude entrar a ese proyecto, se había perdido. Pasaron casi dos años hasta que volví a
          encontrar espacio en mi agenda, y esta vez la empecé desde cero.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-ink/70">
          KidsMin es un trabajo hecho con cariño, entregado como ofrenda al Señor. Para que la Palabra
          se enseñe de una forma bonita, y para que cada niño y niña disfrute más su tiempo en la iglesia.
        </p>
        <div className="mt-5 flex flex-col items-center gap-1">
          <a
            href="https://gobeapp.com"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-extrabold uppercase tracking-wide text-sky-600 hover:underline"
          >
            Gobe App Technology
          </a>
          <a
            href="https://gobeapp.com/gise/"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-extrabold uppercase tracking-wide text-coral-500 hover:underline"
          >
            Gisella Bustamante, creadora de KidsMin
          </a>
        </div>
      </section>

      {/* OFRENDA */}
      <section className="mx-auto mt-20 max-w-3xl px-6">
        <div className="card border-4 border-sunshine-300 bg-sunshine-50 text-center">
          <span className="text-4xl">💛</span>
          <h2 className="mt-2 text-2xl uppercase text-sunshine-700">¿Quieres bendecir este proyecto?</h2>
          <p className="mx-auto mt-3 max-w-lg text-ink/70">
            KidsMin se entrega como ofrenda, de corazón. No es un pago obligatorio. Pero si esta
            herramienta ha sido de bendición para tu iglesia y quieres sembrar para que llegue a más
            escuelitas, hazlo con la libertad que Dios ponga en tu corazón.
          </p>
          <div className="mx-auto mt-5 inline-flex flex-col items-center gap-1 rounded-chunky bg-white px-6 py-4 shadow-card">
            <span className="text-xs font-extrabold uppercase tracking-wide text-ink/40">Llave / Cuenta</span>
            <span className="text-2xl font-extrabold tracking-wide text-sunshine-700">1140869398</span>
            <span className="text-sm font-bold text-ink/60">Gisella Bustamante</span>
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section className="mx-auto mt-20 max-w-2xl px-6">
        <div className="text-center">
          <span className="badge bg-sky-100 text-sky-700">Hablemos</span>
          <h2 className="mt-3 text-3xl uppercase text-sky-600">¿Quieres tenerla en tu iglesia?</h2>
          <p className="mx-auto mt-3 max-w-lg text-ink/60">
            Escríbeme si quieres KidsMin para tu escuelita, si tienes una sugerencia, si necesitas
            soporte o si quieres apoyar el proyecto de otra forma. Leo todos los mensajes.
          </p>
        </div>
        <div className="card mt-8">
          <ContactoForm />
        </div>
      </section>

      {/* CTA FINAL */}
      <footer className="mt-20 bg-ink px-6 py-14 text-center text-white">
        <h2 className="text-2xl uppercase">¿Lista tu escuelita para empezar?</h2>
        <p className="mt-2 text-white/60">Entra con tu cuenta o pide que te inviten.</p>
        <Link to="/login" className="btn-primary mt-6 inline-flex">
          Ingresar
        </Link>
        <p className="mt-8 text-xs text-white/30">KidsMin, hecho con fe, como ofrenda para la gloria de Dios.</p>
      </footer>
    </div>
  )
}

function ContactoForm() {
  const [form, setForm] = useState({ nombre: '', iglesia: '', contacto: '', motivo: 'quiero-tenerla', mensaje: '' })
  const [status, setStatus] = useState('idle') // idle | enviando | ok | error

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('enviando')
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('request failed')
      setStatus('ok')
      setForm({ nombre: '', iglesia: '', contacto: '', motivo: 'quiero-tenerla', mensaje: '' })
    } catch {
      setStatus('error')
    }
  }

  if (status === 'ok') {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="text-4xl">💌</span>
        <p className="text-lg font-extrabold text-sky-600">¡Mensaje enviado!</p>
        <p className="text-ink/60">Gracias por escribir. Te responderé pronto.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Tu nombre</label>
          <input required className="input" value={form.nombre} onChange={set('nombre')} placeholder="Ej. María Pérez" />
        </div>
        <div>
          <label className="label">Iglesia (opcional)</label>
          <input className="input" value={form.iglesia} onChange={set('iglesia')} placeholder="Ej. Iglesia Emmanuel" />
        </div>
      </div>
      <div>
        <label className="label">Correo o teléfono para contactarte</label>
        <input required className="input" value={form.contacto} onChange={set('contacto')} placeholder="tucorreo@ejemplo.com o tu número" />
      </div>
      <div>
        <label className="label">¿Sobre qué nos escribes?</label>
        <select className="input" value={form.motivo} onChange={set('motivo')}>
          {MOTIVOS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Mensaje</label>
        <textarea
          required
          rows={4}
          className="input"
          value={form.mensaje}
          onChange={set('mensaje')}
          placeholder="Cuéntame un poco más..."
        />
      </div>
      {status === 'error' && (
        <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">
          No se pudo enviar tu mensaje. Intenta de nuevo en un momento.
        </p>
      )}
      <button disabled={status === 'enviando'} className="btn-primary justify-center">
        {status === 'enviando' ? 'Enviando...' : 'Enviar mensaje'}
      </button>
    </form>
  )
}
