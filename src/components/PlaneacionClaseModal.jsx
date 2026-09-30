import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from './Modal'
import RichTextEditor from './RichTextEditor'
import PdfViewer from './PdfViewer'
import { urlArchivo, useArchivosFirmados } from '../lib/archivos'

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

/** { bucket, storage_path } para firmar con useArchivosFirmados. */
export function archivoPdfPlaneacion(path) {
  return path ? { bucket: bucketDe(path), storage_path: path } : null
}

/** URL del PDF (firmada si es privado; null mientras se firma). */
export function urlPdfPlaneacion(path) {
  return path ? urlArchivo(bucketDe(path), path) : null
}

/**
 * Mueve los PDFs antiguos (públicos) al bucket privado. Idempotente; lo corre admin/coordinador.
 * Si algo falla (p. ej. falta el bucket), se detiene sin romper nada.
 */
let migracionHecha = false
export async function moverPdfsPlaneacionAPrivado() {
  if (migracionHecha) return
  migracionHecha = true
  const { data } = await supabase.from('planeacion_clase').select('id, pdf_path').like('pdf_path', 'planeaciones/%')
  for (const pl of data || []) {
    const nuevo = pl.pdf_path.slice('planeaciones/'.length)
    const { error: cpError } = await supabase.storage.from(LEGADO).copy(pl.pdf_path, nuevo, { destinationBucket: BUCKET })
    if (cpError && !/exists/i.test(cpError.message)) return
    const { error: upError } = await supabase.from('planeacion_clase').update({ pdf_path: nuevo }).eq('id', pl.id)
    if (upError) return
    await supabase.storage.from(LEGADO).remove([pl.pdf_path])
  }
}

/**
 * Formulario de la planeación de una clase (nivel + fecha): texto escrito y/o un PDF.
 * `planeacion` es la fila existente de planeacion_clase o null.
 * Se usa en su propia ventana y dentro de "Preparar clase".
 */
export function PlaneacionClaseForm({ nivel, fecha, planeacion, userId, onSaved, textoBoton = 'Guardar planeación', datosGuia }) {
  const [contenido, setContenido] = useState('')
  const [editorKey, setEditorKey] = useState(0)
  const [pdfNuevo, setPdfNuevo] = useState(null)
  const [quitarPdf, setQuitarPdf] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  useArchivosFirmados([archivoPdfPlaneacion(planeacion?.pdf_path)].filter(Boolean))

  useEffect(() => {
    setContenido(planeacion?.contenido || '')
    setEditorKey((k) => k + 1)
    setPdfNuevo(null)
    setQuitarPdf(false)
    setError('')
  }, [planeacion])

  function usarGuia() {
    setContenido(guiaPlaneacion(datosGuia))
    setEditorKey((k) => k + 1)
  }

  function elegirPdf(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const esPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
    if (!esPdf) return setError('Solo se permiten archivos PDF.')
    if (f.size > MAX_MB * 1024 * 1024) return setError(`El PDF pesa más de ${MAX_MB} MB.`)
    setError('')
    setPdfNuevo(f)
    setQuitarPdf(false)
  }

  async function guardar() {
    setBusy(true)
    setError('')
    const pdfAnterior = planeacion?.pdf_path || null
    let pdf_path = quitarPdf ? null : pdfAnterior
    let pdf_nombre = quitarPdf ? null : planeacion?.pdf_nombre || null

    if (pdfNuevo) {
      const limpio = pdfNuevo.name.replace(/[^\w.-]+/g, '_')
      const path = `${nivel.id}/${fecha}/${Date.now()}-${limpio}`
      const { error: upError } = await supabase.storage
        .from(BUCKET)
        .upload(path, pdfNuevo, { contentType: 'application/pdf' })
      if (upError) {
        setBusy(false)
        return setError('No se pudo subir el PDF: ' + upError.message)
      }
      pdf_path = path
      pdf_nombre = pdfNuevo.name
    }

    const texto = contenido && contenido.replace(/<[^>]*>/g, '').trim() ? contenido : null

    if (!texto && !pdf_path) {
      // Sin nada: se borra la planeación existente.
      if (planeacion) {
        const { error: delError } = await supabase.from('planeacion_clase').delete().eq('id', planeacion.id)
        if (delError) {
          setBusy(false)
          return setError('No se pudo guardar: ' + delError.message)
        }
      }
    } else {
      const { error: saveError } = await supabase.from('planeacion_clase').upsert(
        {
          nivel_id: nivel.id,
          fecha,
          contenido: texto,
          pdf_path,
          pdf_nombre,
          autor_id: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'nivel_id,fecha' },
      )
      if (saveError) {
        if (pdfNuevo && pdf_path) await supabase.storage.from(bucketDe(pdf_path)).remove([pdf_path])
        setBusy(false)
        return setError('No se pudo guardar: ' + saveError.message)
      }
    }

    // Limpiar el PDF anterior si se reemplazó o se quitó.
    if (pdfAnterior && pdfAnterior !== pdf_path) {
      await supabase.storage.from(bucketDe(pdfAnterior)).remove([pdfAnterior])
    }

    setBusy(false)
    onSaved?.()
  }

  const hayPdfActual = !quitarPdf && !pdfNuevo && !!planeacion?.pdf_path
  const pdfActualUrl = hayPdfActual ? urlPdfPlaneacion(planeacion.pdf_path) : null

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

        {/* PDF */}
        <div>
          <label className="label">📄 O subir la planeación en PDF</label>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={elegirPdf} />

          {pdfNuevo ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 rounded-xl bg-sky-50 px-3 py-2">
                <span className="min-w-0 truncate text-sm font-bold text-sky-700">📄 {pdfNuevo.name}</span>
                <button type="button" onClick={() => setPdfNuevo(null)} className="shrink-0 text-sm font-bold text-coral-600">
                  Quitar
                </button>
              </div>
              <PdfViewer src={pdfNuevo} nombre={pdfNuevo.name} />
            </div>
          ) : hayPdfActual ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink/5 px-3 py-2">
                <a href={pdfActualUrl || undefined} target="_blank" rel="noreferrer" className="min-w-0 truncate text-sm font-bold text-sky-700 hover:underline">
                  📄 {planeacion.pdf_nombre || 'Planeación.pdf'}
                </a>
                <div className="flex shrink-0 gap-3">
                  <button type="button" onClick={() => inputRef.current?.click()} className="text-sm font-bold text-sky-600">
                    Reemplazar
                  </button>
                  <button type="button" onClick={() => setQuitarPdf(true)} className="text-sm font-bold text-coral-600">
                    Quitar
                  </button>
                </div>
              </div>
              {pdfActualUrl ? (
                <PdfViewer src={pdfActualUrl} nombre={planeacion.pdf_nombre || 'Planeacion.pdf'} />
              ) : (
                <div className="h-40 animate-pulse rounded-2xl bg-ink/5" aria-busy="true" aria-label="Cargando PDF" />
              )}
            </div>
          ) : (
            <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary !py-2 !text-sm">
              📎 Elegir PDF
            </button>
          )}
          {quitarPdf && <p className="mt-1 text-sm text-coral-600">El PDF se quitará al guardar.</p>}
          <p className="mt-1 text-sm text-ink/75">Máximo {MAX_MB} MB. Puedes escribir, subir PDF o ambos.</p>
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
    ? new Date(fecha + 'T00:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''
  return (
    <Modal open={open} onClose={onClose} wide title={`Planeación — ${nivel?.nombre || ''}`}>
      <p className="-mt-2 mb-4 text-sm font-bold capitalize text-ink/75">{fechaLarga}</p>
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
