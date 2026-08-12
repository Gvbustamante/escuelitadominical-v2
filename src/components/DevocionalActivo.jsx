import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function DevocionalActivo() {
  const [devocional, setDevocional] = useState(null)

  useEffect(() => {
    supabase
      .from('devocionales_ninos')
      .select('*')
      .eq('activo', true)
      .maybeSingle()
      .then(({ data }) => setDevocional(data))
  }, [])

  if (!devocional) return null

  return (
    <Link to="/devocionales" className="card-link flex items-start gap-4">
      {devocional.imagen_url ? (
        <img src={devocional.imagen_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sunshine-100 text-3xl">🙏</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-extrabold uppercase tracking-wide text-sunshine-600">Devocional destacado</p>
        <p className="truncate text-lg font-bold">{devocional.titulo}</p>
        {devocional.versiculo && <p className="mt-1 truncate italic text-ink/60">📖 "{devocional.versiculo}"</p>}
      </div>
    </Link>
  )
}
