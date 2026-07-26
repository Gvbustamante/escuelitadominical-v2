import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useMisClases } from '../../lib/useMisClases'
import Spinner from '../../components/Spinner'
import RewardBurst from '../../components/RewardBurst'
import ResumenAsistenciaMensual from '../../components/ResumenAsistenciaMensual'
import ProgresoNinoModal from '../../components/ProgresoNinoModal'
import AlertasAusencia from '../../components/AlertasAusencia'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

const MENSAJES_COMPLETO = ['¡Asistencia completa! 🎉', '¡Todos presentes hoy! 🙌', '¡Qué domingo tan lleno! 🌟']

export default function Asistencia() {
  const { user } = useAuth()
  const { clases, nivelId, setNivelId } = useMisClases()
  const [fecha, setFecha] = useState(hoyISO())
  const [ninos, setNinos] = useState(null)
  const [marcados, setMarcados] = useState({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [tab, setTab] = useState('hoy')
  const [toast, setToast] = useState(null)
  const [progresoNino, setProgresoNino] = useState(null)
  const celebradoRef = useRef(false)

  const load = useCallback(async () => {
    if (!nivelId) return
    const { data: n } = await supabase.from('ninos').select('*').eq('nivel_id', nivelId).eq('activo', true).order('nombre_completo')
    const { data: a } = await supabase.from('asistencia').select('*').eq('nivel_id', nivelId).eq('fecha', fecha)
    setNinos(n || [])
    const map = {}
    ;(a || []).forEach((row) => (map[row.nino_id] = row.presente))
    setMarcados(map)
    celebradoRef.current = false
  }, [nivelId, fecha])

  useEffect(() => {
    load()
  }, [load])

  function toggle(ninoId) {
    setMarcados((prev) => {
      const next = { ...prev, [ninoId]: !prev[ninoId] }
      const todosPresentes = ninos.length > 0 && ninos.every((n) => next[n.id])
      if (todosPresentes && !celebradoRef.current) {
        celebradoRef.current = true
        const msg = MENSAJES_COMPLETO[Math.floor(Math.random() * MENSAJES_COMPLETO.length)]
        setToast({ key: Date.now(), message: msg })
      }
      return next
    })
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
      <RewardBurst toast={toast} />

      <div>
        <h1 className="text-3xl font-bold">Asistencia ✅</h1>
        <p className="text-ink/50">Toca a cada niño/a para marcar presente</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('hoy')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'hoy' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          Marcar hoy
        </button>
        <button
          onClick={() => setTab('mes')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'mes' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          Resumen del mes
        </button>
        <button
          onClick={() => setTab('ausencias')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'ausencias' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          Ausencias
        </button>
      </div>

      <select className="input max-w-xs" value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
        {clases.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>

      {tab === 'mes' ? (
        <ResumenAsistenciaMensual nivelId={nivelId} ninos={ninos} />
      ) : tab === 'ausencias' ? (
        <AlertasAusencia nivelId={nivelId} ninos={ninos} />
      ) : (
        <>
          <input type="date" className="input max-w-xs" value={fecha} onChange={(e) => setFecha(e.target.value)} />

          {!ninos ? (
            <Spinner />
          ) : ninos.length === 0 ? (
            <p className="card text-ink/50">No hay niños activos en esta clase.</p>
          ) : (
            <>
              <p className="font-bold text-ink/60">
                {presentes} de {ninos.length} presentes
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {ninos.map((n, i) => {
                  const presente = !!marcados[n.id]
                  return (
                    <div key={n.id} className="animate-pop-in relative" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                      <button
                        onClick={() => toggle(n.id)}
                        className={`flex w-full flex-col items-center gap-2 rounded-blob p-4 text-center shadow-pop transition-transform active:translate-y-1 active:shadow-none ${
                          presente ? 'bg-grass-400 text-white' : 'bg-white text-ink'
                        }`}
                      >
                        <span key={presente ? 'p' : 'a'} className="animate-pop-in text-4xl">
                          {presente ? '✅' : '🧒'}
                        </span>
                        <span className="font-bold leading-tight">{n.nombre_completo}</span>
                      </button>
                      {presente && (
                        <button
                          onClick={() => setProgresoNino(n)}
                          title="Registrar progreso"
                          aria-label={`Registrar progreso de ${n.nombre_completo}`}
                          className="animate-pop-in absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow-soft ring-2 ring-grass-200 transition-transform hover:scale-110 active:scale-95"
                        >
                          🌱
                        </button>
                      )}
                    </div>
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
        </>
      )}

      <ProgresoNinoModal nino={progresoNino} nivelId={nivelId} open={!!progresoNino} onClose={() => setProgresoNino(null)} />
    </div>
  )
}
