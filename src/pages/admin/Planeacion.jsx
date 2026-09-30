import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/Spinner'
import HorarioSemanal from '../../components/HorarioSemanal'
import { BADGE_CLASSES, DOT_CLASSES } from '../../lib/colors'
import EmptyState from '../../components/EmptyState'
import PrepararClaseModal from '../../components/PrepararClaseModal'
import { moverPdfsPlaneacionAPrivado } from '../../components/PlaneacionClaseModal'
import CronogramaNiveles from '../../components/CronogramaNiveles'
import TituloPagina from '../../components/ui/TituloPagina'
import { capitalizar, fechaLarga } from '../../lib/fechas'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function sumarDias(iso, n) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toISO(d.getFullYear(), d.getMonth(), d.getDate())
}
function inicioSemana(iso) {
  const d = new Date(iso + 'T00:00:00')
  return sumarDias(iso, -d.getDay())
}
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

export default function Planeacion() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
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
  const [devocionalesMes, setDevocionalesMes] = useState([])
  const [coberturaMes, setCoberturaMes] = useState([])
  const [planeacionesMes, setPlaneacionesMes] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)

  const [vista, setVista] = useState('cronograma')
  const [escala, setEscala] = useState('mes') // 'mes' | 'semana'
  const [semanaIni, setSemanaIni] = useState(() => inicioSemana(hoyISO()))
  const [preparar, setPreparar] = useState(null) // { nivel, fecha }

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
      .in('role', ['admin', 'coordinador', 'docente'])
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
  const inicioRango = escala === 'semana' ? semanaIni : inicioMes
  const finRango = escala === 'semana' ? sumarDias(semanaIni, 6) : finMes
  const fechasRango = useMemo(() => {
    const out = []
    for (let f = inicioRango; f <= finRango; f = sumarDias(f, 1)) out.push(f)
    return out
  }, [inicioRango, finRango])

  function irA(delta) {
    if (escala === 'semana') {
      const nueva = sumarDias(semanaIni, 7 * delta)
      setSemanaIni(nueva)
      const d = new Date(nueva + 'T00:00:00')
      setCursor({ year: d.getFullYear(), month: d.getMonth() })
    } else {
      setCursor((c) => {
        const m = c.month + delta
        return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 }
      })
    }
  }
  function irAHoy() {
    const h = new Date()
    setCursor({ year: h.getFullYear(), month: h.getMonth() })
    setSemanaIni(inicioSemana(hoyISO()))
  }
  function cambiarEscala(e) {
    setEscala(e)
    // Al pasar a semana, mostrar la semana de hoy si es este mes, o la primera del mes visible.
    if (e === 'semana') {
      const hoyStr = hoyISO()
      setSemanaIni(hoyStr >= inicioMes && hoyStr <= finMes ? inicioSemana(hoyStr) : inicioSemana(inicioMes))
    }
  }
  const tituloRango =
    escala === 'semana'
      ? `${new Date(inicioRango + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })} – ${new Date(finRango + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : `${MESES[month]} ${year}`

  const loadMes = useCallback(async () => {
    const [{ data: acts }, { data: devos }, { data: cob }, { data: plans }] = await Promise.all([
      supabase.from('actividades').select('id, nivel_id, fecha, titulo').gte('fecha', inicioRango).lte('fecha', finRango),
      supabase.from('devocionales_ninos').select('id, nivel_id, fecha, titulo, versiculo').gte('fecha', inicioRango).lte('fecha', finRango),
      supabase
        .from('cobertura_dia')
        .select('*, docente:profiles(nombre_completo)')
        .gte('fecha', inicioRango)
        .lte('fecha', finRango),
      supabase
        .from('planeacion_clase')
        .select('id, nivel_id, fecha')
        .gte('fecha', inicioRango)
        .lte('fecha', finRango),
    ])
    setPlaneacionesMes(plans || [])
    setActividadesMes(acts || [])
    setDevocionalesMes(devos || [])
    setCoberturaMes(cob || [])
  }, [inicioRango, finRango])

  useEffect(() => {
    loadMes()
  }, [loadMes])

  // Una vez: mover PDFs antiguos (públicos) al almacenamiento privado.
  useEffect(() => {
    if (['superadmin', 'admin', 'coordinador'].includes(profile?.role)) moverPdfsPlaneacionAPrivado().then(loadMes)
  }, [profile?.role])

  const diasClaseSet = useMemo(() => new Set((diasClase || []).filter((d) => d.activo).map((d) => d.dia_semana)), [diasClase])

  // Menos clics: si el día elegido no está en el rango visible, elegir solo el próximo día de clase.
  useEffect(() => {
    if (!diasClase || fechasRango.length === 0) return
    if (selectedDay && fechasRango.includes(selectedDay)) return
    const esClase = (f) => diasClaseSet.size === 0 || diasClaseSet.has(new Date(f + 'T00:00:00').getDay())
    const hoyStr = hoyISO()
    const clases = fechasRango.filter(esClase)
    const proximo = clases.find((f) => f >= hoyStr) || clases[clases.length - 1]
    if (proximo) setSelectedDay(proximo)
  }, [diasClase, diasClaseSet, fechasRango, selectedDay])

  const nivelesVisibles = useMemo(() => {
    if (!esDocente) return niveles
    const misNivelIds = new Set(asignaciones.filter((a) => a.docente_id === user?.id).map((a) => a.nivel_id))
    return niveles.filter((n) => misNivelIds.has(n.id))
  }, [niveles, asignaciones, esDocente, user?.id])

  const resumenMes = useMemo(() => {
    let planeadas = 0
    let sinPlanear = 0
    for (const iso of fechasRango) {
      const diaSem = new Date(iso + 'T00:00:00').getDay()
      if (!diasClaseSet.has(diaSem)) continue
      const tieneContenido =
        actividadesMes.some((a) => a.fecha === iso) ||
        devocionalesMes.some((dv) => dv.fecha === iso) ||
        planeacionesMes.some((pl) => pl.fecha === iso)
      if (tieneContenido) planeadas++
      else sinPlanear++
    }
    return { planeadas, sinPlanear }
  }, [actividadesMes, devocionalesMes, planeacionesMes, diasClaseSet, fechasRango])

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

  const coberturaDelDia = coberturaMes.filter((c) => c.fecha === selectedDay)
  const diaSemanaSeleccionado = selectedDay ? new Date(selectedDay + 'T00:00:00').getDay() : null
  const horariosDelDia = horarios.filter((h) => h.dia_semana === null || h.dia_semana === diaSemanaSeleccionado)
  const esDiaClase = diaSemanaSeleccionado !== null && diasClaseSet.has(diaSemanaSeleccionado)

  const diasCronograma = fechasRango.filter((f) => diasClaseSet.size === 0 || diasClaseSet.has(new Date(f + 'T00:00:00').getDay()))
  const tabClase = (activa) => `rounded-full px-4 py-2 text-sm font-bold transition-colors ${activa ? 'bg-sky-600 text-white shadow-pop' : 'bg-ink/5 text-ink/75 hover:bg-ink/10'}`

  return (
    <div className="flex flex-col gap-6">
      <div>
        <TituloPagina ruta="/planeacion">Planeación</TituloPagina>
        <p className="text-ink/70">Organiza las clases: quién enseña, qué se enseña y cuándo</p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Vista">
        <button role="tab" aria-selected={vista === 'cronograma'} onClick={() => setVista('cronograma')} className={tabClase(vista === 'cronograma')}>
          🗂️ Cronograma
        </button>
        <button role="tab" aria-selected={vista === 'horario'} onClick={() => setVista('horario')} className={tabClase(vista === 'horario')}>
          👥 Horario semanal
        </button>
      </div>

      {diasClaseSet.size === 0 && (
        <div className="card border-2 border-sunshine-200 bg-sunshine-50">
          <p className="font-bold text-sunshine-800">Todavía no configuraste los días de clase.</p>
          <p className="mt-1 text-sm text-ink/75">
            Ve a <strong>Ajustes → Días de clase</strong> y activa los días que corresponda (ej. Domingo).
          </p>
          {!esDocente && (
            <button type="button" onClick={() => navigate('/ajustes?s=horarios')} className="btn-primary mt-3 !py-2 !text-sm">
              Ir a Ajustes
            </button>
          )}
        </div>
      )}

      {vista === 'cronograma' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-full bg-ink/5 p-1" role="group" aria-label="Escala">
              {[['mes', 'Mes'], ['semana', 'Semana']].map(([v, t]) => (
                <button key={v} type="button" aria-pressed={escala === v} onClick={() => cambiarEscala(v)} className={`rounded-full px-4 py-1.5 text-sm font-bold ${escala === v ? 'bg-white text-sky-700 shadow-sm' : 'text-ink/70'}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => irA(-1)} aria-label={escala === 'semana' ? 'Semana anterior' : 'Mes anterior'} title={escala === 'semana' ? 'Semana anterior' : 'Mes anterior'} className="rounded-full px-3 py-1 text-xl font-bold text-ink/65 hover:bg-ink/5">‹</button>
              <span className="min-w-[9rem] text-center text-base font-bold">{capitalizar(tituloRango)}</span>
              <button type="button" onClick={() => irA(1)} aria-label={escala === 'semana' ? 'Semana siguiente' : 'Mes siguiente'} title={escala === 'semana' ? 'Semana siguiente' : 'Mes siguiente'} className="rounded-full px-3 py-1 text-xl font-bold text-ink/65 hover:bg-ink/5">›</button>
            </div>
            <button type="button" onClick={irAHoy} className="rounded-full bg-sunshine-100 px-3 py-1.5 text-sm font-bold text-sunshine-800 hover:bg-sunshine-200">Hoy</button>
            {diasClaseSet.size > 0 && (
              <span className="ml-auto flex gap-2 text-xs font-bold">
                <span className="rounded-full bg-grass-50 px-3 py-1.5 text-grass-800">{resumenMes.planeadas} con contenido</span>
                <span className={`rounded-full px-3 py-1.5 ${resumenMes.sinPlanear > 0 ? 'bg-coral-50 text-coral-700' : 'bg-grass-50 text-grass-800'}`}>{resumenMes.sinPlanear} sin planear</span>
              </span>
            )}
          </div>

          {nivelesVisibles.length === 0 ? (
            esDocente ? (
              <EmptyState icon="🎒" titulo="Todavía no tienes niveles asignados" texto="Pide al administrador que te asigne a un nivel en la sección Niveles." />
            ) : (
              <EmptyState icon="🎒" titulo="Todavía no hay niveles" texto="Crea los niveles (grupos por edad) para planear cada día." accion={{ label: '+ Crear niveles', to: '/clases' }} />
            )
          ) : (
            <>
              <CronogramaNiveles
                niveles={nivelesVisibles}
                dias={diasCronograma}
                hoy={hoyISO()}
                actividades={actividadesMes}
                devocionales={devocionalesMes}
                planeaciones={planeacionesMes}
                cobertura={coberturaMes}
                asignaciones={asignaciones}
                asignacionesHorario={asignacionesHorario}
                horarios={horarios}
                onAbrir={(nivel, fecha) => setPreparar({ nivel, fecha })}
                diaSeleccionado={esDocente ? undefined : selectedDay}
                onDia={esDocente ? undefined : setSelectedDay}
              />

              {!esDocente && selectedDay && (
                <section className="card flex flex-col gap-3" aria-labelledby="quien-ensena">
                  <div>
                    <h2 id="quien-ensena" className="text-lg font-bold">
                      👥 Quién enseña · <span>{fechaLarga(selectedDay)}</span>
                    </h2>
                    <p className="text-sm text-ink/70">Toca una fecha del cronograma para cambiar de día. Si alguien falta, elige quién cubre.</p>
                  </div>
                  {horariosDelDia.length === 0 && (
                    <p className="text-sm text-ink/70">Para elegir quién cubre cuando alguien falta, crea los horarios en <button type="button" onClick={() => navigate('/ajustes?s=horarios')} className="font-bold text-sky-700 hover:underline">Ajustes → Días y horarios</button>.</p>
                  )}
                  {!esDiaClase && <p className="rounded-xl bg-sunshine-50 px-3 py-2 text-sm font-bold text-sunshine-800">Este día no es día de clase.</p>}
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {nivelesVisibles.map((nivel) => {
                      const color = nivel.color || 'sky'
                      const fijosGenerales = asignaciones.filter((a) => a.nivel_id === nivel.id).map((a) => a.docente?.nombre_completo).filter(Boolean)
                      const soloUnHorario = horariosDelDia.length <= 1
                      return (
                        <div key={nivel.id} className={`flex flex-col gap-2 rounded-2xl border-l-4 bg-white p-3 ring-1 ring-ink/10 ${STRIPE_CLASSES[color] || STRIPE_CLASSES.sky}`}>
                          <h3 className="flex items-center gap-2 font-bold">
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_CLASSES[color] || DOT_CLASSES.sky}`} aria-hidden="true" />
                            <span className="truncate">{nivel.nombre}</span>
                          </h3>
                          {horariosDelDia.length === 0 ? (
                            fijosGenerales.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {fijosGenerales.map((n) => (
                                  <span key={n} className={`badge ${BADGE_CLASSES[color] || BADGE_CLASSES.sky}`}>{n}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="badge w-fit bg-coral-100 text-coral-700">Sin docente</span>
                            )
                          ) : (
                            horariosDelDia.map((horario) => {
                              const fijo = asignacionesHorario.find((a) => a.nivel_id === nivel.id && a.horario_id === horario.id)
                              const override = coberturaDelDia.find((c) => c.nivel_id === nivel.id && c.horario_id === horario.id)
                              const nombreFijo = fijo?.docente?.nombre_completo || (fijosGenerales.length ? fijosGenerales.join(', ') : null)
                              return (
                                <div key={horario.id} className="flex flex-col gap-1">
                                  {!soloUnHorario && <span className="text-xs font-extrabold uppercase text-ink/65">{horario.nombre}</span>}
                                  <label className="sr-only" htmlFor={`cubre-${nivel.id}-${horario.id}`}>Quién enseña en {nivel.nombre} {horario.nombre}</label>
                                  <select
                                    id={`cubre-${nivel.id}-${horario.id}`}
                                    className={`input !py-1.5 !text-sm ${override ? '!border-grape-300 !bg-grape-50' : !nombreFijo ? '!border-coral-300' : ''}`}
                                    value={override?.docente_id || ''}
                                    onChange={(e) => asignarCobertura(nivel.id, horario.id, e.target.value || null)}
                                  >
                                    <option value="">{nombreFijo ? `${nombreFijo} (fijo)` : 'Sin docente'}</option>
                                    {docentes.map((d) => (
                                      <option key={d.id} value={d.id}>🔁 {d.nombre_completo}</option>
                                    ))}
                                  </select>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      {vista === 'horario' && (
        <HorarioSemanal
          diasClase={diasClase}
          niveles={niveles}
          docentes={docentes}
          asignaciones={asignaciones}
          asignacionesHorario={asignacionesHorario}
          devocionalesMes={devocionalesMes}
          esDocente={esDocente}
          miId={user?.id}
        />
      )}

      <PrepararClaseModal
        open={!!preparar}
        onClose={() => setPreparar(null)}
        nivel={preparar?.nivel}
        fecha={preparar?.fecha}
        pasoInicial={preparar?.paso}
        userId={user?.id}
        onSaved={loadMes}
      />
    </div>
  )
}
