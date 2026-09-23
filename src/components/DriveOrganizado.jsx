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
  const d = new Date(fecha + 'T00:00:00')
  return { year: d.getFullYear(), month: d.getMonth() }
}

const SECCIONES = [
  { key: 'actividades', label: 'Actividades', icon: '🎨', color: 'sky' },
  { key: 'devocionales', label: 'Devocionales', icon: '📖', color: 'grape' },
  { key: 'bitacora', label: 'Bitácora', icon: '📋', color: 'grass' },
  { key: 'materiales', label: 'Materiales', icon: '🧩', color: 'sunshine' },
  { key: 'hojas_vida', label: 'Hojas de vida', icon: '📄', color: 'coral' },
]

const SECTION_BG = {
  sky: 'bg-sky-50',
  grape: 'bg-grape-50',
  grass: 'bg-grass-50',
  sunshine: 'bg-sunshine-50',
  coral: 'bg-coral-50',
}
const SECTION_TEXT = {
  sky: 'text-sky-700',
  grape: 'text-grape-700',
  grass: 'text-grass-700',
  sunshine: 'text-sunshine-700',
  coral: 'text-coral-700',
}

export default function DriveOrganizado() {
  const [datos, setDatos] = useState(null)
  const [abierta, setAbierta] = useState(null)
  const [mesAbierto, setMesAbierto] = useState(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    async function load() {
      const [acts, devos, devoArchivos, bitacoras, bitaFotos, mats, matFotos, perfiles] = await Promise.all([
        supabase.from('actividades').select('id, titulo, fecha, imagen_url, nivel:niveles(nombre)').order('fecha', { ascending: false }),
        supabase.from('devocionales_ninos').select('id, titulo, fecha, imagen_url').order('fecha', { ascending: false }),
        supabase.from('devocional_archivos').select('id, devocional_id, storage_path, nombre_archivo, tipo, bucket'),
        supabase.from('bitacora_clase').select('id, fecha, momento, nivel:niveles(nombre), salon_foto_url, refrigerio_foto_url').order('fecha', { ascending: false }),
        supabase.from('bitacora_fotos').select('id, bitacora_id, storage_path, nombre_archivo, mime, tipo'),
        supabase.from('materiales').select('id, nombre, foto_url, created_at'),
        supabase.from('material_fotos').select('id, material_id, storage_path, nombre_archivo, tipo'),
        supabase.from('profiles').select('id, nombre_completo, hoja_vida_url, role').not('hoja_vida_url', 'is', null),
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
      })
    }
    load()
  }, [])

  const archivosOrganizados = useMemo(() => {
    if (!datos) return null

    const result = {}

    // Actividades — grouped by year/month from fecha
    const actArchivos = []
    for (const act of datos.actividades) {
      const ma = mesAnio(act.fecha)
      if (!ma) continue
      if (act.imagen_url) {
        actArchivos.push({
          ...ma,
          nombre: `${act.titulo} — portada`,
          url: act.imagen_url,
          fuente: act.nivel?.nombre || 'Actividad',
          fuenteLink: `#/actividad/${act.id}`,
          mime: 'image/*',
        })
      }
    }
    result.actividades = agruparPorMes(actArchivos)

    // Devocionales
    const devoArchivos = []
    for (const d of datos.devocionales) {
      const ma = mesAnio(d.fecha)
      if (!ma) continue
      if (d.imagen_url) {
        devoArchivos.push({
          ...ma,
          nombre: `${d.titulo} — imagen`,
          url: d.imagen_url,
          fuente: 'Devocional',
          fuenteLink: `#/devocional/${d.id}`,
          mime: 'image/*',
        })
      }
      const archivos = datos.devocionalArchivos.filter((a) => a.devocional_id === d.id)
      for (const a of archivos) {
        devoArchivos.push({
          ...ma,
          nombre: a.nombre_archivo || a.storage_path.split('/').pop(),
          url: storageUrl(a.bucket || 'actividades', a.storage_path),
          fuente: d.titulo,
          fuenteLink: `#/devocional/${d.id}`,
          mime: a.tipo,
        })
      }
    }
    result.devocionales = agruparPorMes(devoArchivos)

    // Bitácora
    const bitArchivos = []
    for (const b of datos.bitacoras) {
      const ma = mesAnio(b.fecha)
      if (!ma) continue
      const label = `${b.nivel?.nombre || 'Clase'} — ${b.momento}`

      if (b.salon_foto_url) {
        bitArchivos.push({ ...ma, nombre: `${label} — salón`, url: b.salon_foto_url, fuente: label, mime: 'image/*' })
      }
      if (b.refrigerio_foto_url) {
        bitArchivos.push({ ...ma, nombre: `${label} — refrigerio`, url: b.refrigerio_foto_url, fuente: label, mime: 'image/*' })
      }
      const fotos = datos.bitacoraFotos.filter((f) => f.bitacora_id === b.id)
      for (const f of fotos) {
        bitArchivos.push({
          ...ma,
          nombre: f.nombre_archivo || f.storage_path.split('/').pop(),
          url: storageUrl('actividades', f.storage_path),
          fuente: label,
          mime: f.mime,
        })
      }
    }
    result.bitacora = agruparPorMes(bitArchivos)

    // Materiales — grouped by creation date
    const matArchivos = []
    for (const m of datos.materiales) {
      const ma = mesAnio(m.created_at?.slice(0, 10))
      if (!ma) continue
      if (m.foto_url) {
        matArchivos.push({ ...ma, nombre: `${m.nombre} — foto`, url: m.foto_url, fuente: m.nombre, mime: 'image/*' })
      }
      const fotos = datos.materialFotos.filter((f) => f.material_id === m.id)
      for (const f of fotos) {
        matArchivos.push({
          ...ma,
          nombre: f.nombre_archivo || f.storage_path.split('/').pop(),
          url: storageUrl('actividades', f.storage_path),
          fuente: m.nombre,
          mime: f.tipo,
        })
      }
    }
    result.materiales = agruparPorMes(matArchivos)

    // Hojas de vida — flat list, no year/month
    result.hojas_vida = datos.perfiles.map((p) => ({
      nombre: `${p.nombre_completo} — Hoja de vida`,
      url: p.hoja_vida_url,
      fuente: p.nombre_completo,
      mime: null,
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
    setMesAbierto(null)
  }

  function toggleMes(key) {
    setMesAbierto(mesAbierto === key ? null : key)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink/50">
        Vista automática de todos los archivos del sistema, organizados por módulo y fecha. Sin duplicados — cada archivo enlaza al original.
      </p>

      {SECCIONES.map((sec) => {
        const items = archivosOrganizados?.[sec.key]
        const esFlat = sec.key === 'hojas_vida'
        const count = esFlat ? (items?.length || 0) : Object.values(items || {}).reduce((s, meses) => s + Object.values(meses).reduce((s2, arr) => s2 + arr.length, 0), 0)
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
                <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-ink/40">{count}</span>
              </div>
              <span className={`text-ink/30 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isOpen && (
              <div className="border-t border-ink/5">
                {count === 0 ? (
                  <p className="px-4 py-4 text-sm text-ink/30">Sin archivos aún.</p>
                ) : esFlat ? (
                  <ArchivoLista archivos={items} onPreview={setPreview} />
                ) : (
                  <MesesArbol meses={items} mesAbierto={mesAbierto} onToggleMes={toggleMes} onPreview={setPreview} />
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

function MesesArbol({ meses, mesAbierto, onToggleMes, onPreview }) {
  const years = Object.keys(meses).sort((a, b) => b - a)
  return (
    <div className="flex flex-col">
      {years.map((year) => {
        const monthKeys = Object.keys(meses[year]).sort((a, b) => b - a)
        return (
          <div key={year}>
            <p className="bg-ink/[0.02] px-4 py-1.5 text-xs font-extrabold uppercase text-ink/40">{year}</p>
            {monthKeys.map((month) => {
              const archivos = meses[year][month]
              const key = `${year}-${month}`
              const isOpen = mesAbierto === key
              return (
                <div key={key}>
                  <button
                    onClick={() => onToggleMes(key)}
                    className="flex w-full items-center justify-between px-6 py-2 text-left text-sm font-bold text-ink/60 hover:bg-ink/[0.02]"
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

function ArchivoLista({ archivos, onPreview }) {
  return (
    <div className="flex flex-col divide-y divide-ink/5 bg-ink/[0.01]">
      {archivos.map((a, i) => {
        const esImagen = a.mime?.startsWith('image/')
        const icon = esImagen ? '🖼️' : getFileIcon(a.nombre, a.mime)
        return (
          <div
            key={i}
            className="flex items-center gap-3 px-6 py-2 text-sm transition-colors hover:bg-sky-50/50 sm:px-8"
          >
            <button
              onClick={() => onPreview({ url: a.url, nombre: a.nombre, mime: a.mime })}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <span className="shrink-0 text-lg">{icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink/70">{a.nombre}</p>
                <p className="truncate text-[10px] text-ink/30">{a.fuente}</p>
              </div>
            </button>
            <div className="flex shrink-0 items-center gap-1.5">
              {a.fuenteLink && (
                <a href={a.fuenteLink} className="rounded-lg bg-ink/5 px-2 py-1 text-[10px] font-bold text-ink/40 hover:bg-sky-100 hover:text-sky-600">
                  Ver origen
                </a>
              )}
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-ink/5 px-2 py-1 text-[10px] font-bold text-ink/40 hover:bg-sky-100 hover:text-sky-600"
              >
                Abrir
              </a>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function agruparPorMes(items) {
  const grouped = {}
  for (const item of items) {
    const y = item.year
    const m = item.month
    if (!grouped[y]) grouped[y] = {}
    if (!grouped[y][m]) grouped[y][m] = []
    grouped[y][m].push(item)
  }
  return grouped
}
