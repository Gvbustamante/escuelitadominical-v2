import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useMisHijos } from '../../lib/useMisHijos'
import Spinner from '../../components/Spinner'
import HijoSelector from '../../components/HijoSelector'
import CalendarioAgenda from '../../components/CalendarioAgenda'
import TituloPagina from '../../components/ui/TituloPagina'
import ListaEventos from '../../components/ListaEventos'

export default function PadreAgenda() {
  const hijos = useMisHijos()
  const [eventos, setEventos] = useState(null)
  const [selectedHijoId, setSelectedHijoId] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  const load = useCallback(async () => {
    if (!hijos) return
    const hijosActivos = selectedHijoId ? hijos.filter((h) => h.id === selectedHijoId) : hijos
    const nivelIds = [...new Set(hijosActivos.map((h) => h.nivel_id).filter(Boolean))]
    const query = supabase.from('agenda').select('*, nivel:niveles(nombre)').order('fecha')
    const { data } = nivelIds.length
      ? await query.or(`nivel_id.is.null,nivel_id.in.(${nivelIds.join(',')})`)
      : await query.is('nivel_id', null)
    setEventos(data || [])
  }, [hijos, selectedHijoId])

  useEffect(() => {
    load()
  }, [load])

  if (!hijos || !eventos) return <Spinner />


  return (
    <div className="flex flex-col gap-6">
      <div>
        <TituloPagina ruta="/agenda">Agenda</TituloPagina>
        <p className="text-ink/70">Próximos eventos de la escuelita</p>
      </div>

      <HijoSelector hijos={hijos} selectedId={selectedHijoId} onChange={setSelectedHijoId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CalendarioAgenda eventos={eventos} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        <ListaEventos className="order-first lg:order-none" eventos={eventos} selectedDay={selectedDay} onClearDay={() => setSelectedDay(null)} />
      </div>
    </div>
  )
}
