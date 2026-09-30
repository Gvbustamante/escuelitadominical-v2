import { useState } from 'react'
import { hoyLocal, fechaLarga } from '../lib/fechas'
import ActionMenu from './ui/ActionMenu'
import Emo from './ui/Emo'

/**
 * Lista de la Agenda: próximos eventos (o los del día elegido en el calendario).
 * Los pasados quedan detrás de "Ver pasados". onEliminar(id) opcional (equipo).
 */
export default function ListaEventos({ eventos, selectedDay, onClearDay, onEliminar, mostrarNivel = true, className = '' }) {
  const [verPasados, setVerPasados] = useState(false)
  const hoy = hoyLocal()
  const todos = [...(eventos || [])].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const pasados = todos.filter((e) => e.fecha < hoy).reverse()
  const lista = selectedDay ? todos.filter((e) => e.fecha === selectedDay) : todos.filter((e) => e.fecha >= hoy)

  return (
    <section className={`flex flex-col gap-3 ${className}`} aria-labelledby="lista-eventos">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="lista-eventos" className="flex items-center gap-2 text-lg font-bold">
          <Emo e="📅" className="text-grape-700" />
          {selectedDay ? fechaLarga(selectedDay) : 'Próximos eventos'}
        </h2>
        {selectedDay && (
          <button type="button" onClick={onClearDay} className="text-sm font-bold text-sky-700 hover:underline">
            Ver todos los próximos
          </button>
        )}
      </div>

      {lista.length === 0 && (
        <p className="card text-ink/70">{selectedDay ? 'No hay eventos este día.' : 'No hay eventos próximos.'}</p>
      )}
      {lista.map((ev) => <Evento key={ev.id} ev={ev} mostrarNivel={mostrarNivel} onEliminar={onEliminar} />)}

      {!selectedDay && pasados.length > 0 && (
        <>
          <button type="button" onClick={() => setVerPasados((v) => !v)} aria-expanded={verPasados} className="self-start text-sm font-bold text-ink/70 hover:underline">
            {verPasados ? 'Ocultar pasados ▲' : `Ver pasados (${pasados.length}) ▼`}
          </button>
          {verPasados && pasados.map((ev) => <Evento key={ev.id} ev={ev} pasado mostrarNivel={mostrarNivel} onEliminar={onEliminar} />)}
        </>
      )}
    </section>
  )
}

function Evento({ ev, pasado, mostrarNivel, onEliminar }) {
  const d = new Date(ev.fecha + 'T12:00:00')
  return (
    <article className={`card flex items-center gap-3 !p-3 sm:!p-4 ${pasado ? 'opacity-60' : ''}`}>
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-grape-50 text-grape-800" aria-hidden="true">
        <span className="text-xs font-bold uppercase">{d.toLocaleDateString('es', { month: 'short' }).replace('.', '')}</span>
        <span className="text-xl font-extrabold leading-none">{d.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{ev.titulo}</p>
        <p className="text-sm text-ink/70">
          {fechaLarga(ev.fecha)}
          {mostrarNivel && <span className="font-bold text-sky-800"> · {ev.nivel?.nombre || 'Toda la escuelita'}</span>}
        </p>
        {ev.descripcion && <p className="mt-1 text-sm text-ink/75">{ev.descripcion}</p>}
      </div>
      {onEliminar && (
        <ActionMenu label={`Acciones de ${ev.titulo}`} acciones={[{ label: 'Eliminar evento', icon: '🗑️', onClick: () => onEliminar(ev.id), peligro: true }]} />
      )}
    </article>
  )
}
