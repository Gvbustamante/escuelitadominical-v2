import { useEffect, useRef, useState } from 'react'

const MAX_PAGINAS = 60
const ZOOM_MIN = 0.5
const ZOOM_MAX = 3
const ZOOM_PASO = 0.25

async function cargarPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

async function obtenerBlob(src) {
  if (src instanceof Blob) return src
  const res = await fetch(src)
  if (!res.ok) throw new Error('No se pudo descargar el PDF')
  return res.blob()
}

/**
 * Muestra un PDF con el estilo de la plataforma (hojas blancas sobre fondo claro)
 * en vez del visor oscuro del navegador. Funciona igual en iPhone (todas las páginas).
 * Barra con zoom, imprimir y descargar.
 * `src` puede ser una URL o un File/Blob (vista previa antes de subir).
 * pdf.js se carga solo cuando hace falta, para no pesar en el resto de la app.
 */
export default function PdfViewer({ src, nombre = 'documento.pdf', alto = 'max-h-[60vh]', className = '' }) {
  const scrollRef = useRef(null)
  const paginasRef = useRef(null)
  const [doc, setDoc] = useState(null)
  const [estado, setEstado] = useState('cargando')
  const [zoom, setZoom] = useState(1)
  const [ocupado, setOcupado] = useState('')

  // 1. Cargar el documento
  useEffect(() => {
    if (!src) return
    let cancelado = false
    let cargado = null
    setEstado('cargando')
    setDoc(null)
    setZoom(1)
    ;(async () => {
      const pdfjs = await cargarPdfjs()
      const params = src instanceof Blob ? { data: new Uint8Array(await src.arrayBuffer()) } : { url: src }
      cargado = await pdfjs.getDocument(params).promise
      if (cancelado) return cargado.destroy()
      setDoc(cargado)
    })().catch(() => {
      if (!cancelado) setEstado('error')
    })
    return () => {
      cancelado = true
      cargado?.destroy()
    }
  }, [src])

  // 2. Dibujar las páginas (y redibujar al cambiar el zoom, para que se vea nítido)
  useEffect(() => {
    if (!doc) return
    let cancelado = false
    const cont = paginasRef.current
    const anchoBase = Math.max((scrollRef.current?.clientWidth || 600) - 24, 240)
    const ancho = Math.round(anchoBase * zoom)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const paginas = Math.min(doc.numPages, MAX_PAGINAS)

    ;(async () => {
      for (let i = 1; i <= paginas; i++) {
        const page = await doc.getPage(i)
        if (cancelado) return
        const escala = ancho / page.getViewport({ scale: 1 }).width
        const viewport = page.getViewport({ scale: escala * dpr })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = `${ancho}px`
        canvas.className = 'mx-auto mb-3 block rounded-xl bg-white shadow-soft last:mb-0'
        canvas.setAttribute('aria-label', `Página ${i} de ${doc.numPages}`)
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        if (cancelado) return
        if (i === 1) {
          cont.replaceChildren(canvas)
          setEstado('listo')
        } else {
          cont.appendChild(canvas)
        }
      }
    })().catch(() => {
      if (!cancelado) setEstado('error')
    })
    return () => {
      cancelado = true
    }
  }, [doc, zoom])

  function cambiarZoom(delta) {
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100)))
  }

  async function descargar() {
    setOcupado('descargar')
    try {
      const blob = await obtenerBlob(src)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombre.toLowerCase().endsWith('.pdf') ? nombre : `${nombre}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      if (typeof src === 'string') window.open(src, '_blank', 'noopener')
    } finally {
      setOcupado('')
    }
  }

  // Imprime las páginas ya dibujadas: funciona igual en PC, Android y iPhone.
  function imprimir() {
    const canvases = paginasRef.current?.querySelectorAll('canvas') || []
    if (canvases.length === 0) return
    const ventana = window.open('', '_blank')
    if (!ventana) return
    const imgs = Array.from(canvases)
      .map((c) => `<img src="${c.toDataURL('image/png')}" />`)
      .join('')
    ventana.document.write(`<!doctype html><html><head><title>${nombre.replace(/</g, '')}</title>
      <style>@page{margin:0}body{margin:0}img{display:block;width:100%;page-break-after:always}img:last-child{page-break-after:auto}</style>
      <script>window.onload=function(){window.focus();window.print()}<\/script>
      </head><body>${imgs}</body></html>`)
    ventana.document.close()
  }

  const btn =
    'flex h-9 min-w-9 items-center justify-center rounded-full bg-white px-3 text-sm font-bold text-ink/80 shadow-sm ring-1 ring-ink/10 transition-colors hover:bg-sky-50 hover:text-sky-700 disabled:opacity-40'

  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl bg-sky-50/70 ring-1 ring-ink/5 ${className}`}>
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/5 bg-white/80 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <button type="button" className={btn} onClick={() => cambiarZoom(-ZOOM_PASO)} disabled={!doc || zoom <= ZOOM_MIN} aria-label="Alejar" title="Alejar">
            −
          </button>
          <button
            type="button"
            className={`${btn} w-16`}
            onClick={() => setZoom(1)}
            disabled={!doc}
            aria-label="Ajustar al ancho"
            title="Ajustar al ancho"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" className={btn} onClick={() => cambiarZoom(ZOOM_PASO)} disabled={!doc || zoom >= ZOOM_MAX} aria-label="Acercar" title="Acercar">
            +
          </button>
          {doc && <span className="ml-1 hidden text-xs font-bold text-ink/65 sm:inline">{doc.numPages} pág.</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" className={btn} onClick={imprimir} disabled={estado !== 'listo'}>
            🖨️ <span className="ml-1 hidden sm:inline">Imprimir</span>
          </button>
          <button type="button" className={btn} onClick={descargar} disabled={ocupado === 'descargar'}>
            ⬇️ <span className="ml-1 hidden sm:inline">{ocupado === 'descargar' ? 'Descargando…' : 'Descargar'}</span>
          </button>
        </div>
      </div>

      {/* Páginas */}
      <div ref={scrollRef} className={`overflow-auto p-3 ${alto}`}>
        {estado === 'cargando' && (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-sm font-bold text-ink/65">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-400" />
            Cargando PDF…
          </div>
        )}
        {estado === 'error' && (
          <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-center text-sm text-ink/70">
            <span className="text-3xl">📄</span>
            <p className="font-bold">No se pudo mostrar el PDF aquí.</p>
            {typeof src === 'string' && (
              <a href={src} target="_blank" rel="noreferrer" className="font-bold text-sky-600 hover:underline">
                Abrirlo en otra pestaña
              </a>
            )}
          </div>
        )}
        <div ref={paginasRef} className="w-max min-w-full" />
        {estado === 'listo' && doc?.numPages > MAX_PAGINAS && (
          <p className="mt-2 text-center text-xs text-ink/65">
            Se muestran las primeras {MAX_PAGINAS} de {doc.numPages} páginas. Descarga el PDF para verlo completo.
          </p>
        )}
      </div>
    </div>
  )
}
