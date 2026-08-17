import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useMisHijos } from '../../lib/useMisHijos'
import { coincide } from '../../lib/busqueda'
import Spinner from '../../components/Spinner'
import HijoSelector from '../../components/HijoSelector'
import ActivityFiles from '../../components/ActivityFiles'
import RichTextView from '../../components/RichTextView'
import TareaHijoWidget from '../../components/TareaHijoWidget'
import { getVideoEmbedUrl } from '../../lib/videoEmbed'

const REACCIONES = ['❤️', '👏', '🙌', '😍']

export default function PadreActividades() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const hijos = useMisHijos()
  const [actividades, setActividades] = useState(null)
  const [entregas, setEntregas] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [busqueda, setBusqueda] = useState('')

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
      .lte('fecha', new Date().toISOString().slice(0, 10))
      .order('fecha', { ascending: false })
    setActividades(data || [])

    const tareaIds = (data || []).filter((a) => a.es_tarea).map((a) => a.id)
    const hijoIds = hijos.map((h) => h.id)
    if (tareaIds.length > 0 && hijoIds.length > 0) {
      const { data: e } = await supabase
        .from('tarea_entregas')
        .select('*')
        .in('actividad_id', tareaIds)
        .in('nino_id', hijoIds)
      const grouped = {}
      ;(e || []).forEach((row) => {
        grouped[`${row.actividad_id}_${row.nino_id}`] = row
      })
      setEntregas(grouped)
    } else {
      setEntregas({})
    }
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

  if (!hijos || !actividades) return <Spinner />

  const hijosParaTarea = (nivelId) => (selectedId ? hijos.filter((h) => h.id === selectedId) : hijos).filter((h) => h.nivel_id === nivelId)
  const actividadesFiltradas = actividades.filter((a) =>
    coincide(busqueda, a.titulo, a.descripcion, a.versiculo_clave, a.historia_biblica, a.nivel?.nombre),
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Actividades 🎨</h1>
        <p className="text-ink/50">Lo que hicieron en la escuelita</p>
      </div>

      <HijoSelector hijos={hijos} selectedId={selectedId} onChange={setSelectedId} />

      <input
        className="input max-w-xs"
        placeholder="Buscar actividad..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div className="flex flex-col gap-4">
        {actividadesFiltradas.map((a, i) => {
          const mia = a.actividad_reacciones.find((r) => r.padre_id === user.id)
          return (
            <div
              key={a.id}
              className="card animate-pop-in transition-transform duration-200 hover:-translate-y-0.5"
              style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
            >
              <div className="flex items-start justify-between cursor-pointer" onClick={() => navigate(`/actividades/${a.id}`)}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold hover:text-sky-600">{a.titulo}</h3>
                    {a.es_tarea && <span className="badge bg-sky-100 text-sky-700">📝 Tarea</span>}
                  </div>
                  <p className="text-xs font-bold uppercase text-sky-500">{a.nivel?.nombre}</p>
                </div>
                <span className="text-sm text-ink/40">{a.fecha}</span>
              </div>
              <RichTextView html={a.descripcion} className="mt-1" />
              {(a.versiculo_clave || a.historia_biblica) && (
                <div className="mt-3 rounded-2xl border-l-4 border-sunshine-300 bg-sunshine-50 p-3">
                  {a.versiculo_clave && <p className="italic text-ink/80">📖 "{a.versiculo_clave}"</p>}
                  {a.historia_biblica && <p className="mt-1 text-sm font-bold text-sunshine-700">Historia: {a.historia_biblica}</p>}
                </div>
              )}
              {a.enlace_externo && (
                getVideoEmbedUrl(a.enlace_externo) ? (
                  <div className="mt-3 overflow-hidden rounded-2xl bg-ink shadow-soft">
                    <iframe
                      src={getVideoEmbedUrl(a.enlace_externo)}
                      title="Video"
                      className="aspect-video w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <a
                    href={a.enlace_externo}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block w-fit rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-600 hover:bg-sky-100"
                  >
                    🔗 Abrir enlace de la tarea
                  </a>
                )
              )}
              <ActivityFiles archivos={a.actividad_archivos} />

              {a.es_tarea && (
                <div className="mt-4 flex flex-col gap-2">
                  {hijosParaTarea(a.nivel_id).map((h) => (
                    <TareaHijoWidget key={h.id} actividad={a} hijo={h} entrega={entregas[`${a.id}_${h.id}`]} onSaved={load} />
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                {REACCIONES.map((r) => (
                  <button
                    key={r}
                    onClick={() => reaccionar(a.id, r)}
                    className={`rounded-full px-3 py-2 text-xl transition-transform duration-150 active:scale-90 ${
                      mia?.tipo === r ? 'animate-pop-in scale-110 bg-coral-100 ring-2 ring-coral-400' : 'bg-ink/5 hover:scale-110 hover:bg-ink/10'
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <button
                  onClick={() => navigate(`/actividades/${a.id}`)}
                  className="ml-auto text-sm font-bold text-ink/40 hover:text-sky-600 hover:underline"
                >
                  {a.actividad_reacciones.length} reacciones · Ver completa →
                </button>
              </div>
            </div>
          )
        })}
        {actividades.length === 0 && <p className="card text-ink/50">Aún no hay actividades publicadas.</p>}
        {actividades.length > 0 && actividadesFiltradas.length === 0 && (
          <p className="card text-ink/50">No hay actividades que coincidan con "{busqueda}".</p>
        )}
      </div>
    </div>
  )
}
