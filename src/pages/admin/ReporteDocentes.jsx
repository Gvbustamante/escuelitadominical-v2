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

export default function ReporteDocentes() {
  const [mes, setMes] = useState(hoyYYYYMM())
  const [docentes, setDocentes] = useState(null)
  const [diasClase, setDiasClase] = useState(null)
  const [asistenciaData, setAsistenciaData] = useState(null)
  const [bitacoraData, setBitacoraData] = useState(null)
  const [actividadData, setActividadData] = useState(null)
  const [coberturaData, setCoberturaData] = useState(null)
  const [docentesNiveles, setDocentesNiveles] = useState(null)
  const [expandido, setExpandido] = useState(null)

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
      // Días únicos que tomó asistencia
      const fechasAsistencia = new Set(
        asistenciaData.filter((a) => a.tomada_por === doc.id).map((a) => a.fecha),
      )
      // Días únicos de bitácora
      const fechasBitacora = new Set(
        bitacoraData.filter((b) => b.docente_id === doc.id).map((b) => b.fecha),
      )
      // Bitácoras totales (antes + después cuentan por separado)
      const bitacorasTotal = bitacoraData.filter((b) => b.docente_id === doc.id).length
      // Actividades creadas
      const actividades = actividadData.filter((a) => a.docente_id === doc.id)
      // Coberturas
      const fechasCobertura = new Set(
        (coberturaData || []).filter((c) => c.docente_id === doc.id).map((c) => c.fecha),
      )
      // Días con cualquier actividad
      const diasActivo = new Set([...fechasAsistencia, ...fechasBitacora, ...fechasCobertura])
      // Clases asignadas
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
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

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

      {/* Tarjetas resumen */}
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
            {reporte.filter((r) => r.pct >= 80).length}
          </p>
          <p className="text-xs font-bold text-ink/40">Cumplimiento ≥ 80%</p>
        </div>
        <div className="card flex flex-col items-center gap-1 !p-4 text-center">
          <span className="text-2xl">⚠️</span>
          <p className="text-2xl font-extrabold text-coral-600">
            {reporte.filter((r) => r.pct < 50).length}
          </p>
          <p className="text-xs font-bold text-ink/40">Por debajo del 50%</p>
        </div>
      </div>

      {/* Tabla principal */}
      {reporte.length === 0 ? (
        <p className="card text-center text-ink/40">No hay docentes activos.</p>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-left">
            <thead className="bg-sky-50 text-xs font-bold uppercase text-ink/50">
              <tr>
                <th className="px-3 py-3 sm:px-4">Docente</th>
                <th className="px-3 py-3 sm:px-4 text-center">Clases</th>
                <th className="px-3 py-3 sm:px-4 text-center">Asist.</th>
                <th className="px-3 py-3 sm:px-4 text-center">Bitácora</th>
                <th className="px-3 py-3 sm:px-4 text-center">Activid.</th>
                <th className="px-3 py-3 sm:px-4">Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {reporte.map((r) => {
                const abierto = expandido === r.id
                return (
                  <tr
                    key={r.id}
                    className="group cursor-pointer border-t border-ink/5 transition-colors hover:bg-sky-50/50"
                    onClick={() => setExpandido(abierto ? null : r.id)}
                  >
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex items-center gap-2">
                        <Avatar nombre={r.nombre} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-bold">{r.nombre}</p>
                          <p className="text-xs text-ink/40">{r.clases.join(', ') || 'Sin asignar'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 sm:px-4 text-center">
                      <span className="font-bold text-ink/60">{r.clases.length}</span>
                    </td>
                    <td className="px-3 py-3 sm:px-4 text-center">
                      <span className={`badge ${r.diasAsistencia > 0 ? 'bg-grass-100 text-grass-700' : 'bg-ink/5 text-ink/40'}`}>
                        {r.diasAsistencia}
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-4 text-center">
                      <span className={`badge ${r.diasBitacora > 0 ? 'bg-grape-100 text-grape-700' : 'bg-ink/5 text-ink/40'}`}>
                        {r.bitacorasTotal}
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-4 text-center">
                      <span className={`badge ${r.actividades > 0 ? 'bg-sky-100 text-sky-700' : 'bg-ink/5 text-ink/40'}`}>
                        {r.actividades}
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-full max-w-[8rem] overflow-hidden rounded-full bg-ink/10">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${pctColor(r.pct)}`}
                            style={{ width: `${r.pct}%` }}
                          />
                        </div>
                        <span className={`badge text-xs ${pctBadge(r.pct)}`}>{r.pct}%</span>
                      </div>
                      <p className="mt-0.5 text-[0.65rem] text-ink/40">
                        {r.diasActivo} de {totalDiasClase} días
                      </p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detalle expandido */}
      {expandido && (() => {
        const r = reporte.find((d) => d.id === expandido)
        if (!r) return null
        return (
          <div className="card animate-pop-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar nombre={r.nombre} size="md" />
                <div>
                  <h2 className="text-lg font-bold">{r.nombre}</h2>
                  <p className="text-sm text-ink/50">{r.clases.join(', ') || 'Sin clases asignadas'}</p>
                </div>
              </div>
              <button onClick={() => setExpandido(null)} className="rounded-full p-2 text-lg text-ink/40 hover:bg-ink/5">
                ×
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-grass-50 p-3 text-center">
                <p className="text-xl font-extrabold text-grass-600">{r.diasAsistencia}</p>
                <p className="text-xs font-bold text-grass-600/60">Días que pasó lista</p>
              </div>
              <div className="rounded-2xl bg-grape-50 p-3 text-center">
                <p className="text-xl font-extrabold text-grape-600">{r.bitacorasTotal}</p>
                <p className="text-xs font-bold text-grape-600/60">Bitácoras registradas</p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-3 text-center">
                <p className="text-xl font-extrabold text-sky-600">{r.actividades}</p>
                <p className="text-xs font-bold text-sky-600/60">Actividades creadas</p>
              </div>
              <div className="rounded-2xl bg-sunshine-50 p-3 text-center">
                <p className="text-xl font-extrabold text-sunshine-600">{r.pct}%</p>
                <p className="text-xs font-bold text-sunshine-600/60">Cumplimiento</p>
              </div>
            </div>

            {r.fechasAsistencia.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-extrabold uppercase text-ink/40">Fechas que tomó asistencia</p>
                <div className="flex flex-wrap gap-1.5">
                  {r.fechasAsistencia.map((f) => (
                    <span key={f} className="badge bg-grass-100 text-grass-700 text-xs">
                      {f.slice(5)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {r.fechasBitacora.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-extrabold uppercase text-ink/40">Fechas de bitácora</p>
                <div className="flex flex-wrap gap-1.5">
                  {r.fechasBitacora.map((f) => (
                    <span key={f} className="badge bg-grape-100 text-grape-700 text-xs">
                      {f.slice(5)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {r.actividadesList.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-extrabold uppercase text-ink/40">Actividades creadas</p>
                <div className="flex flex-col gap-1">
                  {r.actividadesList.map((a, i) => (
                    <p key={i} className="text-sm text-ink/60">
                      <span className="text-ink/40">{a.fecha.slice(5)}</span> — {a.titulo}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      <p className="text-center text-xs text-ink/30">
        El cumplimiento mide los días que el docente tuvo alguna actividad registrada (asistencia, bitácora o cobertura) vs. los {totalDiasClase} días de clase del mes.
      </p>
    </div>
  )
}
