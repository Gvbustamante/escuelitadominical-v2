import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import Skeleton from './Skeleton'
import FilePreview from './FilePreview'
import { getFileIcon } from './FilePreview'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function storageUrl(bucket, path) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

function mesAnio(fecha) {
  if (!fecha) return null
  const d = new Date(fecha + (fecha.length <= 10 ? 'T00:00:00' : ''))
  return { year: d.getFullYear(), month: d.getMonth() }
}

function fechaCorta(fecha) {
  if (!fecha) return null
  const s = fecha.length > 10 ? fecha.slice(0, 10) : fecha
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

function tipoDeArchivo(mime, nombre, esEnlace) {
  if (esEnlace) return 'Enlace'
  if (mime?.startsWith('image/')) return 'Imagen'
  if (mime?.startsWith('video/')) return 'Video'
  if (mime?.startsWith('audio/')) return 'Audio'
  if (mime?.includes('pdf')) return 'PDF'
  if (mime?.includes('word') || mime?.includes('document')) return 'Documento'
  if (mime?.includes('sheet') || mime?.includes('excel')) return 'Hoja de cálculo'
  if (mime?.includes('presentation') || mime?.includes('powerpoint')) return 'Presentación'
  if (nombre) {
    const ext = nombre.split('.').pop()?.toLowerCase()
    const map = { pdf: 'PDF', doc: 'Documento', docx: 'Documento', xls: 'Hoja de cálculo', xlsx: 'Hoja de cálculo', ppt: 'Presentación', pptx: 'Presentación', mp4: 'Video', mov: 'Video', mp3: 'Audio', wav: 'Audio', jpg: 'Imagen', jpeg: 'Imagen', png: 'Imagen', gif: 'Imagen', webp: 'Imagen', svg: 'Imagen' }
    if (map[ext]) return map[ext]
  }
  return 'Archivo'
}

const SECCIONES = [
  { key: 'actividades_ninos', label: 'Actividades Niños', icon: '🎨', color: 'sky' },
  { key: 'actividades_docentes', label: 'Actividades Docentes', icon: '🍎', color: 'sky' },
  { key: 'devocionales', label: 'Devocionales', icon: '📖', color: 'grape' },
  { key: 'tareas_ninos', label: 'Tareas Niños', icon: '📝', color: 'sunshine' },
  { key: 'tareas_docentes', label: 'Tareas Docentes', icon: '📝', color: 'sunshine' },
  { key: 'entregas_ninos', label: 'Entregas Niños', icon: '✅', color: 'grass' },
  { key: 'entregas_docentes', label: 'Entregas Docentes', icon: '✅', color: 'grass' },
  { key: 'bitacora', label: 'Bitácora', icon: '📋', color: 'grass' },
  { key: 'materiales', label: 'Materiales', icon: '🧩', color: 'sunshine' },
  { key: 'hojas_vida', label: 'Hojas de vida', icon: '📄', color: 'coral' },
]

const FOLDER_COLORS = {
  sky: { bg: 'bg-sky-50', fill: '#38bdf8', ring: 'ring-sky-300' },
  grape: { bg: 'bg-purple-50', fill: '#a78bfa', ring: 'ring-purple-300' },
  grass: { bg: 'bg-emerald-50', fill: '#34d399', ring: 'ring-emerald-300' },
  sunshine: { bg: 'bg-amber-50', fill: '#fbbf24', ring: 'ring-amber-300' },
  coral: { bg: 'bg-rose-50', fill: '#f97066', ring: 'ring-rose-300' },
}

function flattenFiles(node) {
  if (!node) return []
  if (Array.isArray(node)) return node.filter(a => a.url && !a.esEnlace && !a.soloInfo)
  const result = []
  for (const v of Object.values(node)) result.push(...flattenFiles(v))
  return result
}

export default function DriveOrganizado() {
  const [datos, setDatos] = useState(null)
  const [ruta, setRuta] = useState([])
  const [seleccion, setSeleccion] = useState(new Set())
  const [preview, setPreview] = useState(null)
  const [descargando, setDescargando] = useState(false)
  const [progresoDesc, setProgresoDesc] = useState('')

  useEffect(() => {
    async function load() {
      const [acts, actArchivos, devos, devoArchivos, bitacoras, bitaFotos, mats, matFotos, perfiles, entregas, entregaArchivos, ninos] = await Promise.all([
        supabase.from('actividades').select('id, titulo, fecha, imagen_url, enlace_externo, audiencia, es_tarea, nivel_id, docente_id, nivel:niveles(nombre)').order('fecha', { ascending: false }),
        supabase.from('actividad_archivos').select('id, actividad_id, storage_path, nombre_archivo, tipo, bucket'),
        supabase.from('devocionales_ninos').select('id, titulo, fecha, imagen_url, enlace_externo, nivel_id, creado_por, nivel:niveles(nombre)').order('fecha', { ascending: false }),
        supabase.from('devocional_archivos').select('id, devocional_id, storage_path, nombre_archivo, tipo, bucket'),
        supabase.from('bitacora_clase').select('id, fecha, momento, nivel_id, docente_id, nivel:niveles(nombre), salon_foto_url, refrigerio_foto_url').order('fecha', { ascending: false }),
        supabase.from('bitacora_fotos').select('id, bitacora_id, storage_path, nombre_archivo, mime, tipo'),
        supabase.from('materiales').select('id, nombre, foto_url, created_at'),
        supabase.from('material_fotos').select('id, material_id, storage_path, nombre_archivo, tipo'),
        supabase.from('profiles').select('id, nombre_completo, hoja_vida_url, role'),
        supabase.from('tarea_entregas').select('id, actividad_id, nino_id, docente_id, estado, archivo_url, entregado_at, actividad:actividades(titulo, fecha, audiencia, nivel_id, nivel:niveles(nombre))').eq('estado', 'entregada'),
        supabase.from('tarea_entrega_archivos').select('id, entrega_id, storage_path, nombre_archivo, tipo'),
        supabase.from('ninos').select('id, nombre_completo'),
      ])
      setDatos({
        actividades: acts.data || [], actividadArchivos: actArchivos.data || [],
        devocionales: devos.data || [], devocionalArchivos: devoArchivos.data || [],
        bitacoras: bitacoras.data || [], bitacoraFotos: bitaFotos.data || [], materiales: mats.data || [],
        materialFotos: matFotos.data || [], perfiles: perfiles.data || [], entregas: entregas.data || [],
        entregaArchivos: entregaArchivos.data || [], ninos: ninos.data || [],
      })
    }
    load()
  }, [])

  const archivosOrganizados = useMemo(() => {
    if (!datos) return null
    const result = {}
    const ninosMap = Object.fromEntries(datos.ninos.map(n => [n.id, n.nombre_completo]))
    const docentesMap = Object.fromEntries(datos.perfiles.map(p => [p.id, p.nombre_completo]))

    for (const aud of ['ninos', 'docentes']) {
      const items = []
      for (const act of datos.actividades) {
        if (act.audiencia !== aud || act.es_tarea) continue
        const ma = mesAnio(act.fecha)
        if (!ma) continue
        const nivel = act.nivel?.nombre || 'Toda la escuelita'
        const quien = docentesMap[act.docente_id] || null
        if (act.imagen_url) items.push({ ...ma, nivel, nombre: `${act.titulo} — portada`, url: act.imagen_url, fuente: act.titulo, mime: 'image/*', subidoPor: quien, fecha: act.fecha, tipoArchivo: 'Imagen' })
        if (act.enlace_externo) items.push({ ...ma, nivel, nombre: `${act.titulo} — enlace`, url: act.enlace_externo, fuente: act.titulo, esEnlace: true, subidoPor: quien, fecha: act.fecha, tipoArchivo: 'Enlace' })
        const adjuntos = datos.actividadArchivos.filter(a => a.actividad_id === act.id)
        for (const a of adjuntos) {
          items.push({ ...ma, nivel, nombre: a.nombre_archivo || a.storage_path.split('/').pop(), url: storageUrl(a.bucket || 'actividades', a.storage_path), fuente: act.titulo, mime: a.tipo, subidoPor: quien, fecha: act.fecha, tipoArchivo: tipoDeArchivo(a.tipo, a.nombre_archivo) })
        }
      }
      result[`actividades_${aud}`] = agruparPorMesYNivel(items)
    }

    for (const aud of ['ninos', 'docentes']) {
      const items = []
      for (const act of datos.actividades) {
        if (act.audiencia !== aud || !act.es_tarea) continue
        const ma = mesAnio(act.fecha)
        if (!ma) continue
        const nivel = act.nivel?.nombre || 'Toda la escuelita'
        const quien = docentesMap[act.docente_id] || null
        if (act.imagen_url) items.push({ ...ma, nivel, nombre: `${act.titulo} — archivo`, url: act.imagen_url, fuente: act.titulo, mime: 'image/*', subidoPor: quien, fecha: act.fecha, tipoArchivo: 'Imagen' })
        if (act.enlace_externo) items.push({ ...ma, nivel, nombre: `${act.titulo} — enlace`, url: act.enlace_externo, fuente: act.titulo, esEnlace: true, subidoPor: quien, fecha: act.fecha, tipoArchivo: 'Enlace' })
        const adjuntos = datos.actividadArchivos.filter(a => a.actividad_id === act.id)
        for (const a of adjuntos) {
          items.push({ ...ma, nivel, nombre: a.nombre_archivo || a.storage_path.split('/').pop(), url: storageUrl(a.bucket || 'actividades', a.storage_path), fuente: act.titulo, mime: a.tipo, subidoPor: quien, fecha: act.fecha, tipoArchivo: tipoDeArchivo(a.tipo, a.nombre_archivo) })
        }
        if (!act.imagen_url && !act.enlace_externo && adjuntos.length === 0) items.push({ ...ma, nivel, nombre: act.titulo, fuente: 'Tarea', soloInfo: true, subidoPor: quien, fecha: act.fecha, tipoArchivo: 'Tarea' })
      }
      result[`tareas_${aud}`] = agruparPorMesYNivel(items)
    }

    for (const aud of ['ninos', 'docentes']) {
      const items = []
      for (const e of datos.entregas) {
        if (e.actividad?.audiencia !== aud) continue
        const fechaStr = e.entregado_at?.slice(0, 10) || e.actividad?.fecha
        const ma = mesAnio(fechaStr)
        if (!ma) continue
        const nivel = e.actividad?.nivel?.nombre || 'Toda la escuelita'
        const quien = aud === 'ninos' ? (ninosMap[e.nino_id] || 'Niño') : (docentesMap[e.docente_id] || 'Docente')
        if (e.archivo_url) items.push({ ...ma, nivel, nombre: `${e.actividad?.titulo} — ${quien}`, url: e.archivo_url, fuente: `Entrega de ${quien}`, mime: null, subidoPor: quien, fecha: fechaStr, tipoArchivo: tipoDeArchivo(null, e.archivo_url) })
        const archivos = datos.entregaArchivos.filter(a => a.entrega_id === e.id)
        for (const a of archivos) {
          items.push({ ...ma, nivel, nombre: a.nombre_archivo || `${e.actividad?.titulo} — ${quien}`, url: storageUrl('actividades', a.storage_path), fuente: `Entrega de ${quien}`, mime: a.tipo, subidoPor: quien, fecha: fechaStr, tipoArchivo: tipoDeArchivo(a.tipo, a.nombre_archivo) })
        }
        if (!e.archivo_url && archivos.length === 0) items.push({ ...ma, nivel, nombre: `${e.actividad?.titulo} — ${quien}`, fuente: 'Sin archivo', soloInfo: true, subidoPor: quien, fecha: fechaStr, tipoArchivo: 'Entrega' })
      }
      result[`entregas_${aud}`] = agruparPorMesYNivel(items)
    }

    const devoItems = []
    for (const d of datos.devocionales) {
      const ma = mesAnio(d.fecha)
      if (!ma) continue
      const nivel = d.nivel?.nombre || 'Toda la escuelita'
      const quien = docentesMap[d.creado_por] || null
      if (d.imagen_url) devoItems.push({ ...ma, nivel, nombre: `${d.titulo} — imagen`, url: d.imagen_url, fuente: d.titulo, mime: 'image/*', subidoPor: quien, fecha: d.fecha, tipoArchivo: 'Imagen' })
      if (d.enlace_externo) devoItems.push({ ...ma, nivel, nombre: `${d.titulo} — enlace`, url: d.enlace_externo, fuente: d.titulo, esEnlace: true, subidoPor: quien, fecha: d.fecha, tipoArchivo: 'Enlace' })
      const archivos = datos.devocionalArchivos.filter(a => a.devocional_id === d.id)
      for (const a of archivos) {
        devoItems.push({ ...ma, nivel, nombre: a.nombre_archivo || a.storage_path.split('/').pop(), url: storageUrl(a.bucket || 'actividades', a.storage_path), fuente: d.titulo, mime: a.tipo, subidoPor: quien, fecha: d.fecha, tipoArchivo: tipoDeArchivo(a.tipo, a.nombre_archivo) })
      }
    }
    result.devocionales = agruparPorMesYNivel(devoItems)

    const bitItems = []
    for (const b of datos.bitacoras) {
      const ma = mesAnio(b.fecha)
      if (!ma) continue
      const nivel = b.nivel?.nombre || 'Clase'
      const label = `${nivel} — ${b.momento}`
      const quien = docentesMap[b.docente_id] || null
      if (b.salon_foto_url) bitItems.push({ ...ma, nivel, nombre: `${label} — salón`, url: b.salon_foto_url, fuente: label, mime: 'image/*', subidoPor: quien, fecha: b.fecha, tipoArchivo: 'Imagen' })
      if (b.refrigerio_foto_url) bitItems.push({ ...ma, nivel, nombre: `${label} — refrigerio`, url: b.refrigerio_foto_url, fuente: label, mime: 'image/*', subidoPor: quien, fecha: b.fecha, tipoArchivo: 'Imagen' })
      const fotos = datos.bitacoraFotos.filter(f => f.bitacora_id === b.id)
      for (const f of fotos) {
        bitItems.push({ ...ma, nivel, nombre: f.nombre_archivo || f.storage_path.split('/').pop(), url: storageUrl('actividades', f.storage_path), fuente: label, mime: f.mime, subidoPor: quien, fecha: b.fecha, tipoArchivo: tipoDeArchivo(f.mime, f.nombre_archivo) })
      }
    }
    result.bitacora = agruparPorMesYNivel(bitItems)

    const matItems = []
    for (const m of datos.materiales) {
      const ma = mesAnio(m.created_at?.slice(0, 10))
      if (!ma) continue
      const fechaMat = m.created_at?.slice(0, 10)
      if (m.foto_url) matItems.push({ ...ma, nombre: `${m.nombre} — foto`, url: m.foto_url, fuente: m.nombre, mime: 'image/*', fecha: fechaMat, tipoArchivo: 'Imagen' })
      const fotos = datos.materialFotos.filter(f => f.material_id === m.id)
      for (const f of fotos) {
        matItems.push({ ...ma, nombre: f.nombre_archivo || f.storage_path.split('/').pop(), url: storageUrl('actividades', f.storage_path), fuente: m.nombre, mime: f.tipo, fecha: fechaMat, tipoArchivo: tipoDeArchivo(f.tipo, f.nombre_archivo) })
      }
    }
    result.materiales = agruparPorMes(matItems)

    result.hojas_vida = datos.perfiles.filter(p => p.hoja_vida_url).map(p => ({
      nombre: `${p.nombre_completo} — Hoja de vida`, url: p.hoja_vida_url, fuente: p.nombre_completo, mime: null, subidoPor: p.nombre_completo, tipoArchivo: tipoDeArchivo(null, p.hoja_vida_url),
    }))

    return result
  }, [datos])

  if (!datos) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
        </div>
      </div>
    )
  }

  function navegar(key) {
    setRuta(prev => [...prev, key])
    setSeleccion(new Set())
  }

  function irA(index) {
    setRuta(prev => prev.slice(0, index))
    setSeleccion(new Set())
  }

  function toggleSel(i) {
    setSeleccion(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function getContenido() {
    if (!archivosOrganizados) return { carpetas: [], archivos: [] }

    if (ruta.length === 0) {
      const carpetas = SECCIONES.map(sec => ({
        ...sec, count: flattenFiles(archivosOrganizados[sec.key]).length,
      }))
      return { carpetas, archivos: [] }
    }

    const secKey = ruta[0]
    const sec = SECCIONES.find(s => s.key === secKey)
    const data = archivosOrganizados[secKey]
    if (!data) return { carpetas: [], archivos: [] }

    if (secKey === 'hojas_vida') {
      return { carpetas: [], archivos: (data || []).filter(a => a.url) }
    }

    if (secKey === 'materiales') {
      if (ruta.length === 1) {
        return { carpetas: Object.keys(data).sort((a, b) => b - a).map(y => ({ key: y, label: y, icon: '📅', color: sec.color, count: flattenFiles(data[y]).length })), archivos: [] }
      }
      if (ruta.length === 2) {
        const yearData = data[ruta[1]] || {}
        return { carpetas: Object.keys(yearData).sort((a, b) => b - a).map(m => ({ key: m, label: MESES[m], icon: '📅', color: sec.color, count: (yearData[m] || []).filter(a => a.url && !a.esEnlace && !a.soloInfo).length })), archivos: [] }
      }
      return { carpetas: [], archivos: (data[ruta[1]]?.[ruta[2]] || []).filter(a => !a.soloInfo) }
    }

    if (ruta.length === 1) {
      const niveles = Object.keys(data).sort((a, b) => {
        if (a === 'Toda la escuelita') return -1
        if (b === 'Toda la escuelita') return 1
        return a.localeCompare(b)
      })
      return { carpetas: niveles.map(n => ({ key: n, label: n, icon: '📚', color: sec.color, count: flattenFiles(data[n]).length })), archivos: [] }
    }
    if (ruta.length === 2) {
      const nivelData = data[ruta[1]] || {}
      return { carpetas: Object.keys(nivelData).sort((a, b) => b - a).map(y => ({ key: y, label: y, icon: '📅', color: sec.color, count: flattenFiles(nivelData[y]).length })), archivos: [] }
    }
    if (ruta.length === 3) {
      const yearData = data[ruta[1]]?.[ruta[2]] || {}
      return { carpetas: Object.keys(yearData).sort((a, b) => b - a).map(m => ({ key: m, label: MESES[m], icon: '📅', color: sec.color, count: (yearData[m] || []).filter(a => a.url && !a.esEnlace && !a.soloInfo).length })), archivos: [] }
    }
    return { carpetas: [], archivos: (data[ruta[1]]?.[ruta[2]]?.[ruta[3]] || []).filter(a => !a.soloInfo) }
  }

  function getBreadcrumbs() {
    const crumbs = [{ label: 'Drive', icon: '📁' }]
    if (ruta.length === 0) return crumbs
    const sec = SECCIONES.find(s => s.key === ruta[0])
    crumbs.push({ label: sec?.label || ruta[0], icon: sec?.icon })
    const sinNivel = ruta[0] === 'materiales'
    if (ruta[0] === 'hojas_vida' || ruta.length < 2) return crumbs
    if (sinNivel) {
      if (ruta.length >= 2) crumbs.push({ label: ruta[1] })
      if (ruta.length >= 3) crumbs.push({ label: MESES[parseInt(ruta[2])] || ruta[2] })
    } else {
      if (ruta.length >= 2) crumbs.push({ label: ruta[1] })
      if (ruta.length >= 3) crumbs.push({ label: ruta[2] })
      if (ruta.length >= 4) crumbs.push({ label: MESES[parseInt(ruta[3])] || ruta[3] })
    }
    return crumbs
  }

  async function descargarArchivo(url, nombre) {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = nombre || 'archivo'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  async function descargarZip(archivos, nombreZip) {
    if (!archivos || archivos.length === 0) return
    if (archivos.length === 1) return descargarArchivo(archivos[0].url, archivos[0].nombre)
    setDescargando(true)
    setProgresoDesc('Preparando archivos...')
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const usedNames = new Set()
      for (let i = 0; i < archivos.length; i++) {
        const a = archivos[i]
        if (!a.url) continue
        setProgresoDesc(`Descargando ${i + 1} de ${archivos.length}...`)
        try {
          const response = await fetch(a.url)
          const blob = await response.blob()
          let name = a.nombre || `archivo-${i + 1}`
          while (usedNames.has(name)) name = `${i + 1}-${name}`
          usedNames.add(name)
          zip.file(name, blob)
        } catch { /* skip failed files */ }
      }
      setProgresoDesc('Generando ZIP...')
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = `${nombreZip}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Error ZIP', e)
    }
    setDescargando(false)
    setProgresoDesc('')
  }

  function descargarCarpeta(carpetaKey) {
    let node
    if (ruta.length === 0) {
      node = archivosOrganizados[carpetaKey]
    } else {
      const secKey = ruta[0]
      node = archivosOrganizados[secKey]
      for (let i = 1; i < ruta.length; i++) {
        if (node && typeof node === 'object' && !Array.isArray(node)) node = node[ruta[i]]
        else { node = null; break }
      }
      if (node && typeof node === 'object' && !Array.isArray(node)) node = node[carpetaKey]
    }
    const files = flattenFiles(node)
    const sec = SECCIONES.find(s => s.key === (ruta[0] || carpetaKey))
    descargarZip(files, sec?.label || carpetaKey)
  }

  function descargarSeleccionados() {
    const { archivos } = getContenido()
    const descargables = archivos.filter(a => a.url && !a.esEnlace)
    const selected = descargables.filter((_, i) => seleccion.has(i))
    const crumbs = getBreadcrumbs()
    descargarZip(selected, crumbs[crumbs.length - 1]?.label || 'archivos')
  }

  const { carpetas, archivos } = getContenido()
  const archivosDescargables = archivos.filter(a => a.url && !a.esEnlace)
  const crumbs = getBreadcrumbs()

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-ink/20">/</span>}
            {i < crumbs.length - 1 ? (
              <button onClick={() => irA(i)} className="font-bold text-sky-600 hover:text-sky-700 hover:underline">
                {c.icon && <span className="mr-0.5">{c.icon}</span>}{c.label}
              </button>
            ) : (
              <span className="font-bold text-ink/70">
                {c.icon && <span className="mr-0.5">{c.icon}</span>}{c.label}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Toolbar */}
      {archivos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {archivosDescargables.length > 0 && (
            <button
              onClick={() => {
                if (seleccion.size === archivosDescargables.length) setSeleccion(new Set())
                else setSeleccion(new Set(archivosDescargables.map((_, i) => i)))
              }}
              className="rounded-xl bg-ink/5 px-3 py-1.5 text-xs font-bold text-ink/50 hover:bg-ink/10"
            >
              {seleccion.size === archivosDescargables.length && seleccion.size > 0 ? '☑ Deseleccionar' : '☐ Seleccionar todos'}
            </button>
          )}
          {seleccion.size > 0 && (
            <button onClick={descargarSeleccionados} className="rounded-xl bg-sky-400 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500">
              📥 Descargar {seleccion.size} como ZIP
            </button>
          )}
          {archivosDescargables.length > 1 && seleccion.size === 0 && (
            <button
              onClick={() => descargarZip(archivosDescargables, crumbs[crumbs.length - 1]?.label || 'archivos')}
              className="rounded-xl bg-ink/5 px-3 py-1.5 text-xs font-bold text-ink/50 hover:bg-ink/10"
            >
              📥 Descargar todo ({archivosDescargables.length})
            </button>
          )}
          <span className="text-xs text-ink/30">{archivos.length} archivo{archivos.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Folder grid */}
      {carpetas.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {carpetas.map(c => (
            <FolderCard
              key={c.key}
              folder={c}
              onClick={() => navegar(c.key)}
              onDownload={c.count > 0 ? () => descargarCarpeta(c.key) : null}
            />
          ))}
        </div>
      )}

      {/* File grid */}
      {archivos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {archivos.map((a, i) => {
            const canSelect = a.url && !a.esEnlace
            const selIdx = canSelect ? archivosDescargables.indexOf(a) : -1
            return (
              <FileCard
                key={i}
                archivo={a}
                selected={selIdx >= 0 && seleccion.has(selIdx)}
                onToggle={selIdx >= 0 ? () => toggleSel(selIdx) : null}
                onPreview={a.url && !a.esEnlace ? () => setPreview({ url: a.url, nombre: a.nombre, mime: a.mime }) : null}
                onDownload={a.url && !a.esEnlace ? () => descargarArchivo(a.url, a.nombre) : null}
                onOpenLink={a.esEnlace ? () => window.open(a.url, '_blank') : null}
              />
            )
          })}
        </div>
      )}

      {/* Empty */}
      {carpetas.length === 0 && archivos.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-6xl opacity-30">📂</span>
          <p className="font-bold text-ink/30">Esta carpeta está vacía</p>
          {ruta.length > 0 && (
            <button onClick={() => irA(ruta.length - 1)} className="rounded-xl bg-ink/5 px-4 py-2 text-sm font-bold text-ink/50 hover:bg-ink/10">
              ← Volver
            </button>
          )}
        </div>
      )}

      {/* Download overlay */}
      {descargando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="card flex flex-col items-center gap-4 px-12 py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-400 border-t-transparent" />
            <p className="text-sm font-bold text-ink/60">{progresoDesc}</p>
          </div>
        </div>
      )}

      <FilePreview open={!!preview} onClose={() => setPreview(null)} url={preview?.url} nombre={preview?.nombre} mime={preview?.mime} />
    </div>
  )
}

function FolderIcon({ color, size = 52 }) {
  return (
    <svg width={size} height={size * 0.78} viewBox="0 0 52 40" fill="none">
      <path d="M2 10C2 8.34 3.34 7 5 7H18L22 3H47C48.66 3 50 4.34 50 6V36C50 37.66 48.66 39 47 39H5C3.34 39 2 37.66 2 36V10Z" fill={color} opacity="0.15" />
      <path d="M2 14C2 12.34 3.34 11 5 11H47C48.66 11 50 12.34 50 14V36C50 37.66 48.66 39 47 39H5C3.34 39 2 37.66 2 36V14Z" fill={color} />
    </svg>
  )
}

function FolderCard({ folder, onClick, onDownload }) {
  const colors = FOLDER_COLORS[folder.color] || FOLDER_COLORS.sky
  return (
    <div
      className={`group relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-transparent bg-white p-4 pb-3 shadow-sm transition-all hover:-translate-y-1 hover:border-sky-200 hover:shadow-md`}
      onClick={onClick}
    >
      <div className="relative">
        <FolderIcon color={colors.fill} />
        {folder.count > 0 && (
          <span className="absolute -right-2 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sky-400 px-1 text-[10px] font-extrabold text-white">
            {folder.count}
          </span>
        )}
      </div>
      <p className="w-full truncate text-center text-sm font-bold text-ink/70">{folder.label}</p>
      <p className="text-[10px] text-ink/30">{folder.count || 0} archivo{folder.count !== 1 ? 's' : ''}</p>
      {onDownload && (
        <button
          onClick={(e) => { e.stopPropagation(); onDownload() }}
          className="absolute right-2 top-2 rounded-lg bg-ink/5 p-1.5 text-xs text-ink/30 opacity-0 transition-all hover:bg-sky-100 hover:text-sky-600 group-hover:opacity-100"
          title="Descargar como ZIP"
        >
          📥
        </button>
      )}
    </div>
  )
}

function FileCard({ archivo, selected, onToggle, onPreview, onDownload, onOpenLink }) {
  const esImagen = archivo.mime?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(archivo.nombre || '')
  const icon = archivo.esEnlace ? '🔗' : getFileIcon(archivo.nombre, archivo.mime)

  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${selected ? 'ring-2 ring-sky-400 ring-offset-1' : ''}`}>
      {/* Thumbnail area */}
      <div
        onClick={onPreview || onOpenLink}
        className="relative flex h-28 w-full cursor-pointer items-center justify-center bg-ink/[0.03] sm:h-32"
      >
        {esImagen && archivo.url ? (
          <img src={archivo.url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="text-4xl sm:text-5xl">{icon}</span>
        )}
        {/* Selection checkbox */}
        {onToggle && (
          <div
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            className={`absolute left-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border-2 text-xs font-bold transition-all ${selected ? 'border-sky-400 bg-sky-400 text-white' : 'border-white/80 bg-white/70 text-transparent hover:border-sky-300'}`}
          >
            {selected ? '✓' : ''}
          </div>
        )}
      </div>

      {/* File info */}
      <div className="flex flex-col gap-0.5 px-3 py-2">
        <p className="truncate text-xs font-bold text-ink/70" title={archivo.nombre}>{archivo.nombre}</p>
        <div className="flex items-center justify-between">
          <p className="truncate text-[10px] text-ink/30">
            {archivo.tipoArchivo || 'Archivo'}{archivo.fecha ? ` · ${fechaCorta(archivo.fecha)}` : ''}
          </p>
          <div className="flex shrink-0 items-center gap-0.5">
            {onDownload && (
              <button
                onClick={onDownload}
                className="rounded p-1 text-[10px] text-ink/20 opacity-0 transition-all hover:bg-sky-50 hover:text-sky-600 group-hover:opacity-100"
                title="Descargar"
              >
                ⬇️
              </button>
            )}
            {onOpenLink && (
              <button
                onClick={onOpenLink}
                className="rounded p-1 text-[10px] text-ink/30 hover:text-sky-600"
                title="Abrir enlace"
              >
                ↗️
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function agruparPorMes(items) {
  const grouped = {}
  for (const item of items) {
    const { year, month } = item
    if (!grouped[year]) grouped[year] = {}
    if (!grouped[year][month]) grouped[year][month] = []
    grouped[year][month].push(item)
  }
  return grouped
}

function agruparPorMesYNivel(items) {
  const grouped = {}
  for (const item of items) {
    const nivel = item.nivel || 'Toda la escuelita'
    if (!grouped[nivel]) grouped[nivel] = {}
    const { year, month } = item
    if (!grouped[nivel][year]) grouped[nivel][year] = {}
    if (!grouped[nivel][year][month]) grouped[nivel][year][month] = []
    grouped[nivel][year][month].push(item)
  }
  return grouped
}
