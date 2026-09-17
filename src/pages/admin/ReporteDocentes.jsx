import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Skeleton from '../../components/Skeleton'
import Avatar from '../../components/Avatar'
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

export default function ReporteDocentes() {
  const [mes, setMes] = useState(hoyYYYYMM())
  const [docentes, setDocentes] = useState(null)
  const [diasClase, setDiasClase] = useState(null)
  const [asistenciaData, setAsistenciaData] = useState(null)
  const [bitacoraData, setBitacoraData] = useState(null)
  const [actividadData, setActividadData] = useState(null)
  const [coberturaData, setCoberturaData] = useState(null)
  const [docentesNiveles, setDocentesNiveles] = useState(null)
  const [seleccionado, setSeleccionado] = useState(null)

  const load = useCallback(async () => {
    const [y, m] = mes.split('-').map(Number)
    const inicio = `${mes}-01`
    const fin = `${mes}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`

    const [
      { data: profs },
      { data: dias },
      { data: asist },
      { data: bita },
      { data: acts },
      { data: cob },
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
        .select('tomada_por, fecha')
        .gte('fecha', inicio)
        .lte('fecha', fin),
      supabase
        .from('bitacora_clase')
        .select('docente_id, fecha, momento')
        .gte('fecha', inicio)
        .lte('fecha', fin),
      supabase
        .from('actividades')
        .select('docente_id, fecha, titulo')
        .gte('fecha', inicio)
        .lte('fecha', fin),
      supabase
        .from('cobertura_dia')
        .select('docente_id, fecha')
        .gte('fecha', inicio)
        .lte('fecha', fin),
      supabase.from('docentes_niveles').select('docente_id, nivel:niveles(nombre)'),
    ])

    setDocentes(profs || [])
    setDiasClase(dias || [])
    setAsistenciaData(asist || [])
    setBitacoraData(bita || [])
    setActividadData(acts || [])
    setCoberturaData(cob || [])
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
        diasCobertura: fechasCobertura.size,
        diasActivo: diasActivo.size,
        pct: Math.min(pct, 100),
        fechasAsistencia: [...fechasAsistencia].sort(),
        fechasBitacora: [...fechasBitacora].sort(),
      }
    })
  }, [docentes, asistenciaData, bitacoraData, actividadData, coberturaData, docentesNiveles, totalDiasClase])

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
      r.diasActivo,
      totalDiasClase,
      `${r.pct}%`,
    ])
    exportExcel(
      `reporte-docentes-${mes}`,
      ['Docente', 'Rol', 'Clases', 'Días asist.', 'Días bitácora', 'Bitácoras total', 'Actividades', 'Días activo', 'Días de clase', 'Cumplimiento'],
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
      ) : !seleccionado ? (
        <>
          <p className="text-sm font-bold text-ink/40">Toca un docente para ver su reporte detallado</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reporte.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSeleccionado(item.id)}
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
                  <div className="flex flex-1 flex-col items-center py-2">
                    <span className="text-sm font-extrabold text-sky-600">{item.actividades}</span>
                    <span className="text-[0.6rem] font-bold text-ink/40">Activid.</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : r && (
        <div className="animate-pop-in flex flex-col gap-5">
          <button
            type="button"
            onClick={() => setSeleccionado(null)}
            className="flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-bold text-ink/50 hover:bg-ink/5"
          >
            ← Volver al equipo
          </button>

          <div className="card !p-0 overflow-hidden">
            <div className={`h-1.5 w-full ${pctColor(r.pct)}`} />
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-4">
                <Avatar nombre={r.nombre} size="lg" />
                <div>
                  <h2 className="text-xl font-bold">{r.nombre}</h2>
                  <p className="text-sm text-ink/50">{r.clases.join(', ') || 'Sin clases asignadas'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-24 overflow-hidden rounded-full bg-ink/10">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${pctColor(r.pct)}`}
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${pctBadge(r.pct)}`}>
                  {r.pct}% cumplimiento
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px border-t border-ink/5 bg-ink/5 sm:grid-cols-4">
              <div className="flex flex-col items-center gap-1 bg-white p-4">
                <span className="text-2xl font-extrabold text-grass-600">{r.diasAsistencia}</span>
                <span className="text-xs font-bold text-ink/40">Días con asistencia</span>
              </div>
              <div className="flex flex-col items-center gap-1 bg-white p-4">
                <span className="text-2xl font-extrabold text-grape-600">{r.bitacorasTotal}</span>
                <span className="text-xs font-bold text-ink/40">Bitácoras registradas</span>
              </div>
              <div className="flex flex-col items-center gap-1 bg-white p-4">
                <span className="text-2xl font-extrabold text-sky-600">{r.actividades}</span>
                <span className="text-xs font-bold text-ink/40">Actividades creadas</span>
              </div>
              <div className="flex flex-col items-center gap-1 bg-white p-4">
                <span className="text-2xl font-extrabold text-sunshine-600">{r.diasActivo}</span>
                <span className="text-xs font-bold text-ink/40">de {totalDiasClase} días activo</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="card">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase text-ink/40">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-grass-100 text-xs">✅</span>
                Fechas que tomó asistencia
              </h3>
              {r.fechasAsistencia.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {r.fechasAsistencia.map((f) => (
                    <span key={f} className="inline-flex items-center rounded-full bg-grass-100 px-2.5 py-1 text-xs font-bold text-grass-700">
                      {new Date(f + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink/30">No tomó asistencia este mes.</p>
              )}
            </div>

            <div className="card">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase text-ink/40">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-grape-100 text-xs">📋</span>
                Fechas de bitácora
              </h3>
              {r.fechasBitacora.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {r.fechasBitacora.map((f) => (
                    <span key={f} className="inline-flex items-center rounded-full bg-grape-100 px-2.5 py-1 text-xs font-bold text-grape-700">
                      {new Date(f + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink/30">No registró bitácora este mes.</p>
              )}
            </div>
          </div>

          {r.actividadesList.length > 0 && (
            <div className="card">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase text-ink/40">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-xs">🎨</span>
                Actividades creadas
              </h3>
              <div className="flex flex-col gap-2">
                {r.actividadesList.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-ink/[0.03] px-3 py-2">
                    <span className="shrink-0 text-xs font-bold text-ink/40">
                      {new Date(a.fecha + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="font-bold text-ink/70">{a.titulo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-xs text-ink/30">
        El cumplimiento mide los días que el docente tuvo alguna actividad registrada (asistencia, bitácora o cobertura) vs. los {totalDiasClase} días de clase del mes.
      </p>
    </div>
  )
}
