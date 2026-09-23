import { supabase } from '../lib/supabaseClient'

function urlDe(foto) {
  return foto.storage_path ? supabase.storage.from('actividades').getPublicUrl(foto.storage_path).data.publicUrl : foto.url
}

function esImagen(foto) {
  if (foto.mime?.startsWith('image/')) return true
  if (foto.tipo?.startsWith('image/')) return true
  const nombre = foto.nombre_archivo || foto.storage_path || foto.url || ''
  return /\.(jpe?g|png|gif|webp|svg|bmp|ico)$/i.test(nombre)
}

function nombreCorto(foto) {
  const n = foto.nombre_archivo || foto.storage_path?.split('/').pop() || 'Archivo'
  return n.length > 18 ? n.slice(0, 15) + '...' : n
}

export default function FotosGaleria({ fotos, size = 'h-24 w-24' }) {
  const lista = (fotos || []).filter(Boolean)
  if (lista.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {lista.map((f, i) => (
        <a
          key={f.id || i}
          href={urlDe(f)}
          target="_blank"
          rel="noreferrer"
          className={`${size} shrink-0 overflow-hidden rounded-xl bg-ink/5`}
        >
          {esImagen(f) ? (
            <img src={urlDe(f)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1 text-center">
              <span className="text-2xl leading-none">📄</span>
              <span className="w-full truncate text-[9px] font-bold text-ink/50">{nombreCorto(f)}</span>
            </div>
          )}
        </a>
      ))}
    </div>
  )
}
