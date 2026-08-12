import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Skeleton from '../../components/Skeleton'
import { exportCSV } from '../../lib/exportCsv'

function hoyYYYYMM() {
  return new Date().toISOString().slice(0, 7)
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
    exportCSV('bitacora', ['Fecha', 'Docente', 'Salón', 'Refrigerio', 'Notas'], filas)
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
        <button className="btn-secondary" onClick={exportar} disabled={!registros || registros.length === 0}>
          📊 Exportar
        </button>
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
    </div>
  )
}
