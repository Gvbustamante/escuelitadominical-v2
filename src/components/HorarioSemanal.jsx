import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { BADGE_CLASSES, DOT_CLASSES } from '../lib/colors'

const DIAS_NOMBRE = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function HorarioSemanal({
  diasClase,
  niveles,
  docentes,
  horarios,
  asignacionesHorario,
  esDocente,
  miId,
  onReload,
}) {
  const [busy, setBusy] = useState(null)

  const diasActivos = useMemo(
    () => (diasClase || []).filter((d) => d.activo).map((d) => d.dia_semana).sort((a, b) => a - b),
    [diasClase],
  )

  const horariosDelDia = useMemo(() => {
    const m = {}
    for (const dia of diasActivos) {
      m[dia] = horarios.filter((h) => h.dia_semana === null || h.dia_semana === dia)
    }
    return m
  }, [diasActivos, horarios])

  const soloUnHorarioGlobal = horarios.length <= 1

  function docenteEnCelda(nivelId, horarioId) {
    const asig = asignacionesHorario.find((a) => a.nivel_id === nivelId && a.horario_id === horarioId)
    return asig || null
  }

  async function cambiarAsignacion(nivelId, horarioId, docenteId) {
    setBusy(`${nivelId}-${horarioId}`)
    if (!docenteId) {
      await supabase.from('asignacion_horario').delete().eq('nivel_id', nivelId).eq('horario_id', horarioId)
    } else {
      await supabase
        .from('asignacion_horario')
        .upsert(
          { nivel_id: nivelId, horario_id: horarioId, docente_id: docenteId },
          { onConflict: 'nivel_id,horario_id' },
        )
    }
    setBusy(null)
    onReload?.()
  }

  if (diasActivos.length === 0) {
    return (
      <div className="card border-2 border-sunshine-200 bg-sunshine-50">
        <p className="font-bold text-sunshine-800">No hay días de clase configurados.</p>
        <p className="mt-1 text-sm text-ink/60">Ve a Ajustes → Días de clase para activarlos.</p>
      </div>
    )
  }

  if (niveles.length === 0) {
    return <p className="text-center text-ink/40">No hay clases creadas aún.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {esDocente && (
        <div className="card border-2 border-sky-200 bg-sky-50">
          <p className="text-sm font-bold text-sky-800">Tu horario semanal</p>
          <p className="mt-1 text-xs text-ink/60">Las clases donde apareces están resaltadas.</p>
        </div>
      )}

      {/* Desktop: table grid */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="rounded-tl-xl bg-ink/5 px-3 py-2 text-left text-xs font-extrabold uppercase text-ink/40">
                Clase
              </th>
              {diasActivos.map((dia) => (
                <th key={dia} className="bg-ink/5 px-3 py-2 text-center text-xs font-extrabold uppercase text-ink/40 last:rounded-tr-xl">
                  {DIAS_NOMBRE[dia]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {niveles.map((nivel) => {
              const color = nivel.color || 'sky'
              return (
                <tr key={nivel.id} className="border-t border-ink/5">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold text-white ${DOT_CLASSES[color] || DOT_CLASSES.sky}`}>
                        {nivel.nombre.charAt(0)}
                      </span>
                      <span className="text-sm font-bold">{nivel.nombre}</span>
                    </div>
                  </td>
                  {diasActivos.map((dia) => {
                    const hsDia = horariosDelDia[dia] || []
                    return (
                      <td key={dia} className="px-2 py-2 text-center align-top">
                        <div className="flex flex-col gap-1">
                          {hsDia.map((horario) => {
                            const asig = docenteEnCelda(nivel.id, horario.id)
                            const nombre = asig?.docente?.nombre_completo
                            const esMio = asig?.docente_id === miId
                            const cellKey = `${nivel.id}-${horario.id}`
                            return (
                              <div key={horario.id} className={`rounded-lg px-2 py-1.5 ${esMio ? 'bg-sky-100 ring-2 ring-sky-300' : 'bg-ink/[0.03]'}`}>
                                {!soloUnHorarioGlobal && (
                                  <p className="mb-0.5 text-[9px] font-bold uppercase text-ink/30">{horario.nombre}</p>
                                )}
                                {esDocente ? (
                                  nombre ? (
                                    <span className={`text-xs font-bold ${esMio ? 'text-sky-700' : 'text-ink/60'}`}>
                                      {nombre.split(' ').slice(0, 2).join(' ')}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-ink/25">—</span>
                                  )
                                ) : (
                                  <select
                                    className="w-full rounded-lg border-0 bg-transparent py-0 text-xs font-bold text-ink/70 focus:ring-2 focus:ring-sky-300"
                                    value={asig?.docente_id || ''}
                                    onChange={(e) => cambiarAsignacion(nivel.id, horario.id, e.target.value || null)}
                                    disabled={busy === cellKey}
                                  >
                                    <option value="">— Sin asignar —</option>
                                    {docentes.map((d) => (
                                      <option key={d.id} value={d.id}>
                                        {d.nombre_completo}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            )
                          })}
                          {hsDia.length === 0 && <span className="text-xs text-ink/20">—</span>}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: card per day */}
      <div className="flex flex-col gap-3 sm:hidden">
        {diasActivos.map((dia) => {
          const hsDia = horariosDelDia[dia] || []
          return (
            <div key={dia} className="card !p-0 overflow-hidden">
              <div className="bg-ink/5 px-4 py-2">
                <h3 className="text-sm font-extrabold uppercase text-ink/50">{DIAS_NOMBRE[dia]}</h3>
              </div>
              <div className="flex flex-col divide-y divide-ink/5">
                {niveles.map((nivel) => {
                  const color = nivel.color || 'sky'
                  return (
                    <div key={nivel.id} className="px-4 py-2.5">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-white ${DOT_CLASSES[color] || DOT_CLASSES.sky}`}>
                          {nivel.nombre.charAt(0)}
                        </span>
                        <span className="text-sm font-bold">{nivel.nombre}</span>
                      </div>
                      <div className="flex flex-col gap-1 pl-7">
                        {hsDia.map((horario) => {
                          const asig = docenteEnCelda(nivel.id, horario.id)
                          const nombre = asig?.docente?.nombre_completo
                          const esMio = asig?.docente_id === miId
                          const cellKey = `${nivel.id}-${horario.id}`
                          return (
                            <div key={horario.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${esMio ? 'bg-sky-50 ring-1 ring-sky-200' : ''}`}>
                              {!soloUnHorarioGlobal && (
                                <span className="text-[10px] font-bold text-ink/30">{horario.nombre}:</span>
                              )}
                              {esDocente ? (
                                nombre ? (
                                  <span className={`text-xs font-bold ${esMio ? 'text-sky-700' : 'text-ink/60'}`}>
                                    {nombre.split(' ').slice(0, 2).join(' ')}
                                  </span>
                                ) : (
                                  <span className="text-xs text-ink/25">Sin asignar</span>
                                )
                              ) : (
                                <select
                                  className="input !py-1 !text-xs flex-1"
                                  value={asig?.docente_id || ''}
                                  onChange={(e) => cambiarAsignacion(nivel.id, horario.id, e.target.value || null)}
                                  disabled={busy === cellKey}
                                >
                                  <option value="">— Sin asignar —</option>
                                  {docentes.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      {d.nombre_completo}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )
                        })}
                        {hsDia.length === 0 && <span className="text-xs text-ink/20">Sin horarios este día</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
