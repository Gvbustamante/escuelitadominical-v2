import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Skeleton from '../../components/Skeleton'
import Modal from '../../components/Modal'
import { exportExcel } from '../../lib/exportExcel'

function hoyYYYYMM() {
  return new Date().toISOString().slice(0, 7)
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function diasEnMes(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export default function BitacoraAdmin() {
  const [niveles, setNiveles] = useState(null)
  const [nivelId, setNivelId] = useState('')
  const [mes, setMes] = useState(hoyYYYYMM())
  const [registros, setRegistros] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    supabase
      .from('niveles')
      .select('*')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => {
        setNiveles(data || [])
        setNivelId((data || [])[0]?.id || '')
      })
  }, [])

  const load = useCallback(async () => {
    if (!nivelId) return
    setRegistros(null)
    const inicio = `${mes}-01`
    const fin = `${mes}-${String(diasEnMes(mes)).padStart(2, '0')}`
    const { data } = await supabase
      .from('bitacora_clase')
      .select('*, docente:profiles(nombre_completo)')
      .eq('nivel_id', nivelId)
      .gte('fecha', inicio)
      .lte('fecha', fin)
      .order('fecha', { ascending: false })
    setRegistros(data || [])
  }, [nivelId, mes])

  useEffect(() => {
    load()
  }, [load])

  function exportar() {
    const filas = (registros || []).map((r) => [
      r.fecha,
      r.docente?.nombre_completo || '',
      r.salon_ok ? 'En buen estado' : 'Hubo daños',
      r.refrigerio_detalle || '',
      r.notas || '',
    ])
    exportExcel('bitacora', ['Fecha', 'Docente', 'Salón', 'Refrigerio', 'Notas'], filas)
  }

  if (!niveles) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (niveles.length === 0) return <p className="card text-ink/50">Todavía no hay clases creadas.</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Bitácora 📋</h1>
          <p className="text-ink/50">Constancia de salón y refrigerio por clase</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            📝 Registrar bitácora
          </button>
          <button className="btn-secondary" onClick={exportar} disabled={!registros || registros.length === 0}>
            📊 Exportar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select className="input max-w-xs" value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
          {niveles.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nombre}
            </option>
          ))}
        </select>
        <input type="month" className="input max-w-xs" value={mes} onChange={(e) => setMes(e.target.value)} />
      </div>

      {!registros ? (
        <Skeleton className="h-64 w-full" />
      ) : registros.length === 0 ? (
        <p className="card text-ink/50">Sin registros este mes para esta clase.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {registros.map((r) => (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{r.fecha}</p>
                <span className={`badge ${r.salon_ok ? 'bg-grass-100 text-grass-700' : 'bg-coral-100 text-coral-700'}`}>
                  {r.salon_ok ? '✅ Salón en buen estado' : '⚠️ Hubo daños'}
                </span>
              </div>
              <p className="text-sm text-ink/50">Registrado por {r.docente?.nombre_completo || '—'}</p>
              {r.refrigerio_detalle && <p className="mt-2 text-sm text-ink/70">🥤 Refrigerio: {r.refrigerio_detalle}</p>}
              {r.notas && <p className="mt-1 text-sm text-ink/60">{r.notas}</p>}
              <div className="mt-3 grid grid-cols-2 gap-3">
                {r.salon_foto_url && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase text-ink/40">Salón</p>
                    <img src={r.salon_foto_url} alt="Foto del salón" className="h-32 w-full rounded-2xl object-cover" />
                  </div>
                )}
                {r.refrigerio_foto_url && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase text-ink/40">Refrigerio</p>
                    <img src={r.refrigerio_foto_url} alt="Foto del refrigerio" className="h-32 w-full rounded-2xl object-cover" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar bitácora">
        <RegistrarBitacoraForm
          niveles={niveles}
          nivelIdInicial={nivelId}
          onSaved={() => {
            setModalOpen(false)
            load()
          }}
        />
      </Modal>
    </div>
  )
}

function RegistrarBitacoraForm({ niveles, nivelIdInicial, onSaved }) {
  const { user } = useAuth()
  const [nivelId, setNivelId] = useState(nivelIdInicial || niveles[0]?.id || '')
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
  }, [nivelId, fecha])

  useEffect(() => {
    load()
  }, [load])

  async function subirFoto(file, tipo) {
    const path = `bitacora/${nivelId}/${fecha}-${tipo}-${Date.now()}-${file.name}`
    const { error: upError } = await supabase.storage.from('actividades').upload(path, file)
    if (upError) return null
    return supabase.storage.from('actividades').getPublicUrl(path).data.publicUrl
  }

  async function guardar(e) {
    e.preventDefault()
    setBusy(true)
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
    onSaved()
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1">
          <label className="label">Clase</label>
          <select className="input" value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
            {niveles.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Fecha</label>
          <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>
      {registro && <p className="text-xs font-bold text-sunshine-700">Ya hay una bitácora para esta clase y fecha — se va a actualizar.</p>}

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
      <button disabled={busy} className="btn-primary justify-center">
        {busy ? 'Guardando...' : 'Guardar bitácora'}
      </button>
    </form>
  )
}
