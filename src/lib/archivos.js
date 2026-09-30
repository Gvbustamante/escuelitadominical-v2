import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

/**
 * URLs de archivos de Storage.
 * - Buckets públicos (actividades, logos…): URL pública, síncrona.
 * - Buckets privados ('drive', 'planeaciones'): enlace firmado que caduca. Se firman en lote con
 *   useArchivosFirmados() y se leen síncronamente con urlArchivo() (null mientras carga).
 */
const PRIVADOS = new Set(['drive', 'planeaciones'])
const DURACION = 3600 // segundos
const cache = new Map() // `${bucket}/${path}` -> { url, vence }

const clave = (bucket, path) => `${bucket}/${path}`

export function urlArchivo(bucket = 'actividades', path) {
  if (!path) return null
  const b = bucket || 'actividades'
  if (!PRIVADOS.has(b)) return supabase.storage.from(b).getPublicUrl(path).data.publicUrl
  const c = cache.get(clave(b, path))
  return c && c.vence > Date.now() ? c.url : null
}

/** Firma en lote los archivos privados que falten. items: [{ bucket, storage_path }] */
export async function firmarArchivos(items) {
  const porBucket = new Map()
  for (const it of items || []) {
    const b = it?.bucket
    if (!PRIVADOS.has(b) || !it.storage_path || urlArchivo(b, it.storage_path)) continue
    if (!porBucket.has(b)) porBucket.set(b, new Set())
    porBucket.get(b).add(it.storage_path)
  }
  await Promise.all([...porBucket].map(async ([b, paths]) => {
    const { data } = await supabase.storage.from(b).createSignedUrls([...paths], DURACION)
    const vence = Date.now() + (DURACION - 300) * 1000
    for (const r of data || []) if (r.signedUrl && !r.error) cache.set(clave(b, r.path), { url: r.signedUrl, vence })
  }))
}

/** Firma un archivo privado y devuelve su URL (para abrir o previsualizar). */
export async function urlArchivoAsync(bucket, path) {
  await firmarArchivos([{ bucket, storage_path: path }])
  return urlArchivo(bucket, path)
}

/** Hook: firma los archivos privados de la lista y re-renderiza cuando están listos. */
export function useArchivosFirmados(items) {
  const [, setVersion] = useState(0)
  const key = (items || [])
    .filter((it) => PRIVADOS.has(it?.bucket) && it.storage_path)
    .map((it) => clave(it.bucket, it.storage_path))
    .sort()
    .join('\n')
  useEffect(() => {
    if (!key) return
    let vivo = true
    const lista = key.split('\n').map((k) => {
      const i = k.indexOf('/')
      return { bucket: k.slice(0, i), storage_path: k.slice(i + 1) }
    })
    firmarArchivos(lista).then(() => { if (vivo) setVersion((v) => v + 1) })
    return () => { vivo = false }
  }, [key])
}
