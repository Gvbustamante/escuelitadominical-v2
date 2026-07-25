import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

function Step({ number, icon, title, children, color = 'sky' }) {
  const bg = {
    sky: 'bg-sky-400',
    grass: 'bg-grass-400',
    sunshine: 'bg-sunshine-400',
    coral: 'bg-coral-400',
    grape: 'bg-grape-400',
  }[color]

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${bg} text-xl font-bold text-white shadow-pop`}>
          {number}
        </div>
        <div className="mt-2 w-0.5 flex-1 bg-ink/10 last:hidden" />
      </div>
      <div className="card mb-6 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <div className="text-ink/60">{children}</div>
      </div>
    </div>
  )
}

function AdminGuide() {
  return (
    <>
      <Step number="1" icon="🎒" title="Crea tus clases" color="grass">
        Ve a <strong>Clases</strong> → <em>+ Nueva clase</em>. Ponle nombre y el rango de edad (ej. "Exploradores", 3 a 5 años).
        Puedes crear todas las que necesite tu escuelita.
      </Step>
      <Step number="2" icon="🍎" title="Agrega a tus docentes" color="sunshine">
        Ve a <strong>Docentes</strong> → <em>+ Agregar</em>. Escribe su nombre y cédula — te va a mostrar la contraseña que le
        toca, para que se la des tú directamente (por WhatsApp, en persona, como prefieras).
      </Step>
      <Step number="3" icon="🔗" title="Asigna cada docente a su clase" color="sky">
        En <strong>Clases</strong>, edita una clase y marca qué docente(s) la llevan. Así ella solo verá su propia clase.
      </Step>
      <Step number="4" icon="🧒" title="Registra a los niños" color="coral">
        Ve a <strong>Niños</strong> → <em>+ Nuevo niño/a</em>. Escribe su nombre, fecha de nacimiento, clase y alergias si
        tiene. Desde aquí también puedes desactivar a un niño si ya no asiste, sin borrar su historial.
      </Step>
      <Step number="5" icon="👪" title="Vincula a los padres" color="grape">
        En la tarjeta de cada niño, botón <em>+ Padre</em>. Si es alguien nuevo, crea su cuenta con su cédula. Si ya tiene
        cuenta (por ejemplo, es docente y también es su papá/mamá), usa "Ya tiene cuenta" para vincularlo sin duplicar.
      </Step>
      <Step number="6" icon="✅" title="Supervisa la asistencia" color="grass">
        En <strong>Asistencia</strong> puedes ver, por fecha y por clase, quién vino cada domingo.
      </Step>
      <Step number="7" icon="🙏" title="Publica devocionales para niños" color="sunshine">
        En <strong>Devocionales</strong> puedes escribir reflexiones cortas pensadas para niños, con su versículo.
      </Step>
    </>
  )
}

function DocenteGuide() {
  return (
    <>
      <Step number="1" icon="🏠" title="Revisa tus clases" color="sky">
        En el inicio ves las clases que el admin te asignó, con cuántos niños activos tiene cada una.
      </Step>
      <Step number="2" icon="✅" title="Toma la asistencia" color="grass">
        Ve a <strong>Asistencia</strong>, elige la clase y la fecha. Toca a cada niño para marcarlo presente — se pone
        verde. Al final, toca <em>Guardar asistencia</em>.
      </Step>
      <Step number="3" icon="🎨" title="Publica una actividad" color="sunshine">
        Ve a <strong>Actividades</strong> → <em>+ Nueva actividad</em>. Puedes subir varias fotos a la vez.
      </Step>
      <Step number="4" icon="📅" title="Agenda un evento" color="grape">
        Ve a <strong>Agenda</strong> → <em>+ Nuevo evento</em> para avisar de un paseo o actividad especial próxima.
      </Step>
      <Step number="5" icon="🌱" title="Registra el progreso de cada niño" color="coral">
        Ve a <strong>Progreso</strong>, elige un niño y anota cómo se comportó, cómo se sintió y qué logró ese día. Ahí
        mismo puedes darle una <strong>estrella ⭐</strong> como reconocimiento por algo que hizo bien. Cada niño va
        desbloqueando insignias a medida que junta estrellas (🐣 → 🦊 → 🦁 → 🦋 → 🌟 → 👑), y tanto tú como sus padres
        pueden ver su insignia actual y cuánto le falta para la siguiente.
      </Step>
      <Step number="6" icon="🙏" title="Publica un devocional" color="sunshine">
        Ve a <strong>Devocionales</strong> → <em>+ Nuevo devocional</em>.
      </Step>
      <Step number="7" icon="👪" title="¿Tienes un hijo/a en la escuelita?" color="grape">
        Pídele al admin que te vincule también como padre/madre de tu hijo/a (opción "Ya tiene cuenta") — así, con la misma
        cuenta, puedes cambiar entre tu vista de docente y ver el progreso de tu hijo/a.
      </Step>
    </>
  )
}

function PadreGuide() {
  return (
    <>
      <Step number="1" icon="🔑" title="Recibe tus datos de acceso" color="sky">
        El admin te da tu cédula y una contraseña (tu cédula seguida de un punto). Puedes cambiarla luego desde el botón
        "Contraseña" del menú.
      </Step>
      <Step number="2" icon="🏠" title="Mira la información de tu hijo/a" color="grass">
        En el inicio ves su nombre, edad, clase y alergias registradas. Si tienes varios hijos, puedes cambiar entre ellos.
      </Step>
      <Step number="3" icon="🎨" title="Reacciona a sus actividades" color="coral">
        En <strong>Actividades</strong> ves fotos y lo que hicieron en clase. Toca un emoji (❤️ 👏 🙌 😍) para reaccionar.
      </Step>
      <Step number="4" icon="📅" title="Entérate de los próximos eventos" color="grape">
        En <strong>Agenda</strong> ves paseos, presentaciones y fechas importantes de la clase de tu hijo/a.
      </Step>
      <Step number="5" icon="🌱" title="Mira su progreso" color="coral">
        En <strong>Progreso</strong> ves cómo se comportó, cómo se sintió y qué logró tu hijo/a en cada clase. También
        aparece su <strong>insignia actual</strong> (🐣 → 🦊 → 🦁 → 🦋 → 🌟 → 👑) y sus <strong>estrellas ⭐</strong>: la
        docente se las va dando como reconocimiento, y ahí puedes ver cuántas lleva y qué le falta para la siguiente
        insignia.
      </Step>
      <Step number="6" icon="🙏" title="Lean juntos un devocional" color="sunshine">
        En <strong>Devocionales</strong> hay reflexiones cortas pensadas para niños que pueden leer juntos en casa.
      </Step>
      <Step number="7" icon="📖" title="No te pierdas el versículo del día" color="sky">
        En el inicio, arriba, aparece un versículo distinto cada día.
      </Step>
    </>
  )
}

const GUIDES = {
  admin: { title: 'Guía para Administrador', Guide: AdminGuide },
  coordinador: { title: 'Guía para Coordinador', Guide: AdminGuide },
  docente: { title: 'Guía para Docente', Guide: DocenteGuide },
  padre: { title: 'Guía para Padres', Guide: PadreGuide },
}

const ROLES = [
  {
    icon: '👑',
    nombre: 'Admin',
    color: 'grape',
    texto:
      'Es quien dirige toda la escuelita. Ve y gestiona absolutamente todo: crea clases, agrega docentes y coordinadores, registra niños, vincula padres, supervisa la asistencia de todas las clases y publica devocionales. Es el único rol que puede activar o desactivar cuentas del equipo.',
  },
  {
    icon: '🗂️',
    nombre: 'Coordinador',
    color: 'sunshine',
    texto:
      'Ayuda al admin en el día a día: puede crear/editar clases, registrar niños, agregar docentes y padres, y ver la asistencia general — igual que el admin, pero no puede agregar otros administradores ni coordinadores.',
  },
  {
    icon: '🍎',
    nombre: 'Docente',
    color: 'sky',
    texto:
      'Es la "miss" o "profe" de una o varias clases. Solo ve y trabaja con sus propias clases asignadas: toma asistencia, publica actividades con fotos, registra el progreso de cada niño/a, y agenda eventos. Si además es mamá/papá de un niño de la escuelita, puede vincularse también como padre/madre y cambiar entre ambas vistas.',
  },
  {
    icon: '👪',
    nombre: 'Padre / Madre',
    color: 'coral',
    texto:
      'Ve únicamente la información de su(s) propio(s) hijo/a(s): su ficha, asistencia, actividades (con opción de reaccionar), progreso y agenda de su clase. Si tiene más de un hijo/a en la escuelita, puede cambiar de vista entre cada uno.',
  },
  {
    icon: '🧒',
    nombre: 'Niño / Niña',
    color: 'grass',
    texto:
      'Los niños no tienen cuenta propia ni inician sesión — son quienes reciben todo el cuidado del sistema. Su información (asistencia, actividades, progreso) la ven y gestionan su docente y sus padres/encargados vinculados, siempre de forma privada y segura.',
  },
]

function RolesTab({ role }) {
  const badge = {
    sky: 'bg-sky-100 text-sky-700',
    grass: 'bg-grass-100 text-grass-700',
    sunshine: 'bg-sunshine-100 text-sunshine-700',
    coral: 'bg-coral-100 text-coral-700',
    grape: 'bg-grape-100 text-grape-700',
  }

  const roles = role === 'padre' ? ROLES.filter((r) => !['Admin', 'Coordinador'].includes(r.nombre)) : ROLES

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {roles.map((r) => (
        <div key={r.nombre} className="card">
          <div className="flex items-center gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl ${badge[r.color]}`}>{r.icon}</span>
            <h3 className="text-lg font-bold">{r.nombre}</h3>
          </div>
          <p className="mt-2 text-ink/60">{r.texto}</p>
        </div>
      ))}
    </div>
  )
}

export default function Tutorial() {
  const { profile } = useAuth()
  const { title, Guide } = GUIDES[profile.role] || GUIDES.padre
  const [tab, setTab] = useState('guia')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Ayuda 🎓</h1>
        <p className="text-ink/50">{title}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('guia')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'guia' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          Guía paso a paso
        </button>
        <button
          onClick={() => setTab('roles')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'roles' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          ¿Qué hace cada rol?
        </button>
      </div>

      {tab === 'guia' ? (
        <>
          <div className="max-w-2xl">
            <Guide />
          </div>
          <div className="card max-w-2xl bg-sky-50">
            <p className="font-bold">¿Tienes dudas?</p>
            <p className="text-ink/60">Pídele ayuda al administrador de tu escuelita, o vuelve a esta página cuando la necesites.</p>
          </div>
        </>
      ) : (
        <RolesTab role={profile.role} />
      )}
    </div>
  )
}
