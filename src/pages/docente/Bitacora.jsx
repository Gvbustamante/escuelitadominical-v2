import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useMisClases } from '../../lib/useMisClases'
import Spinner from '../../components/Spinner'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Bitacora() {
  const { user } = useAuth()
  const { clases, nivelId, setNivelId } = useMisClases()
  const [fecha, setFecha] = useState(hoyISO())
  const [registro, setRegistro] = useState(null)
  const [salonOk, setSalonOk] = useState(true)
  const [salonFoto, setSalonFoto] = useState(null)
  const [salonPreview, setSalonPreview] = useState(null)
  const [refrigerioDetalle, setRefrigerioDetalle] = useState('')
  const [refrigerioFoto, setRefrigerioFoto] = useState(null)
  const [refrigerioPreview, setRefrigerioPreview] = useState(null)
  const [notas, setNotas] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!nivelId) return
    const { data } = await supabase
      .from('bitacora_clase')
      .select('*')
      .eq('nivel_id', nivelId)
      .eq('fecha', fecha)
      .maybeSingle()
    setRegistro(data)
    setSalonOk(data?.salon_ok ?? true)
    setRefrigerioDetalle(data?.refrigerio_detalle || '')
    setNotas(data?.notas || '')
    setSalonFoto(null)
    setSalonPreview(null)
    setRefrigerioFoto(null)
    setRefrigerioPreview(null)
    setOk('')
  }, [nivelId, fecha])

  useEffect(() => {
    load()
  }, [load])

  async function subirFoto(file, tipo) {
    const path = `bitacora/${nivelId}/${fecha}-${tipo}-${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('actividades').upload(path, file)
    if (error) return null
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
    if (refrigerioFoto) {
      const url = await subirFoto(refrigerioFoto, 'refrigerio')
      if (url) refrigerio_foto_url = url
    }

    const payload = {
      nivel_id: nivelId,
      fecha,
      docente_id: user.id,
      salon_ok: salonOk,
      salon_foto_url,
      refrigerio_detalle: refrigerioDetalle || null,
      refrigerio_foto_url,
      notas: notas || null,
      updated_at: new Date().toISOString(),
    }
    const { error: saveError } = await supabase.from('bitacora_clase').upsert(payload, { onConflict: 'nivel_id,fecha' })
    setBusy(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setOk('¡Guardado!')
    load()
  }

  if (!clases) return <Spinner />
  if (clases.length === 0) return <p className="card text-ink/50">No tienes clases asignadas todavía.</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Bitácora 📋</h1>
        <p className="text-ink/50">Deja constancia del salón y el refrigerio de hoy</p>
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

      <form onSubmit={guardar} className="card flex flex-col gap-5">
        <div>
          <label className="label">Salón</label>
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

        <div>
          <label className="label">Notas (opcional)</label>
          <textarea className="input" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>

        {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
        {ok && <p className="rounded-xl bg-grass-50 px-3 py-2 text-sm font-bold text-grass-600">{ok}</p>}
        <button disabled={busy} className="btn-primary justify-center">
          {busy ? 'Guardando...' : 'Guardar bitácora'}
        </button>
      </form>
    </div>
  )
}
