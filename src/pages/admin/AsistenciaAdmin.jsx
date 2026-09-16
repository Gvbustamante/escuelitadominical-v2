import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Skeleton from '../../components/Skeleton'
import ResumenAsistenciaMensual from '../../components/ResumenAsistenciaMensual'
import ProgresoNinoModal from '../../components/ProgresoNinoModal'
import TomarAsistenciaInline from '../../components/TomarAsistenciaInline'

export default function AsistenciaAdmin() {
  const { user } = useAuth()
  const [niveles, setNiveles] = useState(null)
  const [nivelId, setNivelId] = useState('')
  const [ninos, setNinos] = useState(null)
  const [progresoNino, setProgresoNino] = useState(null)
  const [tab, setTab] = useState('tomar')
  const [refreshKey, setRefreshKey] = useState(0)

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

  const loadNinos = useCallback(async () => {
    if (!nivelId) return
    const { data } = await supabase.from('ninos').select('*').eq('nivel_id', nivelId).eq('activo', true).order('nombre_completo')
    setNinos(data || [])
  }, [nivelId])

  useEffect(() => {
    loadNinos()
  }, [loadNinos])

  if (!niveles) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (niveles.length === 0) return <p className="card text-ink/50">Todavía no hay clases creadas.</p>

  const nivelActual = niveles.find((n) => n.id === nivelId)

  const tabs = [
    ['tomar', '✅ Tomar asistencia'],
    ['mes', '📊 Tabla del mes'],
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Asistencia ✅</h1>
        <p className="text-ink/50">Toma asistencia y revisa la tabla mensual por clase</p>
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
        {niveles.map((n) => (
          <option key={n.id} value={n.id}>
            {n.nombre}
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
      ) : (
        <ResumenAsistenciaMensual key={`${nivelId}-${refreshKey}`} nivelId={nivelId} ninos={ninos} />
      )}

      <ProgresoNinoModal nino={progresoNino} nivelId={nivelId} open={!!progresoNino} onClose={() => setProgresoNino(null)} />
    </div>
  )
}
