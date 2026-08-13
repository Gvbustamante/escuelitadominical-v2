import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'
import RichTextView from '../components/RichTextView'
import ArticulosAdjuntos from '../components/ArticulosAdjuntos'
import ReaccionesBar from '../components/ReaccionesBar'

export default function DevocionalDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [devocional, setDevocional] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [sugeridos, setSugeridos] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('devocionales_ninos')
      .select('*, nivel:niveles(nombre), devocional_archivos(*), devocional_reacciones(*)')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) {
      setNotFound(true)
      return
    }
    setDevocional(data)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setSugeridos(null)
    supabase
      .from('devocionales_ninos')
      .select('*, devocional_reacciones(*)')
      .neq('id', id)
      .order('fecha', { ascending: false })
      .limit(4)
      .then(({ data }) => setSugeridos(data || []))
  }, [id])

  if (notFound) {
    return (
      <div className="flex flex-col gap-4">
        <BotonVolver navigate={navigate} />
        <p className="card text-ink/50">No se encontró este devocional.</p>
      </div>
    )
  }
  if (!devocional) return <Spinner />

  return (
    <div className="flex flex-col gap-6">
      <BotonVolver navigate={navigate} />

      <div className="card overflow-hidden !p-0">
        {devocional.imagen_url && (
          <img src={devocional.imagen_url} alt={devocional.titulo} className="h-56 w-full object-cover sm:h-80" />
        )}
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl">{devocional.titulo}</h1>
                {devocional.activo && <span className="badge bg-sunshine-200 text-sunshine-800">🟢 Activo</span>}
              </div>
              {devocional.nivel?.nombre && <p className="mt-1 text-sm font-bold uppercase text-sky-500">{devocional.nivel.nombre}</p>}
            </div>
            <span className="text-sm text-ink/40">{devocional.fecha}</span>
          </div>

          {devocional.versiculo && (
            <div className="rounded-2xl border-l-4 border-sunshine-300 bg-sunshine-50 p-3">
              <p className="italic text-ink/80">📖 "{devocional.versiculo}"</p>
            </div>
          )}

          <RichTextView html={devocional.contenido} />

          <ArticulosAdjuntos archivos={devocional.devocional_archivos} />

          <ReaccionesBar
            tabla="devocional_reacciones"
            columnaId="devocional_id"
            columnaUsuario="usuario_id"
            targetId={devocional.id}
            reacciones={devocional.devocional_reacciones}
            onChanged={load}
          />
        </div>
      </div>

      {sugeridos && sugeridos.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink/40">🙏 Otros devocionales</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sugeridos.map((d) => (
              <button
                key={d.id}
                onClick={() => navigate(`/devocionales/${d.id}`)}
                className="card-link flex items-center gap-3 text-left !p-3"
              >
                {d.imagen_url ? (
                  <img src={d.imagen_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-sunshine-100 text-2xl">🙏</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{d.titulo}</p>
                  {d.versiculo && <p className="truncate text-sm italic text-ink/50">"{d.versiculo}"</p>}
                  <p className="mt-0.5 text-xs font-bold text-coral-500">{d.devocional_reacciones?.length || 0} reacciones ❤️</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
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
