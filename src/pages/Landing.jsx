import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppLogo from '../components/AppLogo'
import heroImg from '../assets/hero-ninos-cruz.jpg'
import appScreen from '../assets/kidsmin-screen-clases.png'

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

const ROLES = [
  { icon: '👧', title: 'Niños', text: 'Un espacio pensado para que aprendan, participen y disfruten su tiempo en la iglesia.' },
  { icon: '👨‍👩‍👧', title: 'Familias', text: 'Una forma sencilla de acompañar desde casa lo que sus hijos viven en el ministerio.' },
  { icon: '👩‍🏫', title: 'Docentes y líderes', text: 'Herramientas para organizar clases, asistencia y acompañamiento sin enredos.' },
]

const STEPS = [
  { number: '01', title: 'Conoce KidsMin', text: 'Descubre cómo puede funcionar en el ministerio infantil de tu iglesia.' },
  { number: '02', title: 'Solicita acceso', text: 'Cuéntanos sobre tu iglesia y te orientamos para comenzar.' },
  { number: '03', title: 'Conecta a tu equipo', text: 'Docentes y líderes pueden empezar a organizar su trabajo.' },
  { number: '04', title: 'Acompaña a las familias', text: 'La información y las experiencias del ministerio llegan más cerca de casa.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fffaf0] text-ink">
      <style>{`
        @keyframes lp-drift { from { transform: translateX(-8%); } to { transform: translateX(8%); } }
        @keyframes lp-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes lp-twinkle { 0%, 100% { opacity: .25; } 50% { opacity: .9; } }
        @keyframes lp-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,106,53,.32); } 50% { box-shadow: 0 0 0 12px rgba(255,106,53,0); } }
        @keyframes lp-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .lp-cloud { animation: lp-drift 34s ease-in-out infinite alternate; }
        .lp-bird { animation: lp-bob 3.2s ease-in-out infinite; }
        .lp-star { animation: lp-twinkle 2.6s ease-in-out infinite; }
        .lp-pulse { animation: lp-pulse 2.6s ease-in-out infinite; }
        .lp-in { animation: lp-in .7s cubic-bezier(.22,1,.36,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .lp-cloud, .lp-bird, .lp-star, .lp-pulse, .lp-in { animation: none !important; }
        }
      `}</style>

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-white/70 bg-[#fffaf0]/90 px-5 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <a href="#inicio" className="flex items-center gap-2 font-extrabold text-sky-700">
            <AppLogo emojiClassName="text-2xl" imgClassName="h-9 w-9 object-contain" />
            <span className="hidden sm:inline text-xl">Kids<span className="text-coral-500">Min</span></span>
          </a>
          <div className="hidden items-center gap-6 text-sm font-bold text-ink/60 md:flex">
            <a href="#que-es" className="hover:text-sky-600">¿Qué es?</a>
            <a href="#funciones" className="hover:text-sky-600">Funciones</a>
            <a href="#como-funciona" className="hover:text-sky-600">Cómo funciona</a>
            <a href="#iglesias" className="hover:text-sky-600">Para iglesias</a>
          </div>
          <Link to="/login" className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-700">
            Acceder
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <header id="inicio" className="relative overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-[#fffaf0]">
        <div className="pointer-events-none absolute right-8 top-8 h-24 w-24 rounded-full bg-sunshine-300 opacity-90 shadow-[0_0_70px_28px_rgba(255,199,44,.45)] sm:right-16 sm:h-32 sm:w-32" />
        <span className="lp-star pointer-events-none absolute left-[13%] top-20 text-2xl text-white">✦</span>
        <span className="lp-star pointer-events-none absolute right-[20%] top-28 text-lg text-white" style={{ animationDelay: '.9s' }}>✦</span>
        <div className="lp-cloud pointer-events-none absolute left-[5%] top-24 flex items-center opacity-80">
          <div className="h-7 w-16 rounded-full bg-white sm:h-9 sm:w-24" />
          <div className="-ml-6 h-10 w-16 rounded-full bg-white sm:-ml-8 sm:h-12 sm:w-20" />
        </div>
        <div className="lp-bird pointer-events-none absolute right-[28%] top-20">
          <span className="text-xl text-coral-500">⌁</span>
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-12 lg:pb-20 lg:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_.98fr]">
            <div className="lp-in max-w-2xl">
              <span className="inline-flex rounded-full bg-white/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[.14em] text-sky-700 shadow-sm">
                Plataforma digital para ministerios infantiles
              </span>
              <h1 className="mt-5 text-5xl font-black leading-[.98] tracking-tight text-sky-700 sm:text-6xl lg:text-7xl">
                El ministerio infantil de tu iglesia, <span className="text-coral-500">también en un solo lugar.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg font-semibold leading-relaxed text-ink/65 sm:text-xl">
                KidsMin conecta a niños, familias, docentes y líderes para organizar clases, asistencia, actividades y acompañamiento espiritual desde una sola aplicación.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#iglesias" className="lp-pulse inline-flex items-center justify-center rounded-full bg-coral-500 px-7 py-4 text-base font-extrabold text-white shadow-soft transition hover:scale-[1.02]">
                  Quiero KidsMin en mi iglesia
                </a>
                <Link to="/login" className="inline-flex items-center justify-center rounded-full border-2 border-sky-600 bg-white/70 px-7 py-4 text-base font-extrabold text-sky-700 transition hover:bg-white">
                  Ya tengo KidsMin · Acceder
                </Link>
              </div>
              <p className="mt-4 text-sm font-bold text-ink/45">Pensada para iglesias y ministerios que quieren acompañar mejor a sus niños.</p>
            </div>

            <div className="lp-in relative mx-auto w-full max-w-xl lg:pl-6" style={{ animationDelay: '.12s' }}>
              <div className="relative mx-auto max-w-[560px]">
                <div className="relative rounded-[1.7rem] border-[7px] border-ink/90 bg-ink p-1 shadow-[0_28px_80px_rgba(24,57,76,.24)]">
                  <div className="mb-1 flex items-center justify-center gap-1.5 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                    <span className="h-1.5 w-14 rounded-full bg-white/20" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                  </div>
                  <div className="overflow-hidden rounded-[1rem] bg-white">
                    <img src={appScreen} alt="Pantalla real de KidsMin mostrando la gestión de clases" className="block h-auto w-full" />
                  </div>
                </div>
                <div className="absolute -bottom-5 -left-4 hidden w-56 rounded-2xl border border-white bg-white/95 p-4 shadow-card sm:block">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-sky-100 text-xl">📱</div>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wide text-sky-600">Interfaz real</p>
                      <p className="font-black text-ink">Así se ve KidsMin por dentro.</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-4 top-7 hidden rounded-2xl bg-sunshine-300 px-4 py-3 text-sm font-black text-ink shadow-card sm:block">
                  Clases · asistencia · seguimiento
                </div>
              </div>
              <div className="mt-8 overflow-hidden rounded-[1.5rem] border-4 border-white/90 bg-white shadow-soft">
                <img src={heroImg} alt="Niños compartiendo la Palabra" className="h-36 w-full object-cover sm:h-40" />
                <div className="flex items-center justify-between gap-4 px-5 py-3">
                  <p className="font-extrabold text-ink">Una herramienta para servir mejor.</p>
                  <span className="hidden rounded-full bg-coral-100 px-3 py-1 text-xs font-black text-coral-600 sm:inline">Hecho con propósito</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* WHAT IS IT */}
      <section id="que-es" className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-sky-100 px-4 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-sky-700">¿Qué es KidsMin?</span>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-ink sm:text-5xl">Una app para acompañar mejor a toda la comunidad infantil.</h2>
          <p className="mt-5 text-lg leading-relaxed text-ink/60">
            No es solo una agenda de clases. Es un punto de encuentro digital para las personas que hacen posible el ministerio infantil.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {ROLES.map((role) => (
            <article key={role.title} className="rounded-[1.75rem] border border-ink/5 bg-white p-7 shadow-card transition duration-300 hover:-translate-y-1">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-3xl">{role.icon}</span>
              <h3 className="mt-5 text-2xl font-black text-ink">{role.title}</h3>
              <p className="mt-2 leading-relaxed text-ink/60">{role.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="funciones" className="bg-white/65 px-6 py-20 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <span className="rounded-full bg-coral-100 px-4 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-coral-600">Dentro de la app</span>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-ink sm:text-5xl">Todo lo importante, sin complicarlo.</h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article key={f.title} className="group rounded-[1.5rem] border border-ink/5 bg-[#fffaf0] p-6 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-card">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-2xl shadow-sm transition group-hover:scale-105">{f.icon}</span>
                <h3 className="mt-4 text-xl font-black text-ink">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-ink/60">{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
          <div>
            <span className="rounded-full bg-sunshine-100 px-4 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-sunshine-700">Así funciona</span>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-ink sm:text-5xl">De la idea a tu iglesia, paso a paso.</h2>
            <p className="mt-5 leading-relaxed text-ink/60">
              Queremos que la tecnología quite trabajo, no que agregue más. Por eso el camino para comenzar debe ser sencillo.
            </p>
          </div>

          <div className="grid gap-4">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-5 rounded-[1.5rem] border border-ink/5 bg-white p-5 shadow-sm sm:p-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-100 font-black text-sky-700">{step.number}</span>
                <div>
                  <h3 className="text-xl font-black">{step.title}</h3>
                  <p className="mt-1 leading-relaxed text-ink/60">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PURPOSE */}
      <section className="mx-6 rounded-[2rem] bg-gradient-to-br from-sky-700 to-sky-600 px-6 py-16 text-white shadow-soft sm:px-10 lg:mx-auto lg:max-w-6xl lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
          <div>
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-white">Hecho con propósito</span>
            <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">Tecnología al servicio del ministerio.</h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">
              KidsMin nació del deseo de crear un espacio propio, ordenado y bonito para el ministerio infantil, ayudando a docentes y familias a acompañar a los niños sin enredos ni papeles perdidos.
            </p>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/75">
              Es un proyecto construido con fe y entregado como ofrenda para que la Palabra se enseñe de una forma bonita y cada niño disfrute más su tiempo en la iglesia.
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-white/10 p-7 backdrop-blur-sm">
            <p className="text-sm font-extrabold uppercase tracking-widest text-white/60">Creado por</p>
            <p className="mt-2 text-2xl font-black">Gisella Bustamante</p>
            <a href="https://gobeapp.com/gise/" target="_blank" rel="noreferrer" className="mt-2 inline-block font-bold text-sunshine-300 hover:underline">Conocer a la creadora →</a>
          </div>
        </div>
      </section>

      {/* REQUEST */}
      <section id="iglesias" className="mx-auto max-w-5xl px-6 py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-coral-100 px-4 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-coral-600">Para tu iglesia</span>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-ink sm:text-5xl">¿Quieres tener KidsMin en tu iglesia?</h2>
          <p className="mt-4 text-lg leading-relaxed text-ink/60">
            Cuéntanos un poco sobre tu ministerio y te explicaremos cómo empezar.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-ink/5 bg-white p-6 shadow-card sm:p-8">
          <ContactoForm />
        </div>
      </section>

      {/* EXISTING USERS */}
      <section className="mx-6 mb-16 rounded-[2rem] bg-sunshine-100 px-6 py-12 text-center sm:px-10 lg:mx-auto lg:max-w-6xl">
        <span className="text-4xl">👋</span>
        <h2 className="mt-3 text-3xl font-black text-ink">¿Tu iglesia ya tiene KidsMin?</h2>
        <p className="mx-auto mt-2 max-w-xl text-ink/60">Entra directamente a tu cuenta y continúa con tu ministerio.</p>
        <Link to="/login" className="mt-6 inline-flex rounded-full bg-ink px-7 py-3.5 font-extrabold text-white transition hover:-translate-y-0.5">
          Acceder a KidsMin →
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="bg-ink px-6 py-12 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-2xl font-black">Kids<span className="text-coral-400">Min</span></p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/50">
              Una herramienta creada con fe para acompañar a los ministerios infantiles.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-white/60">
            <a href="#que-es" className="hover:text-white">¿Qué es?</a>
            <a href="#funciones" className="hover:text-white">Funciones</a>
            <a href="#iglesias" className="hover:text-white">Quiero KidsMin</a>
            <Link to="/login" className="text-white hover:text-coral-300">Acceder</Link>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-6xl border-t border-white/10 pt-5 text-xs text-white/30">
          KidsMin · Hecho con fe, como ofrenda para la gloria de Dios.
        </div>
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
