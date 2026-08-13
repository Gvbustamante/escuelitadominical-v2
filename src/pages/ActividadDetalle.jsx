import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useMisHijos } from '../lib/useMisHijos'
import { useMisClases } from '../lib/useMisClases'
import Spinner from '../components/Spinner'
import RichTextView from '../components/RichTextView'
import ArticulosAdjuntos from '../components/ArticulosAdjuntos'
import ReaccionesBar from '../components/ReaccionesBar'
import TareaEntregas from '../components/TareaEntregas'
import TareaHijoWidget from '../components/TareaHijoWidget'
import MiEntregaEquipoWidget from '../components/MiEntregaEquipoWidget'

const STAFF = ['admin', 'coordinador']

function esFoto(f) {
  return f.tipo?.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|avif)$/i.test(f.nombre_archivo || '')
}

export default function ActividadDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [actividad, setActividad] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [tareaModalOpen, setTareaModalOpen] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('actividades')
      .select('*, nivel:niveles(nombre), actividad_archivos(*), actividad_reacciones(*)')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) {
      setNotFound(true)
      return
    }
    setActividad(data)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (notFound) {
    return (
      <div className="flex flex-col gap-4">
        <BotonVolver navigate={navigate} />
        <p className="card text-ink/50">No se encontró esta actividad, o no tienes acceso a ella.</p>
      </div>
    )
  }
  if (!actividad) return <Spinner />

  const archivos = actividad.actividad_archivos || []
  const fotos = archivos.filter(esFoto)
  const hero = fotos[0]
  const resto = archivos.filter((f) => f.id !== hero?.id)

  return (
    <div className="flex flex-col gap-6">
      <BotonVolver navigate={navigate} />

      <div className="card overflow-hidden !p-0">
        {hero && (
          <img
            src={supabase.storage.from('actividades').getPublicUrl(hero.storage_path).data.publicUrl}
            alt={actividad.titulo}
            className="h-56 w-full object-cover sm:h-80"
          />
        )}
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl">{actividad.titulo}</h1>
                {actividad.audiencia === 'docentes' && <span className="badge bg-grape-100 text-grape-700">🍎 Equipo docente</span>}
                {actividad.visible_padres === false && actividad.audiencia !== 'docentes' && (
                  <span className="badge bg-grape-100 text-grape-700">🙈 Solo equipo</span>
                )}
                {actividad.es_tarea && <span className="badge bg-sky-100 text-sky-700">📝 Tarea</span>}
              </div>
              {actividad.nivel?.nombre && <p className="mt-1 text-sm font-bold uppercase text-sky-500">{actividad.nivel.nombre}</p>}
            </div>
            <span className="text-sm text-ink/40">{actividad.fecha}</span>
          </div>

          <RichTextView html={actividad.descripcion} />

          {(actividad.versiculo_clave || actividad.historia_biblica) && (
            <div className="rounded-2xl border-l-4 border-sunshine-300 bg-sunshine-50 p-3">
              {actividad.versiculo_clave && <p className="italic text-ink/80">📖 "{actividad.versiculo_clave}"</p>}
              {actividad.historia_biblica && <p className="mt-1 text-sm font-bold text-sunshine-700">Historia: {actividad.historia_biblica}</p>}
            </div>
          )}

          {actividad.enlace_externo && (
            <a
              href={actividad.enlace_externo}
              target="_blank"
              rel="noreferrer"
              className="inline-block w-fit rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-600 hover:bg-sky-100"
            >
              🔗 Abrir enlace
            </a>
          )}

          {resto.some(esFoto) && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {resto.filter(esFoto).map((f) => (
                <a
                  key={f.id}
                  href={supabase.storage.from('actividades').getPublicUrl(f.storage_path).data.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square overflow-hidden rounded-2xl bg-ink/5"
                >
                  <img
                    src={supabase.storage.from('actividades').getPublicUrl(f.storage_path).data.publicUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </a>
              ))}
            </div>
          )}

          <ArticulosAdjuntos archivos={resto.filter((f) => !esFoto(f))} />

          {actividad.es_tarea && <TareaSeccion actividad={actividad} onVerEntregas={() => setTareaModalOpen(true)} onSaved={load} />}

          {profile.role === 'padre' && (
            <ReaccionesBar
              tabla="actividad_reacciones"
              columnaId="actividad_id"
              columnaUsuario="padre_id"
              targetId={actividad.id}
              reacciones={actividad.actividad_reacciones}
              onChanged={load}
            />
          )}
          {profile.role !== 'padre' && (
            <p className="text-sm font-bold text-coral-500">{actividad.actividad_reacciones.length} reacciones ❤️</p>
          )}
        </div>
      </div>

      <TareaEntregas actividad={tareaModalOpen ? actividad : null} open={tareaModalOpen} onClose={() => setTareaModalOpen(false)} />
    </div>
  )
}

function BotonVolver({ navigate }) {
  return (
    <button onClick={() => navigate(-1)} className="self-start text-sm font-bold text-sky-500 hover:underline">
      ← Volver
    </button>
  )
}

function TareaSeccion({ actividad, onVerEntregas, onSaved }) {
  const { user, profile } = useAuth()
  const hijos = useMisHijos()
  const { clases } = useMisClases()
  const [entregasHijos, setEntregasHijos] = useState({})
  const [miEntrega, setMiEntrega] = useState(undefined)

  const cargarEntregasHijos = useCallback(async () => {
    if (!hijos) return
    const hijoIds = hijos.filter((h) => h.nivel_id === actividad.nivel_id).map((h) => h.id)
    if (hijoIds.length === 0) return
    const { data } = await supabase.from('tarea_entregas').select('*').eq('actividad_id', actividad.id).in('nino_id', hijoIds)
    const grouped = {}
    ;(data || []).forEach((row) => {
      grouped[row.nino_id] = row
    })
    setEntregasHijos(grouped)
  }, [hijos, actividad.id, actividad.nivel_id])

  const cargarMiEntrega = useCallback(async () => {
    const { data } = await supabase
      .from('tarea_entregas')
      .select('*')
      .eq('actividad_id', actividad.id)
      .eq('docente_id', user.id)
      .maybeSingle()
    setMiEntrega(data)
  }, [actividad.id, user.id])

  useEffect(() => {
    if (profile.role === 'padre') cargarEntregasHijos()
    if (profile.role === 'docente' && actividad.audiencia === 'docentes') cargarMiEntrega()
  }, [profile.role, actividad.audiencia, cargarEntregasHijos, cargarMiEntrega])

  const esStaff = STAFF.includes(profile.role)
  const esDocenteDeLaClase = profile.role === 'docente' && clases?.some((c) => c.id === actividad.nivel_id)

  if (esStaff || esDocenteDeLaClase) {
    return (
      <button className="btn-secondary self-start !py-2 !px-4 !text-sm" onClick={onVerEntregas}>
        📋 Ver entregas
      </button>
    )
  }

  if (profile.role === 'docente' && actividad.audiencia === 'docentes' && miEntrega !== undefined) {
    return (
      <MiEntregaEquipoWidget
        actividad={actividad}
        entrega={miEntrega}
        onSaved={() => {
          cargarMiEntrega()
          onSaved()
        }}
      />
    )
  }

  if (profile.role === 'padre' && hijos) {
    const hijosDeLaClase = hijos.filter((h) => h.nivel_id === actividad.nivel_id)
    if (hijosDeLaClase.length === 0) return null
    return (
      <div className="flex flex-col gap-2">
        {hijosDeLaClase.map((h) => (
          <TareaHijoWidget
            key={h.id}
            actividad={actividad}
            hijo={h}
            entrega={entregasHijos[h.id]}
            onSaved={() => {
              cargarEntregasHijos()
              onSaved()
            }}
          />
        ))}
      </div>
    )
  }

  return null
}
