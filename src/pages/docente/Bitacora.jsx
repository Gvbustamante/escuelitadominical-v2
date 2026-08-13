import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useMisClases } from '../../lib/useMisClases'
import Spinner from '../../components/Spinner'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

const MOMENTOS = [
  { value: 'antes', label: '🚪 Antes de clase', pregunta: '¿Cómo encontraste el salón?' },
  { value: 'despues', label: '🏁 Después de clase', pregunta: '¿Cómo entregas el salón?' },
]

export default function Bitacora() {
  const { user } = useAuth()
  const { clases, nivelId, setNivelId } = useMisClases()
  const [fecha, setFecha] = useState(hoyISO())
  const [registros, setRegistros] = useState({ antes: null, despues: null })
  const [momento, setMomento] = useState('antes')

  const loadAmbos = useCallback(async () => {
    if (!nivelId) return
    const { data } = await supabase.from('bitacora_clase').select('*').eq('nivel_id', nivelId).eq('fecha', fecha)
    const antes = (data || []).find((r) => r.momento === 'antes') || null
    const despues = (data || []).find((r) => r.momento === 'despues') || null
    setRegistros({ antes, despues })
    setMomento(!antes ? 'antes' : 'despues')
  }, [nivelId, fecha])

  useEffect(() => {
    loadAmbos()
  }, [loadAmbos])

  if (!clases) return <Spinner />
  if (clases.length === 0) return <p className="card text-ink/50">No tienes clases asignadas todavía.</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Bitácora 📋</h1>
        <p className="text-ink/50">Deja constancia del salón antes y después de cada clase</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select className="input max-w-xs" value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
          {clases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <input type="date" className="input max-w-xs" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>

      <div className="flex gap-2">
        {MOMENTOS.map((m) => {
          const hecha = !!registros[m.value]
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => setMomento(m.value)}
              className={`flex-1 rounded-chunky border-2 px-3 py-3 text-left transition-colors ${
                momento === m.value ? 'border-sky-400 bg-sky-50' : 'border-ink/10 bg-white'
              }`}
            >
              <p className="text-sm font-bold sm:text-base">{m.label}</p>
              <span className={`badge mt-1 ${hecha ? 'bg-grass-100 text-grass-700' : 'bg-sunshine-100 text-sunshine-700'}`}>
                {hecha ? '✅ Hecha' : '⏳ Falta'}
              </span>
            </button>
          )
        })}
      </div>

      <BitacoraForm
        key={`${nivelId}-${fecha}-${momento}`}
        nivelId={nivelId}
        fecha={fecha}
        momento={momento}
        registro={registros[momento]}
        docenteId={user.id}
        onSaved={loadAmbos}
      />
    </div>
  )
}

function BitacoraForm({ nivelId, fecha, momento, registro, docenteId, onSaved }) {
  const meta = MOMENTOS.find((m) => m.value === momento)
  const esDespues = momento === 'despues'

  const [salonOk, setSalonOk] = useState(registro?.salon_ok ?? true)
  const [salonFoto, setSalonFoto] = useState(null)
  const [salonPreview, setSalonPreview] = useState(null)
  const [refrigerioDetalle, setRefrigerioDetalle] = useState(registro?.refrigerio_detalle || '')
  const [refrigerioFoto, setRefrigerioFoto] = useState(null)
  const [refrigerioPreview, setRefrigerioPreview] = useState(null)
  const [notas, setNotas] = useState(registro?.notas || '')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  async function subirFoto(file, tipo) {
    const path = `bitacora/${nivelId}/${fecha}-${momento}-${tipo}-${Date.now()}-${file.name}`
    const { error: upError } = await supabase.storage.from('actividades').upload(path, file)
    if (upError) return null
    return supabase.storage.from('actividades').getPublicUrl(path).data.publicUrl
  }

  async function guardar(e) {
    e.preventDefault()
    setBusy(true)
    setOk('')
    setError('')

    let salon_foto_url = registro?.salon_foto_url || null
    if (salonFoto) {
      const url = await subirFoto(salonFoto, 'salon')
      if (url) salon_foto_url = url
    }
    let refrigerio_foto_url = registro?.refrigerio_foto_url || null
    if (esDespues && refrigerioFoto) {
      const url = await subirFoto(refrigerioFoto, 'refrigerio')
      if (url) refrigerio_foto_url = url
    }

    const payload = {
      nivel_id: nivelId,
      fecha,
      momento,
      docente_id: docenteId,
      salon_ok: salonOk,
      salon_foto_url,
      refrigerio_detalle: esDespues ? refrigerioDetalle || null : null,
      refrigerio_foto_url: esDespues ? refrigerio_foto_url : null,
      notas: notas || null,
      updated_at: new Date().toISOString(),
    }
    const { error: saveError } = await supabase.from('bitacora_clase').upsert(payload, { onConflict: 'nivel_id,fecha,momento' })
    setBusy(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setOk('¡Guardado!')
    onSaved()
  }

  return (
    <form onSubmit={guardar} className="card flex flex-col gap-5">
      <div>
        <label className="label">{meta.pregunta}</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSalonOk(true)}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm ${salonOk ? 'bg-grass-400 text-white' : 'bg-ink/5'}`}
          >
            ✅ En buen estado
          </button>
          <button
            type="button"
            onClick={() => setSalonOk(false)}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm ${!salonOk ? 'bg-coral-400 text-white' : 'bg-ink/5'}`}
          >
            ⚠️ Hubo daños
          </button>
        </div>
        <input
          type="file"
          accept="image/*"
          className="input mt-2"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            setSalonFoto(f)
            setSalonPreview(URL.createObjectURL(f))
          }}
        />
        {(salonPreview || registro?.salon_foto_url) && (
          <img src={salonPreview || registro.salon_foto_url} alt="Foto del salón" className="mt-2 h-32 w-full rounded-2xl object-cover" />
        )}
      </div>

      {esDespues && (
        <div>
          <label className="label">Refrigerio dado</label>
          <input
            className="input"
            placeholder="Ej. Galletas y jugo"
            value={refrigerioDetalle}
            onChange={(e) => setRefrigerioDetalle(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="input mt-2"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setRefrigerioFoto(f)
              setRefrigerioPreview(URL.createObjectURL(f))
            }}
          />
          {(refrigerioPreview || registro?.refrigerio_foto_url) && (
            <img
              src={refrigerioPreview || registro.refrigerio_foto_url}
              alt="Foto del refrigerio"
              className="mt-2 h-32 w-full rounded-2xl object-cover"
            />
          )}
        </div>
      )}

      <div>
        <label className="label">Descripción / notas (opcional)</label>
        <textarea
          className="input"
          rows={3}
          placeholder={
            esDespues
              ? 'Ej. Quedó todo recogido, se barrió y se acomodaron las sillas...'
              : 'Ej. Encontramos las mesas desordenadas, faltaba jabón en el baño...'
          }
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>

      {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
      {ok && <p className="rounded-xl bg-grass-50 px-3 py-2 text-sm font-bold text-grass-600">{ok}</p>}
      <button disabled={busy} className="btn-primary justify-center">
        {busy ? 'Guardando...' : `Guardar — ${meta.label}`}
      </button>
    </form>
  )
}
