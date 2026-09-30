import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from './Modal'
import RichTextEditor from './RichTextEditor'
import PdfViewer from './PdfViewer'
import { urlArchivo, useArchivosFirmados } from '../lib/archivos'
import { capitalizar } from '../lib/fechas'

// PDFs en bucket privado 'planeaciones'. Los antiguos quedaron en 'actividades' con ruta 'planeaciones/...'.
const BUCKET = 'planeaciones'
const LEGADO = 'actividades'
const esLegado = (path) => path?.startsWith('planeaciones/')
const bucketDe = (path) => (esLegado(path) ? LEGADO : BUCKET)
const MAX_MB = 20

const escapar = (t) => (t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Guía de planeación; completa versículo e historia si ya se conocen (desde "Preparar clase").
export function guiaPlaneacion({ versiculo = '', historia = '', actividad = '' } = {}) {
  return `<p><strong>Objetivo:</strong> </p>
<p><strong>Versículo clave:</strong> ${escapar(versiculo)}</p>
<p><strong>Historia bíblica:</strong> ${escapar(historia)}</p>
<p><strong>Desarrollo de la clase:</strong></p>
<ol><li><p>Bienvenida y oración</p></li><li><p>Enseñanza</p></li><li><p>Actividad${actividad ? ': ' + escapar(actividad) : ''}</p></li><li><p>Cierre y oración</p></li></ol>
<p><strong>Materiales:</strong> </p>`
}

/** { bucket, storage_path } de un archivo de planeación, para firmar con useArchivosFirmados. */
export function archivoPlaneacion(a) {
  return a?.storage_path ? { bucket: bucketDe(a.storage_path), storage_path: a.storage_path } : null
}

/** URL del archivo (firmada; null mientras se firma). */
export function urlArchivoPlaneacion(a) {
  return a?.storage_path ? urlArchivo(bucketDe(a.storage_path), a.storage_path) : null
}

/**
 * Mueve los archivos antiguos (bucket público) al privado. Idempotente; lo corre admin/coordinador.
 * Si algo falla (p. ej. falta el bucket), se detiene sin romper nada.
 */
let migracionHecha = false
export async function moverPdfsPlaneacionAPrivado() {
  if (migracionHecha) return
  migracionHecha = true
  const { data, error } = await supabase.from('planeacion_archivos').select('id, storage_path').like('storage_path', 'planeaciones/%')
  if (error) return
  for (const a of data || []) {
    const nuevo = a.storage_path.slice('planeaciones/'.length)
    const { error: cpError } = await supabase.storage.from(LEGADO).copy(a.storage_path, nuevo, { destinationBucket: BUCKET })
    if (cpError && !/exists/i.test(cpError.message)) return
    const { error: upError } = await supabase.from('planeacion_archivos').update({ storage_path: nuevo }).eq('id', a.id)
    if (upError) return
    await supabase.storage.from(LEGADO).remove([a.storage_path])
  }
}

const ACEPTA = '.pdf,.doc,.docx,.ppt,.pptx,image/*'
const PERMITIDO = /\.(pdf|docx?|pptx?|png|jpe?g|gif|webp|heic|avif)$/i

function esPdf(nombre, tipo) {
  return tipo === 'application/pdf' || /\.pdf$/i.test(nombre || '')
}
function esImagen(nombre, tipo) {
  return (tipo || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|avif)$/i.test(nombre || '')
}
function icono(nombre, tipo) {
  if (esPdf(nombre, tipo)) return '📄'
  if (esImagen(nombre, tipo)) return '🖼️'
  if (/\.pptx?$/i.test(nombre || '')) return '📊'
  return '📝'
}

/** Vista dentro del formulario: PDF con visor (zoom, imprimir, descargar), imagen o enlace. */
function VistaArchivo({ src, nombre, tipo }) {
  const [objUrl, setObjUrl] = useState(null)
  useEffect(() => {
    if (!(src instanceof Blob) || esPdf(nombre, tipo)) return
    const u = URL.createObjectURL(src)
    setObjUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [src, nombre, tipo])
  if (!src) return <div className="h-40 animate-pulse rounded-2xl bg-ink/5" aria-busy="true" aria-label="Cargando archivo" />
  if (esPdf(nombre, tipo)) return <PdfViewer src={src} nombre={nombre} />
  const url = src instanceof Blob ? objUrl : src
  if (esImagen(nombre, tipo)) return url ? <img src={url} alt={nombre} className="max-h-[60vh] w-full rounded-2xl bg-ink/5 object-contain" /> : null
  return (
    <p className="rounded-xl bg-ink/5 px-3 py-2 text-sm text-ink/75">
      Este archivo no se puede ver aquí.{' '}
      {url && <a href={url} target="_blank" rel="noreferrer" download={nombre} className="font-bold text-sky-700 hover:underline">Descargar {nombre}</a>}
    </p>
  )
}

/**
 * Formulario de la planeación de una clase (nivel + fecha): texto escrito y/o uno o más archivos.
 * `planeacion` es la fila de planeacion_clase (con planeacion_archivos) o null.
 * Se usa en su propia ventana y dentro de "Preparar clase".
 */
export function PlaneacionClaseForm({ nivel, fecha, planeacion, userId, onSaved, textoBoton = 'Guardar planeación', datosGuia }) {
  const [contenido, setContenido] = useState('')
  const [editorKey, setEditorKey] = useState(0)
  const [nuevos, setNuevos] = useState([]) // File[]
  const [quitados, setQuitados] = useState([]) // ids de planeacion_archivos
  const [abierto, setAbierto] = useState(null) // clave del archivo visible
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const existentes = [...(planeacion?.planeacion_archivos || [])].sort((x, y) => (x.created_at || '').localeCompare(y.created_at || ''))
  useArchivosFirmados(existentes.map(archivoPlaneacion).filter(Boolean))

  useEffect(() => {
    setContenido(planeacion?.contenido || '')
    setEditorKey((k) => k + 1)
    setNuevos([])
    setQuitados([])
    const lista = planeacion?.planeacion_archivos || []
    setAbierto(lista.length === 1 ? `e-${lista[0].id}` : null)
    setError('')
  }, [planeacion])

  function usarGuia() {
    setContenido(guiaPlaneacion(datosGuia))
    setEditorKey((k) => k + 1)
  }

  function elegirArchivos(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    const malos = files.filter((f) => !PERMITIDO.test(f.name))
    const grandes = files.filter((f) => f.size > MAX_MB * 1024 * 1024)
    const buenos = files.filter((f) => PERMITIDO.test(f.name) && f.size <= MAX_MB * 1024 * 1024)
    const avisos = []
    if (malos.length) avisos.push(`No se permiten: ${malos.map((f) => f.name).join(', ')} (solo PDF, Word, PowerPoint o imágenes).`)
    if (grandes.length) avisos.push(`Pesan más de ${MAX_MB} MB: ${grandes.map((f) => f.name).join(', ')}.`)
    setError(avisos.join(' '))
    if (buenos.length) {
      setNuevos((prev) => [...prev, ...buenos])
      if (!abierto && existentes.length === 0 && nuevos.length === 0 && buenos.length === 1) setAbierto('n-0')
    }
  }

  async function guardar() {
    setBusy(true)
    setError('')
    const texto = contenido && contenido.replace(/<[^>]*>/g, '').trim() ? contenido : null
    const quedan = existentes.filter((a) => !quitados.includes(a.id))
    const aBorrar = existentes.filter((a) => quitados.includes(a.id))

    // Sin texto ni archivos: se borra la planeación.
    if (!texto && quedan.length === 0 && nuevos.length === 0) {
      if (planeacion) {
        const { error: delError } = await supabase.from('planeacion_clase').delete().eq('id', planeacion.id)
        if (delError) {
          setBusy(false)
          return setError('No se pudo guardar: ' + delError.message)
        }
        await borrarDeStorage(existentes)
      }
      setBusy(false)
      return onSaved?.()
    }

    const { data: fila, error: saveError } = await supabase
      .from('planeacion_clase')
      .upsert(
        { nivel_id: nivel.id, fecha, contenido: texto, autor_id: userId, updated_at: new Date().toISOString() },
        { onConflict: 'nivel_id,fecha' },
      )
      .select('id')
      .single()
    if (saveError) {
      setBusy(false)
      return setError('No se pudo guardar: ' + saveError.message)
    }

    // Subir los nuevos (en paralelo) y registrarlos.
    const subidos = []
    const fallidos = []
    await Promise.all(nuevos.map(async (f, i) => {
      const limpio = f.name.replace(/[^\w.-]+/g, '_')
      const path = `${nivel.id}/${fecha}/${Date.now()}-${i}-${limpio}`
      const { error: upError } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type || undefined })
      if (upError) fallidos.push(f.name)
      else subidos.push({ planeacion_id: fila.id, storage_path: path, nombre: f.name, tipo: f.type || null, tamano: f.size })
    }))
    if (subidos.length) {
      const { error: insError } = await supabase.from('planeacion_archivos').insert(subidos)
      if (insError) {
        await supabase.storage.from(BUCKET).remove(subidos.map((s) => s.storage_path))
        setBusy(false)
        return setError('No se pudieron guardar los archivos: ' + insError.message)
      }
    }

    // Quitar los que se marcaron.
    if (aBorrar.length) {
      await supabase.from('planeacion_archivos').delete().in('id', aBorrar.map((a) => a.id))
      await borrarDeStorage(aBorrar)
    }

    setBusy(false)
    if (fallidos.length) {
      setNuevos(nuevos.filter((f) => fallidos.includes(f.name)))
      return setError(`Se guardó la planeación, pero no se pudieron subir: ${fallidos.join(', ')}. Intenta de nuevo.`)
    }
    onSaved?.()
  }

  async function borrarDeStorage(archivos) {
    const porBucket = {}
    for (const a of archivos) (porBucket[bucketDe(a.storage_path)] ||= []).push(a.storage_path)
    await Promise.all(Object.entries(porBucket).map(([b, paths]) => supabase.storage.from(b).remove(paths)))
  }

  const visibles = [
    ...existentes.filter((a) => !quitados.includes(a.id)).map((a) => ({ key: `e-${a.id}`, nombre: a.nombre, tipo: a.tipo, src: urlArchivoPlaneacion(a), quitar: () => setQuitados((q) => [...q, a.id]) })),
    ...nuevos.map((f, i) => ({ key: `n-${i}`, nombre: f.name, tipo: f.type, src: f, nuevo: true, quitar: () => setNuevos((n) => n.filter((_, j) => j !== i)) })),
  ]

  return (
      <div className="flex flex-col gap-5">
        {/* Escrita */}
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="label !mb-0">✍️ Escribir la planeación</label>
            {!contenido && (
              <button type="button" onClick={usarGuia} className="text-sm font-bold text-sky-600 hover:underline">
                Usar guía
              </button>
            )}
          </div>
          <div className="rounded-xl border border-ink/10 px-3 py-2">
            <RichTextEditor
              key={editorKey}
              value={contenido}
              onChange={setContenido}
              placeholder="Objetivo, versículo, historia, desarrollo de la clase, materiales…"
            />
          </div>
        </div>

        {/* Archivos */}
        <div>
          <label className="label">📎 O subir archivos (uno o varios)</label>
          <input ref={inputRef} type="file" multiple accept={ACEPTA} className="hidden" onChange={elegirArchivos} />

          {visibles.length > 0 && (
            <ul className="mb-2 flex flex-col gap-2">
              {visibles.map((v) => (
                <li key={v.key} className="flex flex-col gap-2">
                  <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 ${v.nuevo ? 'bg-sky-50' : 'bg-ink/5'}`}>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                      {icono(v.nombre, v.tipo)} {v.nombre}
                      {v.nuevo && <span className="ml-2 text-xs font-bold text-sky-700">Nuevo</span>}
                    </span>
                    <div className="flex shrink-0 gap-3">
                      <button type="button" onClick={() => setAbierto(abierto === v.key ? null : v.key)} aria-expanded={abierto === v.key} className="text-sm font-bold text-sky-700">
                        {abierto === v.key ? 'Ocultar' : 'Ver'}
                      </button>
                      <button type="button" onClick={() => { if (abierto === v.key) setAbierto(null); v.quitar() }} className="text-sm font-bold text-coral-600">
                        Quitar
                      </button>
                    </div>
                  </div>
                  {abierto === v.key && <VistaArchivo src={v.src} nombre={v.nombre} tipo={v.tipo} />}
                </li>
              ))}
            </ul>
          )}

          <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary !py-2 !text-sm">
            📎 {visibles.length ? 'Agregar más archivos' : 'Elegir archivos'}
          </button>
          {quitados.length > 0 && <p className="mt-1 text-sm text-coral-600">{quitados.length === 1 ? 'Se quitará 1 archivo' : `Se quitarán ${quitados.length} archivos`} al guardar.</p>}
          <p className="mt-1 text-sm text-ink/75">PDF, Word, PowerPoint o imágenes. Máximo {MAX_MB} MB cada uno. Puedes escribir, subir archivos o ambos.</p>
        </div>

        {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}

        <button type="button" disabled={busy} onClick={guardar} className="btn-primary justify-center">
          {busy ? 'Guardando...' : textoBoton}
        </button>
      </div>
  )
}

export default function PlaneacionClaseModal({ open, onClose, nivel, fecha, planeacion, userId, onSaved }) {
  const fechaLarga = fecha
    ? capitalizar(new Date(fecha + 'T00:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }))
    : ''
  return (
    <Modal open={open} onClose={onClose} wide title={`Planeación — ${nivel?.nombre || ''}`}>
      <p className="-mt-2 mb-4 text-sm font-bold text-ink/75">{fechaLarga}</p>
      {open && (
        <PlaneacionClaseForm
          nivel={nivel}
          fecha={fecha}
          planeacion={planeacion}
          userId={userId}
          onSaved={() => {
            onSaved?.()
            onClose()
          }}
        />
      )}
    </Modal>
  )
}
