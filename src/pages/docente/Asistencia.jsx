import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useMisClases } from '../../lib/useMisClases'
import Spinner from '../../components/Spinner'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Asistencia() {
  const { user } = useAuth()
  const { clases, nivelId, setNivelId } = useMisClases()
  const [fecha, setFecha] = useState(hoyISO())
  const [ninos, setNinos] = useState(null)
  const [marcados, setMarcados] = useState({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  const load = useCallback(async () => {
    if (!nivelId) return
    const { data: n } = await supabase.from('ninos').select('*').eq('nivel_id', nivelId).eq('activo', true).order('nombre_completo')
    const { data: a } = await supabase.from('asistencia').select('*').eq('nivel_id', nivelId).eq('fecha', fecha)
    setNinos(n || [])
    const map = {}
    ;(a || []).forEach((row) => (map[row.nino_id] = row.presente))
    setMarcados(map)
  }, [nivelId, fecha])

  useEffect(() => {
    load()
  }, [load])

  function toggle(ninoId) {
    setMarcados((prev) => ({ ...prev, [ninoId]: !prev[ninoId] }))
  }

  async function guardar() {
    setSaving(true)
    const rows = ninos.map((n) => ({
      nino_id: n.id,
      nivel_id: nivelId,
      fecha,
      presente: !!marcados[n.id],
      tomada_por: user.id,
    }))
    await supabase.from('asistencia').upsert(rows, { onConflict: 'nino_id,fecha' })
    setSaving(false)
    setSavedAt(new Date())
  }

  if (!clases) return <Spinner />
  if (clases.length === 0) return <p className="card text-ink/50">No tienes clases asignadas todavía.</p>

  const presentes = Object.values(marcados).filter(Boolean).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Asistencia ✅</h1>
        <p className="text-ink/50">Toca a cada niño/a para marcar presente</p>
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

      {!ninos ? (
        <Spinner />
      ) : ninos.length === 0 ? (
        <p className="card text-ink/50">No hay niños activos en esta clase.</p>
      ) : (
        <>
          <p className="font-bold text-ink/60">{presentes} de {ninos.length} presentes</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ninos.map((n) => {
              const presente = !!marcados[n.id]
              return (
                <button
                  key={n.id}
                  onClick={() => toggle(n.id)}
                  className={`flex flex-col items-center gap-2 rounded-blob p-4 text-center shadow-pop transition-transform active:translate-y-1 active:shadow-none ${
                    presente ? 'bg-grass-400 text-white' : 'bg-white text-ink'
                  }`}
                >
                  <span className="text-4xl">{presente ? '✅' : '🧒'}</span>
                  <span className="font-bold leading-tight">{n.nombre_completo}</span>
                </button>
              )
            })}
          </div>

          <div className="sticky bottom-4 flex justify-center">
            <button onClick={guardar} disabled={saving} className="btn-success shadow-soft">
              {saving ? 'Guardando...' : '💾 Guardar asistencia'}
            </button>
          </div>
          {savedAt && <p className="text-center text-sm font-bold text-grass-600">Guardado ✔️</p>}
        </>
      )}
    </div>
  )
}
