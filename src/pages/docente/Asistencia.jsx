import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useMisClases } from '../../lib/useMisClases'
import Spinner from '../../components/Spinner'
import ResumenAsistenciaMensual from '../../components/ResumenAsistenciaMensual'
import ProgresoNinoModal from '../../components/ProgresoNinoModal'
import AlertasAusencia from '../../components/AlertasAusencia'
import TomarAsistenciaInline from '../../components/TomarAsistenciaInline'

export default function Asistencia() {
  const { user } = useAuth()
  const { clases, nivelId, setNivelId } = useMisClases()
  const [ninos, setNinos] = useState(null)
  const [tab, setTab] = useState('tomar')
  const [progresoNino, setProgresoNino] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    if (!nivelId) return
    const { data: n } = await supabase.from('ninos').select('*').eq('nivel_id', nivelId).eq('activo', true).order('nombre_completo')
    setNinos(n || [])
  }, [nivelId])

  useEffect(() => {
    load()
  }, [load])

  if (!clases) return <Spinner />
  if (clases.length === 0) return <p className="card text-ink/50">No tienes clases asignadas todavía.</p>

  const nivelActual = clases.find((c) => c.id === nivelId)

  const tabs = [
    ['tomar', '✅ Tomar asistencia'],
    ['mes', '📊 Tabla del mes'],
    ['ausencias', '⚠️ Ausencias'],
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Asistencia ✅</h1>
        <p className="text-ink/50">Toma asistencia, revisa el mes y las ausencias</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([v, label]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`rounded-full px-5 py-2 text-sm font-bold ${tab === v ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <select className="input max-w-xs" value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
        {clases.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>

      {tab === 'tomar' ? (
        <TomarAsistenciaInline
          key={`tomar-${nivelId}`}
          nivelId={nivelId}
          nivelNombre={nivelActual?.nombre}
          ninos={ninos}
          userId={user.id}
          onProgreso={(n) => setProgresoNino(n)}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      ) : tab === 'mes' ? (
        <ResumenAsistenciaMensual key={`${nivelId}-${refreshKey}`} nivelId={nivelId} ninos={ninos} />
      ) : (
        <AlertasAusencia nivelId={nivelId} ninos={ninos} />
      )}

      <ProgresoNinoModal nino={progresoNino} nivelId={nivelId} open={!!progresoNino} onClose={() => setProgresoNino(null)} />
    </div>
  )
}
