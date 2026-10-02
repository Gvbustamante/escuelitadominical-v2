import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { cargarExcepciones, useExcepciones } from '../lib/diasNivel'
import { hoyLocal, fechaLarga } from '../lib/fechas'
import FechaCampo from './ui/FechaCampo'
import ActionMenu from './ui/ActionMenu'

/** Días puntuales sin clase (feriado, retiro…): para toda la escuelita o un nivel. */
export default function ExcepcionesClase() {
  const excepciones = useExcepciones()
  const [niveles, setNiveles] = useState([])
  const [form, setForm] = useState({ fecha: '', nivel_id: '', motivo: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [verPasadas, setVerPasadas] = useState(false)
  const hoy = hoyLocal()

  useEffect(() => {
    supabase.from('niveles').select('id, nombre').eq('activo', true).order('orden').then(({ data }) => setNiveles(data || []))
  }, [])

  async function agregar(e) {
    e.preventDefault()
    if (!form.fecha) return setError('Elige la fecha.')
    setBusy(true)
    setError('')
    const { error: insError } = await supabase.from('excepciones_clase').insert({
      fecha: form.fecha,
      nivel_id: form.nivel_id || null,
      motivo: form.motivo.trim() || null,
    })
    setBusy(false)
    if (insError) {
      if (/duplicate|unique/i.test(insError.message)) return setError('Ese día ya está marcado sin clase para ese nivel.')
      if (/does not exist|relation|schema cache/i.test(insError.message)) return setError('Falta activar esta función en la base de datos. Avísale a quien administra la plataforma.')
      return setError('No se pudo guardar: ' + insError.message)
    }
    setForm({ fecha: '', nivel_id: form.nivel_id, motivo: '' })
    cargarExcepciones(true)
  }

  async function quitar(id) {
    await supabase.from('excepciones_clase').delete().eq('id', id)
    cargarExcepciones(true)
  }

  const proximas = excepciones.filter((x) => x.fecha >= hoy)
  const pasadas = excepciones.filter((x) => x.fecha < hoy).reverse()

  const Fila = ({ x }) => (
    <li className={`flex items-center gap-3 rounded-xl bg-ink/[0.03] px-3 py-2 ${x.fecha < hoy ? 'opacity-60' : ''}`}>
      <span className="text-lg" aria-hidden="true">🚫</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{fechaLarga(x.fecha)}</span>
        <span className="block truncate text-xs text-ink/70">
          {x.nivel?.nombre || 'Toda la escuelita'}{x.motivo ? ` · ${x.motivo}` : ''}
        </span>
      </span>
      <ActionMenu label={`Acciones del ${x.fecha}`} acciones={[{ label: 'Quitar (sí hay clase)', icon: '🗑️', onClick: () => quitar(x.id), peligro: true }]} />
    </li>
  )

  return (
    <div className="card max-w-xl">
      <p className="label mb-1">Días sin clase (excepciones)</p>
      <p className="mb-4 text-sm text-ink/70">
        Para un día puntual: feriado, retiro, evento. Ese día el nivel no aparece en Inicio, Asistencia ni Planeación, y no cuenta en los reportes.
      </p>

      <form onSubmit={agregar} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Fecha</label>
            <FechaCampo value={form.fecha} onChange={(v) => setForm({ ...form, fecha: v })} required />
          </div>
          <div>
            <label className="label" htmlFor="exc-nivel">¿Para quién?</label>
            <select id="exc-nivel" className="input" value={form.nivel_id} onChange={(e) => setForm({ ...form, nivel_id: e.target.value })}>
              <option value="">🏫 Toda la escuelita</option>
              {niveles.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="exc-motivo">Motivo (opcional)</label>
          <input id="exc-motivo" className="input" maxLength={80} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Ej. Retiro, Navidad, feriado" />
        </div>
        {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-700">{error}</p>}
        <button type="submit" disabled={busy} className="btn-secondary self-start">{busy ? 'Guardando…' : '+ Marcar día sin clase'}</button>
      </form>

      <ul className="mt-4 flex flex-col gap-2">
        {proximas.length === 0 && <li className="text-sm text-ink/65">No hay días sin clase próximos.</li>}
        {proximas.map((x) => <Fila key={x.id} x={x} />)}
      </ul>
      {pasadas.length > 0 && (
        <>
          <button type="button" onClick={() => setVerPasadas((v) => !v)} aria-expanded={verPasadas} className="mt-3 text-sm font-bold text-ink/70 hover:underline">
            {verPasadas ? 'Ocultar pasadas ▲' : `Ver pasadas (${pasadas.length}) ▼`}
          </button>
          {verPasadas && <ul className="mt-2 flex flex-col gap-2">{pasadas.map((x) => <Fila key={x.id} x={x} />)}</ul>}
        </>
      )}
    </div>
  )
}
