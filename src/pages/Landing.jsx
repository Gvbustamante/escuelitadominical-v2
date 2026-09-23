import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppLogo from '../components/AppLogo'
import heroImg from '../assets/hero-ninos-cruz.jpg'
import appScreen from '../assets/kidsmin-screen-clases.png'
import loginScreen from '../assets/kidsmin-screen-login.png'

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

      {/* HERO */}
      <header id="inicio" className="relative overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-[#fffaf0]">
        {/* Decoración de fondo */}
        <div className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-white/45 blur-3xl" />
        <div className="pointer-events-none absolute right-[-8rem] top-20 h-96 w-96 rounded-full bg-sunshine-200/45 blur-3xl" />

        <div className="pointer-events-none absolute right-10 top-8 h-24 w-24 rounded-full bg-sunshine-300 shadow-[0_0_70px_28px_rgba(255,199,44,.36)] sm:right-20 sm:h-32 sm:w-32" />

        <span className="lp-star pointer-events-none absolute left-[8%] top-24 text-2xl text-white">✦</span>
        <span className="lp-star pointer-events-none absolute left-[45%] top-28 text-xl text-white" style={{ animationDelay: '.7s' }}>✦</span>
        <span className="lp-star pointer-events-none absolute right-[25%] top-20 text-lg text-white" style={{ animationDelay: '1.2s' }}>✦</span>

        {/* Nubes */}
        <div className="lp-cloud pointer-events-none absolute left-[2%] top-24 flex items-center opacity-80">
          <div className="h-7 w-16 rounded-full bg-white sm:h-9 sm:w-24" />
          <div className="-ml-6 h-10 w-16 rounded-full bg-white sm:-ml-8 sm:h-12 sm:w-20" />
        </div>
        <div className="lp-cloud pointer-events-none absolute right-[8%] top-44 flex items-center opacity-60" style={{ animationDelay: '-10s' }}>
          <div className="h-6 w-14 rounded-full bg-white sm:h-8 sm:w-20" />
          <div className="-ml-5 h-8 w-14 rounded-full bg-white sm:-ml-6 sm:h-10 sm:w-16" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pb-14 pt-8 sm:px-6 lg:pb-16 lg:pt-10">
          {/* Barra superior dentro del hero */}
          <div className="mb-10 flex items-center justify-between">
            <a href="#inicio" className="flex items-center gap-2">
              <AppLogo emojiClassName="text-2xl" imgClassName="h-10 w-10 object-contain" />
              <span className="text-xl font-black text-sky-700">Kids<span className="text-coral-500">Min</span></span>
            </a>

            <div className="hidden items-center gap-7 text-sm font-extrabold text-sky-800/75 md:flex">
              <a href="#que-es" className="transition hover:text-sky-600">¿Qué es?</a>
              <a href="#funciones" className="transition hover:text-sky-600">Funciones</a>
              <a href="#como-funciona" className="transition hover:text-sky-600">Cómo funciona</a>
              <a href="#iglesias" className="transition hover:text-sky-600">Para iglesias</a>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden rounded-full bg-white px-5 py-3 text-sm font-extrabold text-sky-700 shadow-[0_8px_25px_rgba(32,106,150,.12)] transition hover:-translate-y-0.5 sm:inline-flex"
              >
                ↪ &nbsp;Acceder
              </Link>
              <a
                href="#iglesias"
                className="rounded-full bg-coral-500 px-3.5 py-2.5 text-xs font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-coral-600 sm:px-5 sm:py-3 sm:text-sm"
              >
                <span className="sm:hidden">⛪ Quiero</span>
                <span className="hidden sm:inline">Quiero KidsMin</span>
              </a>
            </div>
          </div>

          <div className="grid items-center gap-8 lg:grid-cols-[.86fr_1.14fr] lg:gap-4">
            {/* Copy */}
            <div className="lp-in relative z-20 max-w-2xl lg:pb-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-[11px] font-black uppercase tracking-[.13em] text-sky-700 shadow-sm">
                <span>☀️</span>
                Plataforma digital para ministerios infantiles
              </div>

              <h1 className="mt-5 max-w-[680px] text-[2.25rem] font-black leading-[.96] tracking-[-.045em] text-[#123b68] sm:text-5xl md:text-6xl lg:text-[4.55rem]">
                El ministerio infantil de tu iglesia,
                <span className="mt-1 block">
                  <span className="text-sky-600">en un </span>
                  <span className="text-coral-500">solo</span>
                  <span className="text-sunshine-500"> lugar.</span>
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-sm font-semibold leading-relaxed text-ink/60 sm:mt-6 sm:text-base lg:text-lg">
                KidsMin conecta a niños, familias, docentes y líderes para organizar clases, asistencia, actividades y acompañamiento espiritual desde una sola aplicación.
              </p>

              <div className="mt-5 flex flex-col gap-2.5 sm:mt-7 sm:flex-row sm:gap-3">
                <a
                  href="#iglesias"
                  className="lp-pulse inline-flex items-center justify-center gap-2 rounded-full bg-coral-500 px-5 py-3 text-sm font-black text-white shadow-soft transition hover:scale-[1.02] sm:px-7 sm:py-4 sm:text-base"
                >
                  ⛪ Quiero KidsMin en mi iglesia →
                </a>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white bg-white/90 px-5 py-3 text-sm font-black text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white sm:px-7 sm:py-4 sm:text-base"
                >
                  ↪ Ya tengo KidsMin · Acceder
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-extrabold text-ink/45">
                <span>💗 Fortalece tu ministerio</span>
                <span>👨‍👩‍👧 Conecta a las familias</span>
                <span>🛡️ Simple y organizado</span>
              </div>
            </div>

            {/* Producto real: desktop + móvil */}
            <div className="lp-in relative z-10 mx-auto min-h-[300px] w-full max-w-[760px] sm:min-h-[430px] md:min-h-[500px] lg:-ml-3" style={{ animationDelay: '.12s' }}>
              {/* Texto manuscrito */}
              <div className="absolute right-[12%] top-0 z-30 hidden rotate-[-3deg] text-right text-sm font-black leading-tight text-sky-700 sm:block">
                Organiza, conecta<br />y haz crecer tu ministerio ♥
              </div>

              {/* Laptop */}
              <div className="absolute left-[2%] top-[7%] w-[88%] rounded-[1.7rem] border-[7px] border-[#17384f] bg-[#17384f] p-1 shadow-[0_30px_75px_rgba(24,57,76,.27)] sm:left-[4%] sm:w-[89%]">
                <div className="flex items-center justify-center gap-1.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                  <span className="h-1.5 w-16 rounded-full bg-white/20" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                </div>
                <div className="overflow-hidden rounded-[1.05rem] bg-white">
                  <img
                    src={appScreen}
                    alt="Pantalla real de KidsMin con niños y clases"
                    className="block w-full"
                  />
                </div>
              </div>

              {/* Base de laptop */}
              <div className="absolute left-[10%] top-[69%] z-0 h-5 w-[75%] rounded-b-2xl bg-[#17384f] shadow-lg sm:h-7" />
              <div className="absolute left-[30%] top-[72%] z-0 h-2 w-[35%] rounded-full bg-[#58748a]" />

              {/* Teléfono */}
              <div className="absolute bottom-[2%] right-[1%] z-30 w-[29%] min-w-[150px] max-w-[215px] rotate-[4deg] rounded-[1.8rem] border-[7px] border-[#17384f] bg-[#17384f] p-1 shadow-[0_28px_65px_rgba(24,57,76,.30)] sm:right-[0%] sm:w-[31%]">
                <div className="relative overflow-hidden rounded-[1.25rem] bg-white">
                  <div className="absolute left-1/2 top-1.5 z-20 h-3.5 w-16 -translate-x-1/2 rounded-full bg-[#17384f]" />
                  <img
                    src={loginScreen}
                    alt="Pantalla real de acceso a KidsMin"
                    className="block w-full"
                  />
                </div>
              </div>

              {/* Chips de producto */}
              <div className="absolute bottom-[13%] left-[1%] z-30 rounded-2xl bg-sunshine-300 px-4 py-3 text-xs font-black text-ink shadow-card">
                ✨ También en tu celular
              </div>

              <div className="absolute right-[28%] top-[24%] z-30 hidden rounded-2xl bg-white/95 px-4 py-3 shadow-card backdrop-blur-sm sm:block">
                <p className="text-[10px] font-black uppercase tracking-wide text-sky-600">KidsMin</p>
                <p className="text-sm font-black text-ink">Organiza · conecta · acompaña</p>
              </div>

              <div className="absolute bottom-[7%] right-[33%] z-20 hidden text-2xl text-coral-500 sm:block">✦</div>
              <div className="absolute right-[5%] top-[49%] z-20 hidden text-3xl text-sunshine-500 sm:block">✦</div>
            </div>
          </div>
        </div>

        {/* transición suave */}
        <div className="pointer-events-none absolute bottom-[-1px] left-0 right-0 h-12 bg-gradient-to-t from-[#fffaf0] to-transparent" />
      </header>

      {/* WHAT IS IT */}
      <section id="que-es" className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-sky-100 px-4 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-sky-700">¿Qué es KidsMin?</span>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-ink sm:text-4xl md:text-5xl">Una app para acompañar mejor a toda la comunidad infantil.</h2>
          <p className="mt-4 text-base leading-relaxed text-ink/60 sm:mt-5 sm:text-lg">
            No es solo una agenda de clases. Es un punto de encuentro digital para las personas que hacen posible el ministerio infantil.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {ROLES.map((role) => (
            <article key={role.title} className="rounded-[1.75rem] border border-ink/5 bg-white p-5 shadow-card transition duration-300 hover:-translate-y-1 sm:p-7">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-2xl sm:h-14 sm:w-14 sm:text-3xl">{role.icon}</span>
              <h3 className="mt-4 text-xl font-black text-ink sm:mt-5 sm:text-2xl">{role.title}</h3>
              <p className="mt-2 leading-relaxed text-ink/60">{role.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="mx-auto max-w-6xl px-5 pb-4 sm:px-6">
        <div className="grid gap-3 rounded-[1.5rem] bg-white/80 p-4 shadow-sm sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-coral-100 text-xl">💗</span>
            <div><p className="font-black">Fortalece tu ministerio</p><p className="text-xs text-ink/50">Más orden y seguimiento</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-100 text-xl">👨‍👩‍👧</span>
            <div><p className="font-black">Conecta a las familias</p><p className="text-xs text-ink/50">Más cerca de lo que viven</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sunshine-100 text-xl">🛡️</span>
            <div><p className="font-black">Simple y organizado</p><p className="text-xs text-ink/50">Pensado para tu equipo</p></div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="funciones" className="bg-white/65 px-5 py-14 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <span className="rounded-full bg-coral-100 px-4 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-coral-600">Dentro de la app</span>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-ink sm:text-4xl md:text-5xl">Todo lo importante, sin complicarlo.</h2>
          </div>

          <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article key={f.title} className="group rounded-[1.5rem] border border-ink/5 bg-[#fffaf0] p-5 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-card sm:p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xl shadow-sm transition group-hover:scale-105 sm:h-12 sm:w-12 sm:text-2xl">{f.icon}</span>
                <h3 className="mt-3 text-lg font-black text-ink sm:mt-4 sm:text-xl">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-ink/60">{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20 lg:py-24">
        <div className="grid gap-8 sm:gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
          <div>
            <span className="rounded-full bg-sunshine-100 px-4 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-sunshine-700">Así funciona</span>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-ink sm:text-4xl md:text-5xl">De la idea a tu iglesia, paso a paso.</h2>
            <p className="mt-5 leading-relaxed text-ink/60">
              Queremos que la tecnología quite trabajo, no que agregue más. Por eso el camino para comenzar debe ser sencillo.
            </p>
          </div>

          <div className="grid gap-4">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-3.5 rounded-[1.5rem] border border-ink/5 bg-white p-4 shadow-sm sm:gap-5 sm:p-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sm font-black text-sky-700 sm:h-12 sm:w-12 sm:text-base">{step.number}</span>
                <div>
                  <h3 className="text-lg font-black sm:text-xl">{step.title}</h3>
                  <p className="mt-1 leading-relaxed text-ink/60">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PURPOSE */}
      <section className="mx-4 rounded-[1.5rem] bg-gradient-to-br from-sky-700 to-sky-600 px-5 py-12 text-white shadow-soft sm:mx-6 sm:rounded-[2rem] sm:px-10 sm:py-16 lg:mx-auto lg:max-w-6xl lg:py-20">
        <div className="grid gap-8 sm:gap-10 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
          <div>
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-white">Hecho con propósito</span>
            <h2 className="mt-4 text-2xl font-black tracking-tight sm:mt-5 sm:text-4xl md:text-5xl">Tecnología al servicio del ministerio.</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75 sm:mt-5 sm:text-lg">
              KidsMin nació del deseo de crear un espacio propio, ordenado y bonito para el ministerio infantil, ayudando a docentes y familias a acompañar a los niños sin enredos ni papeles perdidos.
            </p>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/75 sm:mt-4 sm:text-lg">
              Es un proyecto construido con fe y entregado como ofrenda para que la Palabra se enseñe de una forma bonita y cada niño disfrute más su tiempo en la iglesia.
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-white/10 p-5 backdrop-blur-sm sm:p-7">
            <p className="text-sm font-extrabold uppercase tracking-widest text-white/60">Creado por</p>
            <p className="mt-2 text-2xl font-black">Gisella Bustamante</p>
            <a href="https://gvbustamante.github.io/portafolio/" target="_blank" rel="noreferrer" className="mt-2 inline-block font-bold text-sunshine-300 hover:underline">Conocer a la creadora →</a>
          </div>
        </div>
      </section>

      {/* TWO PATHS */}
      <section className="mx-auto max-w-6xl px-5 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-emerald-50 to-sky-50 p-5 shadow-sm sm:rounded-[2rem] sm:p-7">
            <div className="absolute -right-5 -top-5 text-6xl opacity-20 sm:text-7xl">⛪</div>
            <span className="text-2xl sm:text-3xl">🏠</span>
            <h3 className="mt-2 text-xl font-black sm:mt-3 sm:text-2xl">¿Quieres llevar KidsMin a tu iglesia?</h3>
            <p className="mt-2 max-w-md text-sm text-ink/60 sm:text-base">Cuéntanos sobre tu ministerio y te explicaremos cómo comenzar.</p>
            <a href="#iglesias" className="mt-4 inline-flex rounded-full bg-coral-500 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 sm:mt-5 sm:px-6 sm:py-3.5 sm:text-base">
              Quiero KidsMin en mi iglesia →
            </a>
          </div>

          <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-violet-50 to-sky-50 p-5 shadow-sm sm:rounded-[2rem] sm:p-7">
            <div className="absolute -right-5 -top-5 text-6xl opacity-20 sm:text-7xl">💻</div>
            <span className="text-2xl sm:text-3xl">👋</span>
            <h3 className="mt-2 text-xl font-black sm:mt-3 sm:text-2xl">¿Tu iglesia ya usa KidsMin?</h3>
            <p className="mt-2 max-w-md text-sm text-ink/60 sm:text-base">Entonces ya puedes entrar directamente a tu cuenta.</p>
            <Link to="/login" className="mt-4 inline-flex rounded-full bg-white px-5 py-3 text-sm font-extrabold text-sky-700 shadow-card transition hover:-translate-y-0.5 sm:mt-5 sm:px-6 sm:py-3.5 sm:text-base">
              Acceder a KidsMin →
            </Link>
          </div>
        </div>
      </section>

      {/* REQUEST */}
      <section id="iglesias" className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-coral-100 px-4 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-coral-600">Para tu iglesia</span>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-ink sm:text-4xl md:text-5xl">¿Quieres tener KidsMin en tu iglesia?</h2>
          <p className="mt-3 text-base leading-relaxed text-ink/60 sm:mt-4 sm:text-lg">
            Cuéntanos un poco sobre tu ministerio y te explicaremos cómo empezar.
          </p>
        </div>
        <div className="mx-auto mt-8 max-w-2xl rounded-[1.5rem] border border-ink/5 bg-white p-5 shadow-card sm:mt-10 sm:rounded-[2rem] sm:p-8">
          <ContactoForm />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-ink px-5 py-10 text-white sm:px-6 sm:py-12">
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
