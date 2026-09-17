import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'
import { BADGE_CLASSES, DOT_CLASSES } from '../../lib/colors'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function hoyISO() {
  const h = new Date()
  return toISO(h.getFullYear(), h.getMonth(), h.getDate())
}

const STRIPE_CLASSES = {
  sky: 'border-l-sky-400',
  grass: 'border-l-grass-400',
  sunshine: 'border-l-sunshine-400',
  coral: 'border-l-coral-400',
  grape: 'border-l-grape-400',
}

const BG_LIGHT = {
  sky: 'bg-sky-50/60',
  grass: 'bg-grass-50/60',
  sunshine: 'bg-sunshine-50/60',
  coral: 'bg-coral-50/60',
  grape: 'bg-grape-50/60',
}

export default function Planeacion() {
  const { user, profile } = useAuth()
  const esDocente = profile?.role === 'docente'
  const [cursor, setCursor] = useState(() => {
    const h = new Date()
    return { year: h.getFullYear(), month: h.getMonth() }
  })
  const [diasClase, setDiasClase] = useState(null)
  const [niveles, setNiveles] = useState([])
  const [docentes, setDocentes] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [horarios, setHorarios] = useState([])
  const [asignacionesHorario, setAsignacionesHorario] = useState([])
  const [actividadesMes, setActividadesMes] = useState([])
  const [coberturaMes, setCoberturaMes] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)

  const [modalActividad, setModalActividad] = useState(null)
  const [form, setForm] = useState({ titulo: '', descripcion: '', versiculo_clave: '', historia_biblica: '', visible_padres: true, es_tarea: false })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('dias_clase').select('*').then(({ data }) => setDiasClase(data || []))
    supabase
      .from('niveles')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .then(({ data }) => setNiveles(data || []))
    supabase
      .from('profiles')
      .select('id, nombre_completo')
      .eq('role', 'docente')
      .eq('activo', true)
      .order('nombre_completo')
      .then(({ data }) => setDocentes(data || []))
    supabase.from('docentes_niveles').select('docente_id, nivel_id, docente:profiles(nombre_completo)').then(({ data }) => setAsignaciones(data || []))
    supabase.from('horarios').select('*').eq('activo', true).order('orden').then(({ data }) => setHorarios(data || []))
    supabase
      .from('asignacion_horario')
      .select('nivel_id, horario_id, docente_id, docente:profiles(nombre_completo)')
      .then(({ data }) => setAsignacionesHorario(data || []))
  }, [])

  const { year, month } = cursor
  const inicioMes = toISO(year, month, 1)
  const finMes = toISO(year, month, new Date(year, month + 1, 0).getDate())

  const loadMes = useCallback(async () => {
    const [{ data: acts }, { data: cob }] = await Promise.all([
      supabase.from('actividades').select('id, nivel_id, fecha, titulo').gte('fecha', inicioMes).lte('fecha', finMes),
      supabase
        .from('cobertura_dia')
        .select('*, docente:profiles(nombre_completo)')
        .gte('fecha', inicioMes)
        .lte('fecha', finMes),
    ])
    setActividadesMes(acts || [])
    setCoberturaMes(cob || [])
  }, [inicioMes, finMes])

  useEffect(() => {
    loadMes()
  }, [loadMes])

  const diasClaseSet = useMemo(() => new Set((diasClase || []).filter((d) => d.activo).map((d) => d.dia_semana)), [diasClase])

  const nivelesVisibles = useMemo(() => {
    if (!esDocente) return niveles
    const misNivelIds = new Set(asignaciones.filter((a) => a.docente_id === user?.id).map((a) => a.nivel_id))
    return niveles.filter((n) => misNivelIds.has(n.id))
  }, [niveles, asignaciones, esDocente, user?.id])

  const primerDia = new Date(year, month, 1).getDay()
  const diasEnMes = new Date(year, month + 1, 0).getDate()
  const celdas = []
  for (let i = 0; i < primerDia; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)

  function openActividad(nivel, actividadExistente) {
    setModalActividad({ nivel, actividad: actividadExistente })
    if (actividadExistente) {
      supabase
        .from('actividades')
        .select('*')
        .eq('id', actividadExistente.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setForm({
              titulo: data.titulo,
              descripcion: data.descripcion || '',
              versiculo_clave: data.versiculo_clave || '',
              historia_biblica: data.historia_biblica || '',
              visible_padres: data.visible_padres ?? true,
              es_tarea: data.es_tarea ?? false,
            })
          }
        })
    } else {
      setForm({ titulo: '', descripcion: '', versiculo_clave: '', historia_biblica: '', visible_padres: true, es_tarea: false })
    }
  }

  async function guardarActividad(e) {
    e.preventDefault()
    setBusy(true)
    const payload = {
      titulo: form.titulo,
      descripcion: form.descripcion || null,
      versiculo_clave: form.versiculo_clave || null,
      historia_biblica: form.historia_biblica || null,
      visible_padres: form.visible_padres,
      es_tarea: form.es_tarea,
    }
    if (modalActividad.actividad) {
      await supabase.from('actividades').update(payload).eq('id', modalActividad.actividad.id)
    } else {
      await supabase.from('actividades').insert({
        ...payload,
        nivel_id: modalActividad.nivel.id,
        fecha: selectedDay,
        docente_id: user.id,
      })
    }
    setBusy(false)
    setModalActividad(null)
    loadMes()
  }

  async function asignarCobertura(nivelId, horarioId, docenteId) {
    if (!docenteId) {
      await supabase.from('cobertura_dia').delete().eq('nivel_id', nivelId).eq('horario_id', horarioId).eq('fecha', selectedDay)
    } else {
      await supabase
        .from('cobertura_dia')
        .upsert(
          { nivel_id: nivelId, horario_id: horarioId, fecha: selectedDay, docente_id: docenteId, updated_at: new Date().toISOString() },
          { onConflict: 'nivel_id,horario_id,fecha' },
        )
    }
    loadMes()
  }

  if (diasClase === null) return <Spinner />

  const hoy = hoyISO()
  const coberturaDelDia = coberturaMes.filter((c) => c.fecha === selectedDay)
  const actividadesDelDia = actividadesMes.filter((a) => a.fecha === selectedDay)
  const diaSemanaSeleccionado = selectedDay ? new Date(selectedDay + 'T00:00:00').getDay() : null
  const horariosDelDia = horarios.filter((h) => h.dia_semana === null || h.dia_semana === diaSemanaSeleccionado)
  const esDiaClase = diaSemanaSeleccionado !== null && diasClaseSet.has(diaSemanaSeleccionado)

  const resumenMes = useMemo(() => {
    let planeadas = 0
    let sinPlanear = 0
    for (let d = 1; d <= diasEnMes; d++) {
      const iso = toISO(year, month, d)
      const diaSem = new Date(year, month, d).getDay()
      if (!diasClaseSet.has(diaSem)) continue
      const tieneAct = actividadesMes.some((a) => a.fecha === iso)
      if (tieneAct) planeadas++
      else sinPlanear++
    }
    return { planeadas, sinPlanear }
  }, [actividadesMes, diasClaseSet, diasEnMes, year, month])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Planeación 📆</h1>
        <p className="text-ink/50">Organiza las clases: quién enseña, qué se enseña y cuándo</p>
      </div>

      {diasClaseSet.size === 0 && (
        <div className="card border-2 border-sunshine-200 bg-sunshine-50">
          <p className="font-bold text-sunshine-800">Todavía no configuraste los días de clase.</p>
          <p className="mt-1 text-sm text-ink/60">
            Ve a <strong>Ajustes → Días de clase</strong> y activa los días que corresponda (ej. Domingo).
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Calendario */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}
                className="rounded-full px-3 py-1 text-xl font-bold text-ink/40 hover:bg-ink/5"
              >
                ‹
              </button>
              <h3 className="text-lg font-bold">
                {MESES[month]} {year}
              </h3>
              <button
                onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}
                className="rounded-full px-3 py-1 text-xl font-bold text-ink/40 hover:bg-ink/5"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {DIAS.map((d, i) => (
                <div key={i} className="pb-2 text-xs font-extrabold uppercase text-ink/40">
                  {d}
                </div>
              ))}
              {celdas.map((d, i) => {
                if (d === null) return <div key={i} />
                const iso = toISO(year, month, d)
                const diaSemana = new Date(year, month, d).getDay()
                const esClase = diasClaseSet.has(diaSemana)
                const esHoy = iso === hoy
                const seleccionado = iso === selectedDay
                const tieneActividad = actividadesMes.some((a) => a.fecha === iso)
                const tieneCobertura = coberturaMes.some((c) => c.fecha === iso)
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(iso)}
                    className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl p-1 text-sm font-bold transition-colors
                      ${seleccionado ? 'bg-sky-400 text-white shadow-pop' : esClase ? 'bg-sky-50 hover:bg-sky-100' : esHoy ? 'bg-sunshine-100' : 'hover:bg-ink/5'}
                      ${esHoy && !seleccionado ? 'ring-2 ring-sunshine-300' : ''}`}
                  >
                    <span>{d}</span>
                    <div className="flex gap-0.5">
                      {esClase && <span className={`h-1.5 w-1.5 rounded-full ${seleccionado ? 'bg-white' : 'bg-sky-400'}`} />}
                      {tieneActividad && <span className={`h-1.5 w-1.5 rounded-full ${seleccionado ? 'bg-white/70' : 'bg-grass-400'}`} />}
                      {tieneCobertura && !tieneActividad && <span className={`h-1.5 w-1.5 rounded-full ${seleccionado ? 'bg-white/70' : 'bg-grape-400'}`} />}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[0.65rem] font-bold text-ink/40">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-sky-400" /> Día de clase</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-grass-400" /> Actividad planeada</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-grape-400" /> Cobertura asignada</span>
            </div>
          </div>

          {/* Resumen del mes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card flex flex-col items-center gap-1 !p-3 text-center">
              <span className="text-lg font-extrabold text-grass-600">{resumenMes.planeadas}</span>
              <span className="text-[0.65rem] font-bold text-ink/40">Días con actividad</span>
            </div>
            <div className="card flex flex-col items-center gap-1 !p-3 text-center">
              <span className={`text-lg font-extrabold ${resumenMes.sinPlanear > 0 ? 'text-coral-600' : 'text-grass-600'}`}>{resumenMes.sinPlanear}</span>
              <span className="text-[0.65rem] font-bold text-ink/40">Sin planear</span>
            </div>
          </div>
        </div>

        {/* Panel de detalle del día */}
        <div className="flex flex-col gap-4">
          {!selectedDay ? (
            <div className="card flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-4xl">📅</span>
              <p className="font-bold text-ink/40">Elige un día del calendario</p>
              <p className="text-sm text-ink/30">para ver o planear cada clase</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold capitalize">
                    {new Date(selectedDay + 'T00:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h2>
                  {esDiaClase ? (
                    <p className="text-sm font-bold text-sky-500">Día de clase</p>
                  ) : (
                    <p className="text-sm text-ink/40">No es día de clase</p>
                  )}
                </div>
              </div>

              {nivelesVisibles.length === 0 ? (
                <p className="card text-ink/50">
                  {esDocente ? 'Todavía no tienes clases asignadas.' : 'Todavía no hay clases creadas.'}
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {nivelesVisibles.map((nivel) => {
                    const color = nivel.color || 'sky'
                    const fijosGenerales = asignaciones
                      .filter((a) => a.nivel_id === nivel.id)
                      .map((a) => a.docente?.nombre_completo)
                      .filter(Boolean)
                    const actividad = actividadesDelDia.find((a) => a.nivel_id === nivel.id)
                    const soloUnHorario = horariosDelDia.length <= 1

                    return (
                      <div
                        key={nivel.id}
                        className={`card animate-pop-in overflow-hidden border-l-4 !p-0 ${STRIPE_CLASSES[color] || STRIPE_CLASSES.sky}`}
                      >
                        {/* Encabezado de la clase */}
                        <div className={`flex items-center justify-between gap-3 px-4 py-3 ${BG_LIGHT[color] || BG_LIGHT.sky}`}>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-white ${DOT_CLASSES[color] || DOT_CLASSES.sky}`}>
                              {nivel.nombre.charAt(0)}
                            </span>
                            <div>
                              <h3 className="font-bold leading-tight">{nivel.nombre}</h3>
                              {nivel.edad_min != null && (
                                <p className="text-[0.65rem] text-ink/40">{nivel.edad_min}–{nivel.edad_max ?? '?'} años</p>
                              )}
                            </div>
                          </div>
                          {actividad ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-grass-100 px-2 py-0.5 text-[0.65rem] font-bold text-grass-700">
                              ✅ Planeada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5 text-[0.65rem] font-bold text-ink/40">
                              Sin planear
                            </span>
                          )}
                        </div>

                        {/* Docentes y horarios */}
                        <div className="px-4 py-3">
                          <p className="mb-2 text-[0.65rem] font-extrabold uppercase tracking-wide text-ink/30">Docentes</p>
                          <div className="flex flex-col gap-2">
                            {horariosDelDia.map((horario) => {
                              const fijo = asignacionesHorario.find((a) => a.nivel_id === nivel.id && a.horario_id === horario.id)
                              const override = coberturaDelDia.find((c) => c.nivel_id === nivel.id && c.horario_id === horario.id)
                              const nombreFijo = fijo?.docente?.nombre_completo
                              const respaldoGeneral = !nombreFijo && fijosGenerales.length > 0 ? fijosGenerales.join(', ') : null

                              return (
                                <div key={horario.id} className="rounded-xl bg-ink/[0.03] px-3 py-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {!soloUnHorario && (
                                      <span className="rounded-lg bg-ink/5 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-ink/40">{horario.nombre}</span>
                                    )}
                                    {override ? (
                                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${BADGE_CLASSES.grape}`}>
                                        🔁 {override.docente?.nombre_completo || 'Sin asignar'}
                                      </span>
                                    ) : nombreFijo ? (
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${BADGE_CLASSES[color] || BADGE_CLASSES.sky}`}>
                                        {nombreFijo}
                                      </span>
                                    ) : respaldoGeneral ? (
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${BADGE_CLASSES[color] || BADGE_CLASSES.sky}`}>
                                        {respaldoGeneral}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center rounded-full bg-coral-100 px-2 py-0.5 text-xs font-bold text-coral-700">
                                        Sin docente
                                      </span>
                                    )}
                                  </div>
                                  {!esDocente && (
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <label className="text-[0.65rem] font-bold text-ink/30">Cubre hoy:</label>
                                      <select
                                        className="input !w-auto !py-1 !text-xs"
                                        value={override?.docente_id || ''}
                                        onChange={(e) => asignarCobertura(nivel.id, horario.id, e.target.value || null)}
                                      >
                                        <option value="">{nombreFijo ? `Fijo (${nombreFijo})` : respaldoGeneral ? `Fijo (${respaldoGeneral})` : 'Sin asignar'}</option>
                                        {docentes.map((d) => (
                                          <option key={d.id} value={d.id}>
                                            {d.nombre_completo}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            {horariosDelDia.length === 0 && (
                              <p className="text-xs text-ink/30">No hay horarios configurados para este día.</p>
                            )}
                          </div>
                        </div>

                        {/* Actividad planeada */}
                        <div className="border-t border-ink/5 px-4 py-3">
                          <p className="mb-2 text-[0.65rem] font-extrabold uppercase tracking-wide text-ink/30">Actividad</p>
                          {actividad ? (
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold text-grass-700">📝 {actividad.titulo}</p>
                              </div>
                              <button
                                className="btn-secondary shrink-0 !py-1 !px-3 !text-xs"
                                onClick={() => openActividad(nivel, actividad)}
                              >
                                Editar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm text-ink/30">Sin actividad planeada</p>
                              <button
                                className="btn-primary shrink-0 !py-1.5 !px-3 !text-xs"
                                onClick={() => openActividad(nivel, null)}
                              >
                                + Planear
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        open={!!modalActividad}
        onClose={() => setModalActividad(null)}
        title={`${modalActividad?.actividad ? 'Editar' : 'Planear'} actividad — ${modalActividad?.nivel?.nombre || ''}`}
      >
        <form onSubmit={guardarActividad} className="flex flex-col gap-4">
          <div>
            <label className="label">Título</label>
            <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input"
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Versículo clave (opcional)</label>
            <input
              className="input"
              value={form.versiculo_clave}
              onChange={(e) => setForm({ ...form, versiculo_clave: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Historia bíblica (opcional)</label>
            <input
              className="input"
              value={form.historia_biblica}
              onChange={(e) => setForm({ ...form, historia_biblica: e.target.value })}
            />
          </div>
          <div>
            <label className="label">¿Pide una tarea?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, es_tarea: false })}
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${!form.es_tarea ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
              >
                Solo informativa
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, es_tarea: true })}
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${form.es_tarea ? 'bg-sky-400 text-white' : 'bg-ink/5'}`}
              >
                📝 Es una tarea
              </button>
            </div>
          </div>
          <p className="text-xs text-ink/40">
            Para agregar fotos u otros archivos, edítala después desde la pantalla de Actividades.
          </p>
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
