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
  { key: 'actividades_ninos', label: 'Actividades — Niños', icon: '🎨', color: 'sky' },
  { key: 'actividades_docentes', label: 'Actividades — Docentes', icon: '🍎', color: 'sky' },
  { key: 'devocionales', label: 'Devocionales', icon: '📖', color: 'grape' },
  { key: 'tareas_ninos', label: 'Tareas — Niños', icon: '📝', color: 'sunshine' },
  { key: 'tareas_docentes', label: 'Tareas — Docentes', icon: '📝', color: 'sunshine' },
  { key: 'entregas_ninos', label: 'Entregas — Niños', icon: '✅', color: 'grass' },
  { key: 'entregas_docentes', label: 'Entregas — Docentes', icon: '✅', color: 'grass' },
  { key: 'bitacora', label: 'Bitácora', icon: '📋', color: 'grass' },
  { key: 'materiales', label: 'Materiales', icon: '🧩', color: 'sunshine' },
  { key: 'hojas_vida', label: 'Hojas de vida', icon: '📄', color: 'coral' },
]

const SECTION_BG = { sky: 'bg-sky-50', grape: 'bg-grape-50', grass: 'bg-grass-50', sunshine: 'bg-sunshine-50', coral: 'bg-coral-50' }
const SECTION_TEXT = { sky: 'text-sky-700', grape: 'text-grape-700', grass: 'text-grass-700', sunshine: 'text-sunshine-700', coral: 'text-coral-700' }

export default function DriveOrganizado() {
  const [datos, setDatos] = useState(null)
  const [abierta, setAbierta] = useState(null)
  const [subAbierta, setSubAbierta] = useState(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    async function load() {
      const [acts, devos, devoArchivos, bitacoras, bitaFotos, mats, matFotos, perfiles, entregas, entregaArchivos, ninos] = await Promise.all([
        supabase.from('actividades').select('id, titulo, fecha, imagen_url, enlace_externo, audiencia, es_tarea, nivel_id, docente_id, nivel:niveles(nombre)').order('fecha', { ascending: false }),
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
        actividades: acts.data || [],
        devocionales: devos.data || [],
        devocionalArchivos: devoArchivos.data || [],
        bitacoras: bitacoras.data || [],
        bitacoraFotos: bitaFotos.data || [],
        materiales: mats.data || [],
        materialFotos: matFotos.data || [],
        perfiles: perfiles.data || [],
        entregas: entregas.data || [],
        entregaArchivos: entregaArchivos.data || [],
        ninos: ninos.data || [],
      })
    }
    load()
  }, [])

  const archivosOrganizados = useMemo(() => {
    if (!datos) return null
    const result = {}
    const ninosMap = Object.fromEntries(datos.ninos.map((n) => [n.id, n.nombre_completo]))
    const docentesMap = Object.fromEntries(datos.perfiles.map((p) => [p.id, p.nombre_completo]))

    // --- Actividades (split by audiencia: ninos / docentes) ---
    for (const aud of ['ninos', 'docentes']) {
      const items = []
      for (const act of datos.actividades) {
        if (act.audiencia !== aud) continue
        if (act.es_tarea) continue
        const ma = mesAnio(act.fecha)
        if (!ma) continue
        const nivel = act.nivel?.nombre || 'Toda la escuelita'
        const quien = docentesMap[act.docente_id] || null
        if (act.imagen_url) {
          items.push({ ...ma, nivel, nombre: `${act.titulo} — portada`, url: act.imagen_url, fuente: act.titulo, fuenteLink: `#/actividad/${act.id}`, mime: 'image/*', subidoPor: quien, fecha: act.fecha, tipoArchivo: 'Imagen' })
        }
        if (act.enlace_externo) {
          items.push({ ...ma, nivel, nombre: `${act.titulo} — enlace externo`, url: act.enlace_externo, fuente: act.titulo, fuenteLink: `#/actividad/${act.id}`, esEnlace: true, subidoPor: quien, fecha: act.fecha, tipoArchivo: 'Enlace' })
        }
      }
      result[`actividades_${aud}`] = agruparPorMesYNivel(items)
    }

    // --- Tareas (split by audiencia, only es_tarea=true) ---
    for (const aud of ['ninos', 'docentes']) {
      const items = []
      for (const act of datos.actividades) {
        if (act.audiencia !== aud || !act.es_tarea) continue
        const ma = mesAnio(act.fecha)
        if (!ma) continue
        const nivel = act.nivel?.nombre || 'Toda la escuelita'
        const quien = docentesMap[act.docente_id] || null
        if (act.imagen_url) {
          items.push({ ...ma, nivel, nombre: `${act.titulo} — archivo`, url: act.imagen_url, fuente: act.titulo, fuenteLink: `#/actividad/${act.id}`, mime: 'image/*', subidoPor: quien, fecha: act.fecha, tipoArchivo: 'Imagen' })
        }
        if (act.enlace_externo) {
          items.push({ ...ma, nivel, nombre: `${act.titulo} — enlace externo`, url: act.enlace_externo, fuente: act.titulo, fuenteLink: `#/actividad/${act.id}`, esEnlace: true, subidoPor: quien, fecha: act.fecha, tipoArchivo: 'Enlace' })
        }
        if (!act.imagen_url && !act.enlace_externo) {
          items.push({ ...ma, nivel, nombre: act.titulo, fuente: 'Tarea asignada', fuenteLink: `#/actividad/${act.id}`, soloInfo: true, subidoPor: quien, fecha: act.fecha, tipoArchivo: 'Tarea' })
        }
      }
      result[`tareas_${aud}`] = agruparPorMesYNivel(items)
    }

    // --- Entregas (split by audiencia from actividad) ---
    for (const aud of ['ninos', 'docentes']) {
      const items = []
      for (const e of datos.entregas) {
        if (e.actividad?.audiencia !== aud) continue
        const fechaStr = e.entregado_at?.slice(0, 10) || e.actividad?.fecha
        const ma = mesAnio(fechaStr)
        if (!ma) continue
        const nivel = e.actividad?.nivel?.nombre || 'Toda la escuelita'
        const quien = aud === 'ninos' ? (ninosMap[e.nino_id] || 'Niño') : (docentesMap[e.docente_id] || 'Docente')

        if (e.archivo_url) {
          items.push({ ...ma, nivel, nombre: `${e.actividad?.titulo} — ${quien}`, url: e.archivo_url, fuente: `Entrega de ${quien}`, mime: null, subidoPor: quien, fecha: fechaStr, tipoArchivo: tipoDeArchivo(null, e.archivo_url) })
        }
        const archivos = datos.entregaArchivos.filter((a) => a.entrega_id === e.id)
        for (const a of archivos) {
          items.push({
            ...ma, nivel,
            nombre: a.nombre_archivo || `${e.actividad?.titulo} — ${quien}`,
            url: storageUrl('actividades', a.storage_path),
            fuente: `Entrega de ${quien}`,
            mime: a.tipo,
            subidoPor: quien, fecha: fechaStr, tipoArchivo: tipoDeArchivo(a.tipo, a.nombre_archivo),
          })
        }
        if (!e.archivo_url && archivos.length === 0) {
          items.push({ ...ma, nivel, nombre: `${e.actividad?.titulo} — ${quien}`, fuente: 'Entregada (sin archivo)', soloInfo: true, subidoPor: quien, fecha: fechaStr, tipoArchivo: 'Entrega' })
        }
      }
      result[`entregas_${aud}`] = agruparPorMesYNivel(items)
    }

    // --- Devocionales (by nivel) ---
    const devoItems = []
    for (const d of datos.devocionales) {
      const ma = mesAnio(d.fecha)
      if (!ma) continue
      const nivel = d.nivel?.nombre || 'Toda la escuelita'
      const quien = docentesMap[d.creado_por] || null
      if (d.imagen_url) {
        devoItems.push({ ...ma, nivel, nombre: `${d.titulo} — imagen`, url: d.imagen_url, fuente: d.titulo, fuenteLink: `#/devocional/${d.id}`, mime: 'image/*', subidoPor: quien, fecha: d.fecha, tipoArchivo: 'Imagen' })
      }
      if (d.enlace_externo) {
        devoItems.push({ ...ma, nivel, nombre: `${d.titulo} — enlace externo`, url: d.enlace_externo, fuente: d.titulo, fuenteLink: `#/devocional/${d.id}`, esEnlace: true, subidoPor: quien, fecha: d.fecha, tipoArchivo: 'Enlace' })
      }
      const archivos = datos.devocionalArchivos.filter((a) => a.devocional_id === d.id)
      for (const a of archivos) {
        devoItems.push({
          ...ma, nivel,
          nombre: a.nombre_archivo || a.storage_path.split('/').pop(),
          url: storageUrl(a.bucket || 'actividades', a.storage_path),
          fuente: d.titulo,
          fuenteLink: `#/devocional/${d.id}`,
          mime: a.tipo,
          subidoPor: quien, fecha: d.fecha, tipoArchivo: tipoDeArchivo(a.tipo, a.nombre_archivo),
        })
      }
    }
    result.devocionales = agruparPorMesYNivel(devoItems)

    // --- Bitácora (by nivel) ---
    const bitItems = []
    for (const b of datos.bitacoras) {
      const ma = mesAnio(b.fecha)
      if (!ma) continue
      const nivel = b.nivel?.nombre || 'Clase'
      const label = `${nivel} — ${b.momento}`
      const quien = docentesMap[b.docente_id] || null

      if (b.salon_foto_url) {
        bitItems.push({ ...ma, nivel, nombre: `${label} — salón`, url: b.salon_foto_url, fuente: label, mime: 'image/*', subidoPor: quien, fecha: b.fecha, tipoArchivo: 'Imagen' })
      }
      if (b.refrigerio_foto_url) {
        bitItems.push({ ...ma, nivel, nombre: `${label} — refrigerio`, url: b.refrigerio_foto_url, fuente: label, mime: 'image/*', subidoPor: quien, fecha: b.fecha, tipoArchivo: 'Imagen' })
      }
      const fotos = datos.bitacoraFotos.filter((f) => f.bitacora_id === b.id)
      for (const f of fotos) {
        bitItems.push({
          ...ma, nivel,
          nombre: f.nombre_archivo || f.storage_path.split('/').pop(),
          url: storageUrl('actividades', f.storage_path),
          fuente: label,
          mime: f.mime,
          subidoPor: quien, fecha: b.fecha, tipoArchivo: tipoDeArchivo(f.mime, f.nombre_archivo),
        })
      }
    }
    result.bitacora = agruparPorMesYNivel(bitItems)

    // --- Materiales (no level, just year/month) ---
    const matItems = []
    for (const m of datos.materiales) {
      const ma = mesAnio(m.created_at?.slice(0, 10))
      if (!ma) continue
      const fechaMat = m.created_at?.slice(0, 10)
      if (m.foto_url) {
        matItems.push({ ...ma, nombre: `${m.nombre} — foto`, url: m.foto_url, fuente: m.nombre, mime: 'image/*', fecha: fechaMat, tipoArchivo: 'Imagen' })
      }
      const fotos = datos.materialFotos.filter((f) => f.material_id === m.id)
      for (const f of fotos) {
        matItems.push({
          ...ma,
          nombre: f.nombre_archivo || f.storage_path.split('/').pop(),
          url: storageUrl('actividades', f.storage_path),
          fuente: m.nombre,
          mime: f.tipo,
          fecha: fechaMat, tipoArchivo: tipoDeArchivo(f.tipo, f.nombre_archivo),
        })
      }
    }
    result.materiales = agruparPorMes(matItems)

    // --- Hojas de vida (flat) ---
    result.hojas_vida = datos.perfiles.filter((p) => p.hoja_vida_url).map((p) => ({
      nombre: `${p.nombre_completo} — Hoja de vida`,
      url: p.hoja_vida_url,
      fuente: p.nombre_completo,
      mime: null,
      subidoPor: p.nombre_completo, tipoArchivo: tipoDeArchivo(null, p.hoja_vida_url),
    }))

    return result
  }, [datos])

  if (!datos) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    )
  }

  function toggle(key) {
    setAbierta(abierta === key ? null : key)
    setSubAbierta(null)
  }

  function toggleSub(key) {
    setSubAbierta(subAbierta === key ? null : key)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink/50">
        Todos los archivos del sistema organizados por módulo, nivel y fecha. Sin duplicados — cada archivo enlaza al original.
      </p>

      {SECCIONES.map((sec) => {
        const items = archivosOrganizados?.[sec.key]
        const esFlat = sec.key === 'hojas_vida'
        const sinNivel = sec.key === 'materiales'
        const count = esFlat
          ? (items?.length || 0)
          : sinNivel
            ? contarEnMeses(items)
            : contarEnNivelMeses(items)
        const isOpen = abierta === sec.key

        return (
          <div key={sec.key} className="card !p-0 overflow-hidden">
            <button
              onClick={() => toggle(sec.key)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-ink/[0.02] ${isOpen ? SECTION_BG[sec.color] : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{sec.icon}</span>
                <span className={`font-bold ${isOpen ? SECTION_TEXT[sec.color] : ''}`}>{sec.label}</span>
                {count > 0 && <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-ink/40">{count}</span>}
              </div>
              <span className={`text-ink/30 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isOpen && (
              <div className="border-t border-ink/5">
                {count === 0 ? (
                  <p className="px-4 py-4 text-sm text-ink/30">Sin archivos aún.</p>
                ) : esFlat ? (
                  <ArchivoLista archivos={items} onPreview={setPreview} />
                ) : sinNivel ? (
                  <MesesArbol meses={items} subAbierta={subAbierta} onToggle={toggleSub} onPreview={setPreview} />
                ) : (
                  <NivelMesesArbol data={items} subAbierta={subAbierta} onToggle={toggleSub} onPreview={setPreview} />
                )}
              </div>
            )}
          </div>
        )
      })}

      <FilePreview open={!!preview} onClose={() => setPreview(null)} url={preview?.url} nombre={preview?.nombre} mime={preview?.mime} />
    </div>
  )
}

// --- Tree: Nivel → Year → Month → files ---
function NivelMesesArbol({ data, subAbierta, onToggle, onPreview }) {
  if (!data) return null
  const niveles = Object.keys(data).sort((a, b) => {
    if (a === 'Toda la escuelita') return -1
    if (b === 'Toda la escuelita') return 1
    return a.localeCompare(b)
  })
  return (
    <div className="flex flex-col">
      {niveles.map((nivel) => {
        const meses = data[nivel]
        const nivelKey = `nivel-${nivel}`
        const nivelOpen = subAbierta === nivelKey
        const nivelCount = contarEnMeses(meses)
        return (
          <div key={nivel}>
            <button
              onClick={() => onToggle(nivelKey)}
              className="flex w-full items-center justify-between bg-ink/[0.02] px-4 py-2 text-left text-sm font-bold text-ink/60 hover:bg-ink/[0.04]"
            >
              <span>📚 {nivel}</span>
              <span className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-ink/30">{nivelCount}</span>
                <span className={`text-ink/20 transition-transform ${nivelOpen ? 'rotate-180' : ''}`}>▼</span>
              </span>
            </button>
            {nivelOpen && <MesesArbolInner meses={meses} prefix={nivel} subAbierta={subAbierta} onToggle={onToggle} onPreview={onPreview} />}
          </div>
        )
      })}
    </div>
  )
}

// --- Tree: Year → Month → files (shared by both flat and nested) ---
function MesesArbol({ meses, subAbierta, onToggle, onPreview }) {
  return <MesesArbolInner meses={meses} prefix="" subAbierta={subAbierta} onToggle={onToggle} onPreview={onPreview} />
}

function MesesArbolInner({ meses, prefix, subAbierta, onToggle, onPreview }) {
  if (!meses) return null
  const years = Object.keys(meses).sort((a, b) => b - a)
  return (
    <div className="flex flex-col">
      {years.map((year) => {
        const monthKeys = Object.keys(meses[year]).sort((a, b) => b - a)
        return (
          <div key={year}>
            <p className="bg-ink/[0.02] px-6 py-1.5 text-xs font-extrabold uppercase text-ink/40">{year}</p>
            {monthKeys.map((month) => {
              const archivos = meses[year][month]
              const key = `${prefix}-${year}-${month}`
              const isOpen = subAbierta === key
              return (
                <div key={key}>
                  <button
                    onClick={() => onToggle(key)}
                    className="flex w-full items-center justify-between px-8 py-2 text-left text-sm font-bold text-ink/60 hover:bg-ink/[0.02]"
                  >
                    <span>📅 {MESES[month]}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-ink/30">{archivos.length} archivo{archivos.length !== 1 ? 's' : ''}</span>
                      <span className={`text-ink/20 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                    </span>
                  </button>
                  {isOpen && <ArchivoLista archivos={archivos} onPreview={onPreview} />}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function MetaLinea({ a }) {
  const parts = []
  if (a.subidoPor) parts.push(a.subidoPor)
  if (a.fecha) parts.push(fechaCorta(a.fecha))
  if (a.tipoArchivo) parts.push(a.tipoArchivo)
  if (parts.length === 0) return <p className="truncate text-[10px] text-ink/30">{a.fuente}</p>
  return (
    <p className="truncate text-[10px] text-ink/30">
      {parts.join(' · ')}{a.fuente ? ` — ${a.fuente}` : ''}
    </p>
  )
}

function ArchivoLista({ archivos, onPreview }) {
  return (
    <div className="flex flex-col divide-y divide-ink/5 bg-ink/[0.01]">
      {archivos.map((a, i) => {
        if (a.soloInfo) {
          return (
            <div key={i} className="flex items-center gap-3 px-8 py-2 text-sm sm:px-10">
              <span className="shrink-0 text-lg">📝</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink/50">{a.nombre}</p>
                <MetaLinea a={a} />
              </div>
              {a.fuenteLink && (
                <a href={a.fuenteLink} className="shrink-0 rounded-lg bg-ink/5 px-2 py-1 text-[10px] font-bold text-ink/40 hover:bg-sky-100 hover:text-sky-600">
                  Ver origen
                </a>
              )}
            </div>
          )
        }

        if (a.esEnlace) {
          return (
            <div key={i} className="flex items-center gap-3 px-8 py-2 text-sm sm:px-10">
              <span className="shrink-0 text-lg">🔗</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink/70">{a.nombre}</p>
                <MetaLinea a={a} />
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {a.fuenteLink && (
                  <a href={a.fuenteLink} className="rounded-lg bg-ink/5 px-2 py-1 text-[10px] font-bold text-ink/40 hover:bg-sky-100 hover:text-sky-600">
                    Ver origen
                  </a>
                )}
                <a href={a.url} target="_blank" rel="noreferrer" className="rounded-lg bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-600 hover:bg-sky-100">
                  Abrir enlace
                </a>
              </div>
            </div>
          )
        }

        const esImagen = a.mime?.startsWith('image/')
        const icon = esImagen ? '🖼️' : getFileIcon(a.nombre, a.mime)
        return (
          <div key={i} className="flex items-center gap-3 px-8 py-2 text-sm transition-colors hover:bg-sky-50/50 sm:px-10">
            <button
              onClick={() => onPreview({ url: a.url, nombre: a.nombre, mime: a.mime })}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <span className="shrink-0 text-lg">{icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink/70">{a.nombre}</p>
                <MetaLinea a={a} />
              </div>
            </button>
            <div className="flex shrink-0 items-center gap-1.5">
              {a.fuenteLink && (
                <a href={a.fuenteLink} className="rounded-lg bg-ink/5 px-2 py-1 text-[10px] font-bold text-ink/40 hover:bg-sky-100 hover:text-sky-600">
                  Ver origen
                </a>
              )}
              <a href={a.url} target="_blank" rel="noreferrer" className="rounded-lg bg-ink/5 px-2 py-1 text-[10px] font-bold text-ink/40 hover:bg-sky-100 hover:text-sky-600">
                Abrir
              </a>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- Grouping helpers ---

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

function contarEnMeses(meses) {
  if (!meses) return 0
  let c = 0
  for (const y of Object.values(meses)) {
    for (const arr of Object.values(y)) {
      c += arr.length
    }
  }
  return c
}

function contarEnNivelMeses(data) {
  if (!data) return 0
  let c = 0
  for (const meses of Object.values(data)) {
    c += contarEnMeses(meses)
  }
  return c
}
