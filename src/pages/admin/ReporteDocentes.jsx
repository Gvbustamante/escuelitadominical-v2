import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Skeleton from '../../components/Skeleton'
import Avatar from '../../components/Avatar'
import Modal from '../../components/Modal'
import { exportExcel } from '../../lib/exportExcel'

function hoyYYYYMM() {
  return new Date().toISOString().slice(0, 7)
}

function diasDeClaseEnMes(diasClase, yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number)
  const totalDias = new Date(y, m, 0).getDate()
  let count = 0
  for (let d = 1; d <= totalDias; d++) {
    const diaSemana = new Date(y, m - 1, d).getDay()
    if (diasClase.some((dc) => dc.dia_semana === diaSemana && dc.activo)) count++
  }
  return count
}

function pctColor(pct) {
  if (pct >= 80) return 'bg-grass-400'
  if (pct >= 50) return 'bg-sunshine-400'
  return 'bg-coral-400'
}

function pctBadge(pct) {
  if (pct >= 80) return 'bg-grass-100 text-grass-700'
  if (pct >= 50) return 'bg-sunshine-100 text-sunshine-700'
  return 'bg-coral-100 text-coral-700'
}

function pctRing(pct) {
  if (pct >= 80) return 'ring-grass-200'
  if (pct >= 50) return 'ring-sunshine-200'
  return 'ring-coral-200'
}

function hora(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function fechaCorta(f) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export default function ReporteDocentes() {
  const [mes, setMes] = useState(hoyYYYYMM())
  const [docentes, setDocentes] = useState(null)
  const [diasClase, setDiasClase] = useState(null)
  const [asistenciaData, setAsistenciaData] = useState(null)
  const [bitacoraData, setBitacoraData] = useState(null)
  const [actividadData, setActividadData] = useState(null)
  const [coberturaData, setCoberturaData] = useState(null)
  const [progresoData, setProgresoData] = useState(null)
  const [ninosData, setNinosData] = useState(null)
  const [docentesNiveles, setDocentesNiveles] = useState(null)
  const [seleccionado, setSeleccionado] = useState(null)
  const [historial, setHistorial] = useState(null)

  const load = useCallback(async () => {
    const [y, m] = mes.split('-').map(Number)
    const inicio = `${mes}-01`
    const fin = `${mes}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
    const inicioTs = `${inicio}T00:00:00`
    const finTs = `${fin}T23:59:59`

    const [
      { data: profs },
      { data: dias },
      { data: asist },
      { data: bita },
      { data: acts },
      { data: cob },
      { data: prog },
      { data: ninos },
      { data: dn },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, nombre_completo, role, activo')
        .in('role', ['docente', 'coordinador', 'admin'])
        .eq('activo', true)
        .order('nombre_completo'),
      supabase.from('dias_clase').select('dia_semana, activo'),
      supabase
        .from('asistencia')
        .select('tomada_por, fecha, created_at, nivel:niveles(nombre)')
        .gte('fecha', inicio)
        .lte('fecha', fin),
      supabase
        .from('bitacora_clase')
        .select('docente_id, fecha, momento, created_at, nivel:niveles(nombre)')
        .gte('fecha', inicio)
        .lte('fecha', fin),
      supabase
        .from('actividades')
        .select('docente_id, fecha, titulo, created_at, nivel:niveles(nombre)')
        .gte('fecha', inicio)
        .lte('fecha', fin),
      supabase
        .from('cobertura_dia')
        .select('docente_id, fecha')
        .gte('fecha', inicio)
        .lte('fecha', fin),
      supabase
        .from('progreso_notas')
        .select('docente_id, fecha, created_at, nino:ninos(nombre_completo)')
        .gte('fecha', inicio)
        .lte('fecha', fin),
      supabase
        .from('ninos')
        .select('creado_por, nombre_completo, created_at')
        .gte('created_at', inicioTs)
        .lte('created_at', finTs),
      supabase.from('docentes_niveles').select('docente_id, nivel:niveles(nombre)'),
    ])

    setDocentes(profs || [])
    setDiasClase(dias || [])
    setAsistenciaData(asist || [])
    setBitacoraData(bita || [])
    setActividadData(acts || [])
    setCoberturaData(cob || [])
    setProgresoData(prog || [])
    setNinosData(ninos || [])
    setDocentesNiveles(dn || [])
  }, [mes])

  useEffect(() => {
    load()
  }, [load])

  const totalDiasClase = useMemo(() => {
    if (!diasClase) return 0
    return diasDeClaseEnMes(diasClase, mes)
  }, [diasClase, mes])

  const reporte = useMemo(() => {
    if (!docentes || !asistenciaData || !bitacoraData || !actividadData) return null

    return docentes.map((doc) => {
      const fechasAsistencia = new Set(
        asistenciaData.filter((a) => a.tomada_por === doc.id).map((a) => a.fecha),
      )
      const fechasBitacora = new Set(
        bitacoraData.filter((b) => b.docente_id === doc.id).map((b) => b.fecha),
      )
      const bitacorasTotal = bitacoraData.filter((b) => b.docente_id === doc.id).length
      const actividades = actividadData.filter((a) => a.docente_id === doc.id)
      const fechasCobertura = new Set(
        (coberturaData || []).filter((c) => c.docente_id === doc.id).map((c) => c.fecha),
      )
      const progresos = (progresoData || []).filter((p) => p.docente_id === doc.id)
      const ninosAgregados = (ninosData || []).filter((n) => n.creado_por === doc.id)
      const diasActivo = new Set([...fechasAsistencia, ...fechasBitacora, ...fechasCobertura])
      const clases = (docentesNiveles || [])
        .filter((dn) => dn.docente_id === doc.id)
        .map((dn) => dn.nivel?.nombre)
        .filter(Boolean)

      const pct = totalDiasClase > 0 ? Math.round((diasActivo.size / totalDiasClase) * 100) : 0

      return {
        id: doc.id,
        nombre: doc.nombre_completo,
        role: doc.role,
        clases,
        diasAsistencia: fechasAsistencia.size,
        diasBitacora: fechasBitacora.size,
        bitacorasTotal,
        actividades: actividades.length,
        actividadesList: actividades,
        progresos: progresos.length,
        progresosList: progresos,
        ninosAgregados: ninosAgregados.length,
        ninosAgregadosList: ninosAgregados,
        diasCobertura: fechasCobertura.size,
        diasActivo: diasActivo.size,
        pct: Math.min(pct, 100),
        fechasAsistencia: [...fechasAsistencia].sort(),
        fechasBitacora: [...fechasBitacora].sort(),
      }
    })
  }, [docentes, asistenciaData, bitacoraData, actividadData, coberturaData, progresoData, ninosData, docentesNiveles, totalDiasClase])

  async function abrirHistorial(doc) {
    setSeleccionado(doc.id)
    setHistorial(null)

    const hace14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const hace14Ts = `${hace14}T00:00:00`

    const [{ data: asist }, { data: bita }, { data: acts }, { data: progs }, { data: ninos }] = await Promise.all([
      supabase.from('asistencia').select('fecha, created_at, nivel:niveles(nombre)').eq('tomada_por', doc.id).gte('fecha', hace14).order('fecha', { ascending: false }),
      supabase.from('bitacora_clase').select('fecha, momento, created_at, nivel:niveles(nombre)').eq('docente_id', doc.id).gte('fecha', hace14).order('fecha', { ascending: false }),
      supabase.from('actividades').select('fecha, titulo, created_at, nivel:niveles(nombre)').eq('docente_id', doc.id).gte('fecha', hace14).order('fecha', { ascending: false }),
      supabase.from('progreso_notas').select('fecha, created_at, nino:ninos(nombre_completo)').eq('docente_id', doc.id).gte('fecha', hace14).order('fecha', { ascending: false }),
      supabase.from('ninos').select('nombre_completo, created_at').eq('creado_por', doc.id).gte('created_at', hace14Ts).order('created_at', { ascending: false }),
    ])

    const eventos = []
    const asistFechas = new Set()
    ;(asist || []).forEach((a) => {
      const key = `asist-${a.fecha}-${a.nivel?.nombre}`
      if (!asistFechas.has(key)) {
        asistFechas.add(key)
        eventos.push({ fecha: a.fecha, hora: hora(a.created_at), tipo: 'Asistencia', detalle: a.nivel?.nombre || '', icon: '✅' })
      }
    })
    ;(bita || []).forEach((b) => {
      eventos.push({ fecha: b.fecha, hora: hora(b.created_at), tipo: `Bitácora ${b.momento}`, detalle: b.nivel?.nombre || '', icon: '📋' })
    })
    ;(acts || []).forEach((a) => {
      eventos.push({ fecha: a.fecha, hora: hora(a.created_at), tipo: 'Actividad', detalle: a.titulo, icon: '🎨' })
    })
    ;(progs || []).forEach((p) => {
      eventos.push({ fecha: p.fecha, hora: hora(p.created_at), tipo: 'Nota de progreso', detalle: p.nino?.nombre_completo || '', icon: '🌱' })
    })
    ;(ninos || []).forEach((n) => {
      const f = n.created_at.slice(0, 10)
      eventos.push({ fecha: f, hora: hora(n.created_at), tipo: 'Niño agregado', detalle: n.nombre_completo, icon: '🧒' })
    })

    eventos.sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora))

    const agrupado = {}
    eventos.forEach((e) => {
      agrupado[e.fecha] = agrupado[e.fecha] || []
      agrupado[e.fecha].push(e)
    })

    setHistorial(agrupado)
  }

  function exportar() {
    if (!reporte) return
    const filas = reporte.map((r) => [
      r.nombre,
      r.role,
      r.clases.join(', ') || '—',
      r.diasAsistencia,
      r.diasBitacora,
      r.bitacorasTotal,
      r.actividades,
      r.progresos,
      r.ninosAgregados,
      r.diasActivo,
      totalDiasClase,
      `${r.pct}%`,
    ])
    exportExcel(
      `reporte-docentes-${mes}`,
      ['Docente', 'Rol', 'Clases', 'Días asist.', 'Días bitácora', 'Bitácoras total', 'Actividades', 'Notas progreso', 'Niños agregados', 'Días activo', 'Días de clase', 'Cumplimiento'],
      filas,
    )
  }

  if (!reporte) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      </div>
    )
  }

  const r = seleccionado ? reporte.find((d) => d.id === seleccionado) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Reporte docentes 📊</h1>
          <p className="text-ink/50">
            Resumen mensual de participación — {totalDiasClase} día{totalDiasClase !== 1 ? 's' : ''} de clase en{' '}
            {new Date(mes + '-01').toLocaleDateString('es', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" className="input !w-auto" value={mes} onChange={(e) => setMes(e.target.value)} />
          <button className="btn-secondary" onClick={exportar} disabled={reporte.length === 0}>
            📊 Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card flex flex-col items-center gap-1 !p-4 text-center">
          <span className="text-2xl">👥</span>
          <p className="text-2xl font-extrabold text-sky-600">{reporte.length}</p>
          <p className="text-xs font-bold text-ink/40">Equipo activo</p>
        </div>
        <div className="card flex flex-col items-center gap-1 !p-4 text-center">
          <span className="text-2xl">📅</span>
          <p className="text-2xl font-extrabold text-grape-600">{totalDiasClase}</p>
          <p className="text-xs font-bold text-ink/40">Días de clase</p>
        </div>
        <div className="card flex flex-col items-center gap-1 !p-4 text-center">
          <span className="text-2xl">✅</span>
          <p className="text-2xl font-extrabold text-grass-600">
            {reporte.filter((x) => x.pct >= 80).length}
          </p>
          <p className="text-xs font-bold text-ink/40">Cumplimiento ≥ 80%</p>
        </div>
        <div className="card flex flex-col items-center gap-1 !p-4 text-center">
          <span className="text-2xl">⚠️</span>
          <p className="text-2xl font-extrabold text-coral-600">
            {reporte.filter((x) => x.pct < 50).length}
          </p>
          <p className="text-xs font-bold text-ink/40">Por debajo del 50%</p>
        </div>
      </div>

      {reporte.length === 0 ? (
        <p className="card text-center text-ink/40">No hay docentes activos.</p>
      ) : (
        <>
          <p className="text-sm font-bold text-ink/40">Toca un docente para ver su reporte detallado e historial</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reporte.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => abrirHistorial(item)}
                className={`card animate-pop-in cursor-pointer !p-0 overflow-hidden text-left transition-all hover:shadow-lg hover:ring-2 ${pctRing(item.pct)}`}
                style={{ animationDelay: `${Math.min(i, 11) * 40}ms` }}
              >
                <div className="flex items-start gap-3 p-4">
                  <Avatar nombre={item.nombre} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold leading-tight">{item.nombre}</p>
                    <p className="mt-0.5 text-xs text-ink/40">{item.clases.join(', ') || 'Sin clases'}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${pctColor(item.pct)}`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${pctBadge(item.pct)}`}>
                        {item.pct}%
                      </span>
                    </div>
                    <p className="mt-1 text-[0.65rem] text-ink/40">{item.diasActivo} de {totalDiasClase} días activo</p>
                  </div>
                </div>
                <div className="flex border-t border-ink/5">
                  <div className="flex flex-1 flex-col items-center border-r border-ink/5 py-2">
                    <span className="text-sm font-extrabold text-grass-600">{item.diasAsistencia}</span>
                    <span className="text-[0.6rem] font-bold text-ink/40">Asist.</span>
                  </div>
                  <div className="flex flex-1 flex-col items-center border-r border-ink/5 py-2">
                    <span className="text-sm font-extrabold text-grape-600">{item.bitacorasTotal}</span>
                    <span className="text-[0.6rem] font-bold text-ink/40">Bitácoras</span>
                  </div>
                  <div className="flex flex-1 flex-col items-center border-r border-ink/5 py-2">
                    <span className="text-sm font-extrabold text-sky-600">{item.actividades}</span>
                    <span className="text-[0.6rem] font-bold text-ink/40">Activid.</span>
                  </div>
                  <div className="flex flex-1 flex-col items-center border-r border-ink/5 py-2">
                    <span className="text-sm font-extrabold text-sunshine-600">{item.progresos}</span>
                    <span className="text-[0.6rem] font-bold text-ink/40">Notas</span>
                  </div>
                  <div className="flex flex-1 flex-col items-center py-2">
                    <span className="text-sm font-extrabold text-coral-600">{item.ninosAgregados}</span>
                    <span className="text-[0.6rem] font-bold text-ink/40">Niños</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <Modal
        open={!!seleccionado}
        onClose={() => { setSeleccionado(null); setHistorial(null) }}
        title={`Reporte — ${r?.nombre || ''}`}
      >
        {r && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3 rounded-2xl bg-sky-50 px-4 py-3">
              <Avatar nombre={r.nombre} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{r.nombre}</p>
                {r.clases.length > 0 && <p className="text-sm text-ink/50">{r.clases.join(', ')}</p>}
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${pctBadge(r.pct)}`}>
                {r.pct}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-5">
              <div className="rounded-xl bg-grass-50 p-2">
                <p className="text-lg font-extrabold text-grass-600">{r.diasAsistencia}</p>
                <p className="text-[0.6rem] font-bold text-ink/40">Asistencia</p>
              </div>
              <div className="rounded-xl bg-grape-50 p-2">
                <p className="text-lg font-extrabold text-grape-600">{r.bitacorasTotal}</p>
                <p className="text-[0.6rem] font-bold text-ink/40">Bitácoras</p>
              </div>
              <div className="rounded-xl bg-sky-50 p-2">
                <p className="text-lg font-extrabold text-sky-600">{r.actividades}</p>
                <p className="text-[0.6rem] font-bold text-ink/40">Actividades</p>
              </div>
              <div className="rounded-xl bg-sunshine-50 p-2">
                <p className="text-lg font-extrabold text-sunshine-600">{r.progresos}</p>
                <p className="text-[0.6rem] font-bold text-ink/40">Notas</p>
              </div>
              <div className="rounded-xl bg-coral-50 p-2">
                <p className="text-lg font-extrabold text-coral-600">{r.ninosAgregados}</p>
                <p className="text-[0.6rem] font-bold text-ink/40">Niños</p>
              </div>
            </div>

            <p className="text-xs font-extrabold uppercase tracking-wide text-ink/40">Historial — últimas 2 semanas</p>

            {!historial ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : Object.keys(historial).length === 0 ? (
              <p className="text-sm text-ink/40">Sin actividad en las últimas 2 semanas.</p>
            ) : (
              Object.entries(historial).map(([fecha, eventos]) => (
                <div key={fecha}>
                  <p className="mb-1.5 text-sm font-bold text-ink/50">{fechaCorta(fecha)}</p>
                  <div className="flex flex-col gap-1">
                    {eventos.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-xl bg-ink/5 px-3 py-2 text-sm">
                        <span>{e.icon}</span>
                        <span className="font-bold">{e.tipo}</span>
                        {e.detalle && <span className="text-ink/50">· {e.detalle}</span>}
                        {e.hora && <span className="ml-auto shrink-0 text-xs text-ink/30">{e.hora}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Modal>

      <p className="text-center text-xs text-ink/30">
        El cumplimiento mide los días que el docente tuvo alguna actividad registrada (asistencia, bitácora o cobertura) vs. los {totalDiasClase} días de clase del mes.
      </p>
    </div>
  )
}
