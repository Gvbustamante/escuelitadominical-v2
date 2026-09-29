import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from './Modal'
import RichTextEditor from './RichTextEditor'

const BUCKET = 'actividades'
const MAX_MB = 20

const GUIA = `<p><strong>Objetivo:</strong> </p>
<p><strong>Versículo clave:</strong> </p>
<p><strong>Historia bíblica:</strong> </p>
<p><strong>Desarrollo de la clase:</strong></p>
<ol><li><p>Bienvenida y oración</p></li><li><p>Enseñanza</p></li><li><p>Actividad</p></li><li><p>Cierre y oración</p></li></ol>
<p><strong>Materiales:</strong> </p>`

export function urlPdfPlaneacion(path) {
  return path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null
}

/**
 * Planeación de una clase (nivel + fecha): texto escrito y/o un PDF.
 * `planeacion` es la fila existente de planeacion_clase o null.
 */
export default function PlaneacionClaseModal({ open, onClose, nivel, fecha, planeacion, userId, onSaved }) {
  const [contenido, setContenido] = useState('')
  const [editorKey, setEditorKey] = useState(0)
  const [pdfNuevo, setPdfNuevo] = useState(null)
  const [quitarPdf, setQuitarPdf] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setContenido(planeacion?.contenido || '')
    setEditorKey((k) => k + 1)
    setPdfNuevo(null)
    setQuitarPdf(false)
    setError('')
  }, [open, planeacion])

  function usarGuia() {
    setContenido(GUIA)
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
      const path = `planeaciones/${nivel.id}/${fecha}/${Date.now()}-${limpio}`
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
        if (pdfNuevo && pdf_path) await supabase.storage.from(BUCKET).remove([pdf_path])
        setBusy(false)
        return setError('No se pudo guardar: ' + saveError.message)
      }
    }

    // Limpiar el PDF anterior si se reemplazó o se quitó.
    if (pdfAnterior && pdfAnterior !== pdf_path) {
      await supabase.storage.from(BUCKET).remove([pdfAnterior])
    }

    setBusy(false)
    onSaved?.()
    onClose()
  }

  const pdfActualUrl = !quitarPdf && !pdfNuevo ? urlPdfPlaneacion(planeacion?.pdf_path) : null
  const fechaLarga = fecha
    ? new Date(fecha + 'T00:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  return (
    <Modal open={open} onClose={onClose} wide title={`Planeación — ${nivel?.nombre || ''}`}>
      <div className="flex flex-col gap-5">
        <p className="-mt-2 text-sm font-bold capitalize text-ink/60">{fechaLarga}</p>

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
            <div className="flex items-center justify-between gap-2 rounded-xl bg-sky-50 px-3 py-2">
              <span className="min-w-0 truncate text-sm font-bold text-sky-700">📄 {pdfNuevo.name}</span>
              <button type="button" onClick={() => setPdfNuevo(null)} className="shrink-0 text-sm font-bold text-coral-600">
                Quitar
              </button>
            </div>
          ) : pdfActualUrl ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink/5 px-3 py-2">
                <a href={pdfActualUrl} target="_blank" rel="noreferrer" className="min-w-0 truncate text-sm font-bold text-sky-700 hover:underline">
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
              <iframe
                src={pdfActualUrl}
                title="Vista previa del PDF"
                className="hidden h-[60vh] w-full rounded-xl border border-ink/10 sm:block"
              />
            </div>
          ) : (
            <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary !py-2 !text-sm">
              📎 Elegir PDF
            </button>
          )}
          {quitarPdf && <p className="mt-1 text-sm text-coral-600">El PDF se quitará al guardar.</p>}
          <p className="mt-1 text-sm text-ink/60">Máximo {MAX_MB} MB. Puedes escribir, subir PDF o ambos.</p>
        </div>

        {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}

        <button type="button" disabled={busy} onClick={guardar} className="btn-primary justify-center">
          {busy ? 'Guardando...' : 'Guardar planeación'}
        </button>
      </div>
    </Modal>
  )
}
