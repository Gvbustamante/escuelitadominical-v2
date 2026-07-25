import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useMisHijos } from '../../lib/useMisHijos'
import Spinner from '../../components/Spinner'
import HijoSelector from '../../components/HijoSelector'

const REACCIONES = ['❤️', '👏', '🙌', '😍']

export default function PadreActividades() {
  const { user } = useAuth()
  const hijos = useMisHijos()
  const [actividades, setActividades] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const load = useCallback(async () => {
    if (!hijos) return
    const hijosActivos = selectedId ? hijos.filter((h) => h.id === selectedId) : hijos
    const nivelIds = [...new Set(hijosActivos.map((h) => h.nivel_id).filter(Boolean))]
    if (nivelIds.length === 0) {
      setActividades([])
      return
    }
    const { data } = await supabase
      .from('actividades')
      .select('*, nivel:niveles(nombre), actividad_archivos(*), actividad_reacciones(*)')
      .in('nivel_id', nivelIds)
      .order('fecha', { ascending: false })
    setActividades(data || [])
  }, [hijos, selectedId])

  useEffect(() => {
    load()
  }, [load])

  async function reaccionar(actividadId, tipo) {
    const actividad = actividades.find((a) => a.id === actividadId)
    const mia = actividad.actividad_reacciones.find((r) => r.padre_id === user.id)
    if (mia && mia.tipo === tipo) {
      await supabase.from('actividad_reacciones').delete().eq('actividad_id', actividadId).eq('padre_id', user.id)
    } else {
      await supabase.from('actividad_reacciones').upsert(
        { actividad_id: actividadId, padre_id: user.id, tipo },
        { onConflict: 'actividad_id,padre_id' },
      )
    }
    load()
  }

  function fileUrl(path) {
    return supabase.storage.from('actividades').getPublicUrl(path).data.publicUrl
  }

  if (!hijos || !actividades) return <Spinner />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Actividades 🎨</h1>
        <p className="text-ink/50">Lo que hicieron en la escuelita</p>
      </div>

      <HijoSelector hijos={hijos} selectedId={selectedId} onChange={setSelectedId} />

      <div className="flex flex-col gap-4">
        {actividades.map((a) => {
          const mia = a.actividad_reacciones.find((r) => r.padre_id === user.id)
          return (
            <div key={a.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">{a.titulo}</h3>
                  <p className="text-xs font-bold uppercase text-sky-500">{a.nivel?.nombre}</p>
                </div>
                <span className="text-sm text-ink/40">{a.fecha}</span>
              </div>
              {a.descripcion && <p className="mt-1 text-ink/70">{a.descripcion}</p>}
              {(a.versiculo_clave || a.historia_biblica) && (
                <div className="mt-3 rounded-2xl bg-sunshine-50 p-3">
                  {a.versiculo_clave && <p className="italic text-ink/80">📖 "{a.versiculo_clave}"</p>}
                  {a.historia_biblica && <p className="mt-1 text-sm font-bold text-sunshine-700">Historia: {a.historia_biblica}</p>}
                </div>
              )}
              {a.actividad_archivos?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.actividad_archivos.map((f) => (
                    <a
                      key={f.id}
                      href={fileUrl(f.storage_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-600 hover:bg-sky-100"
                    >
                      📎 {f.nombre_archivo}
                    </a>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center gap-2">
                {REACCIONES.map((r) => (
                  <button
                    key={r}
                    onClick={() => reaccionar(a.id, r)}
                    className={`rounded-full px-3 py-2 text-xl transition-transform active:scale-90 ${
                      mia?.tipo === r ? 'bg-coral-100 ring-2 ring-coral-400' : 'bg-ink/5 hover:bg-ink/10'
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <span className="ml-auto text-sm font-bold text-ink/40">{a.actividad_reacciones.length} reacciones</span>
              </div>
            </div>
          )
        })}
        {actividades.length === 0 && <p className="card text-ink/50">Aún no hay actividades publicadas.</p>}
      </div>
    </div>
  )
}
