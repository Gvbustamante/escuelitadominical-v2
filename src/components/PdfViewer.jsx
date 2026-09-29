import { useEffect, useRef, useState } from 'react'

const MAX_PAGINAS = 60

/**
 * Muestra un PDF con el estilo de la plataforma (hojas blancas sobre fondo claro)
 * en vez del visor oscuro del navegador. Funciona igual en iPhone (todas las páginas).
 * `src` puede ser una URL o un File/Blob (vista previa antes de subir).
 * pdf.js se carga solo cuando hace falta, para no pesar en el resto de la app.
 */
export default function PdfViewer({ src, alto = 'max-h-[60vh]', className = '' }) {
  const paginasRef = useRef(null)
  const [estado, setEstado] = useState('cargando')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!src) return
    let cancelado = false
    let doc = null
    setEstado('cargando')
    setTotal(0)
    const cont = paginasRef.current
    if (cont) cont.innerHTML = ''

    ;(async () => {
      const pdfjs = await import('pdfjs-dist')
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default

      const params = src instanceof Blob ? { data: new Uint8Array(await src.arrayBuffer()) } : { url: src }
      doc = await pdfjs.getDocument(params).promise
      if (cancelado) return
      setTotal(doc.numPages)

      const ancho = Math.max((cont?.clientWidth || 600) - 24, 240)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const paginas = Math.min(doc.numPages, MAX_PAGINAS)

      for (let i = 1; i <= paginas; i++) {
        const page = await doc.getPage(i)
        if (cancelado) return
        const escala = ancho / page.getViewport({ scale: 1 }).width
        const viewport = page.getViewport({ scale: escala * dpr })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = `${ancho}px`
        canvas.style.maxWidth = '100%'
        canvas.className = 'mx-auto mb-3 block rounded-xl bg-white shadow-soft last:mb-0'
        canvas.setAttribute('aria-label', `Página ${i} de ${doc.numPages}`)
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        if (cancelado) return
        cont.appendChild(canvas)
        if (i === 1) setEstado('listo')
      }
    })().catch(() => {
      if (!cancelado) setEstado('error')
    })

    return () => {
      cancelado = true
      doc?.destroy()
    }
  }, [src])

  const url = typeof src === 'string' ? src : null

  return (
    <div className={`relative overflow-y-auto rounded-2xl bg-sky-50/70 p-3 ring-1 ring-ink/5 ${alto} ${className}`}>
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
          {url && (
            <a href={url} target="_blank" rel="noreferrer" className="font-bold text-sky-600 hover:underline">
              Abrirlo en otra pestaña
            </a>
          )}
        </div>
      )}
      <div ref={paginasRef} />
      {estado === 'listo' && total > MAX_PAGINAS && (
        <p className="mt-2 text-center text-xs text-ink/65">
          Se muestran las primeras {MAX_PAGINAS} de {total} páginas. Abre el PDF para verlo completo.
        </p>
      )}
    </div>
  )
}
