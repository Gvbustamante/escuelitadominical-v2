import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'
import HorarioSemanal from '../../components/HorarioSemanal'
import PlaneacionClaseModal, { urlPdfPlaneacion } from '../../components/PlaneacionClaseModal'
import RichTextView from '../../components/RichTextView'
import { BADGE_CLASSES, DOT_CLASSES } from '../../lib/colors'
import EmptyState from '../../components/EmptyState'
import PrepararClaseModal from '../../components/PrepararClaseModal'
import CronogramaNiveles from '../../components/CronogramaNiveles'
import TituloPagina from '../../components/ui/TituloPagina'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

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

const BG_LIGHT = {
  sky: 'bg-sky-50/60',
  grass: 'bg-grass-50/60',
  sunshine: 'bg-sunshine-50/60',
  coral: 'bg-coral-50/60',
  grape: 'bg-grape-50/60',
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
  const [modalPlaneacion, setModalPlaneacion] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  const [vista, setVista] = useState('calendario')
  const [escala, setEscala] = useState('mes') // 'mes' | 'semana'
  const [semanaIni, setSemanaIni] = useState(() => inicioSemana(hoyISO()))
  const [preparar, setPreparar] = useState(null) // { nivel, fecha }
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
        .select('id, nivel_id, fecha, contenido, pdf_path, pdf_nombre, updated_at, autor:profiles(nombre_completo)')
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

  const primerDia = new Date(year, month, 1).getDay()
  const diasEnMes = new Date(year, month + 1, 0).getDate()
  const celdas = []
  for (let i = 0; i < primerDia; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)

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
  const devocionalesDelDia = devocionalesMes.filter((dv) => dv.fecha === selectedDay)
  const actividadesDelDia = actividadesMes.filter((a) => a.fecha === selectedDay)
  const planeacionesDelDia = planeacionesMes.filter((pl) => pl.fecha === selectedDay)
  const diaSemanaSeleccionado = selectedDay ? new Date(selectedDay + 'T00:00:00').getDay() : null
  const horariosDelDia = horarios.filter((h) => h.dia_semana === null || h.dia_semana === diaSemanaSeleccionado)
  const esDiaClase = diaSemanaSeleccionado !== null && diasClaseSet.has(diaSemanaSeleccionado)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <TituloPagina ruta="/planeacion">Planeación</TituloPagina>
        <p className="text-ink/70">Organiza las clases: quién enseña, qué se enseña y cuándo</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setVista('calendario')}
          className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${vista === 'calendario' ? 'bg-sky-600 text-white shadow-pop' : 'bg-ink/5 text-ink/75 hover:bg-ink/10'}`}
        >
          📅 Calendario
        </button>
        <button
          onClick={() => setVista('cronograma')}
          className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${vista === 'cronograma' ? 'bg-sky-600 text-white shadow-pop' : 'bg-ink/5 text-ink/75 hover:bg-ink/10'}`}
        >
          🗂️ Cronograma
        </button>
        <button
          onClick={() => setVista('horario')}
          className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${vista === 'horario' ? 'bg-sky-600 text-white shadow-pop' : 'bg-ink/5 text-ink/75 hover:bg-ink/10'}`}
        >
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
            <button type="button" onClick={() => navigate('/ajustes')} className="btn-primary mt-3 !py-2 !text-sm">
              Ir a Ajustes
            </button>
          )}
        </div>
      )}

      {vista !== 'horario' && (
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
            <span className="min-w-[9rem] text-center text-base font-bold capitalize">{tituloRango}</span>
            <button type="button" onClick={() => irA(1)} aria-label={escala === 'semana' ? 'Semana siguiente' : 'Mes siguiente'} title={escala === 'semana' ? 'Semana siguiente' : 'Mes siguiente'} className="rounded-full px-3 py-1 text-xl font-bold text-ink/65 hover:bg-ink/5">›</button>
          </div>
          <button type="button" onClick={irAHoy} className="rounded-full bg-sunshine-100 px-3 py-1.5 text-sm font-bold text-sunshine-800 hover:bg-sunshine-200">Hoy</button>
        </div>
      )}

      {vista === 'cronograma' && (
        nivelesVisibles.length === 0 ? (
          <EmptyState icon="🎒" titulo="Todavía no hay niveles" texto="Crea los niveles para ver su cronograma." accion={esDocente ? undefined : { label: '+ Crear niveles', to: '/clases' }} />
        ) : (
          <CronogramaNiveles
            niveles={nivelesVisibles}
            dias={fechasRango.filter((f) => diasClaseSet.size === 0 || diasClaseSet.has(new Date(f + 'T00:00:00').getDay()))}
            hoy={hoyISO()}
            actividades={actividadesMes}
            devocionales={devocionalesMes}
            planeaciones={planeacionesMes}
            cobertura={coberturaMes}
            asignaciones={asignaciones}
            asignacionesHorario={asignacionesHorario}
            horarios={horarios}
            onAbrir={(nivel, fecha) => setPreparar({ nivel, fecha })}
          />
        )
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

      {vista === 'calendario' && <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        {/* Calendario */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="grid grid-cols-7 gap-1 text-center">
              {DIAS.map((d, i) => (
                <div key={i} className="pb-2 text-xs font-extrabold uppercase text-ink/65">
                  {d}
                </div>
              ))}
              {(escala === 'semana' ? fechasRango : celdas).map((d, i) => {
                if (d === null) return <div key={i} />
                const iso = escala === 'semana' ? d : toISO(year, month, d)
                const diaSemana = new Date(iso + 'T00:00:00').getDay()
                const esClase = diasClaseSet.has(diaSemana)
                const esHoy = iso === hoy
                const seleccionado = iso === selectedDay
                const tieneDevocional = devocionalesMes.some((dv) => dv.fecha === iso)
                const tieneActividad = actividadesMes.some((a) => a.fecha === iso)
                const tieneCobertura = coberturaMes.some((c) => c.fecha === iso)
                const tienePlaneacion = planeacionesMes.some((pl) => pl.fecha === iso)
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(iso)}
                    className={`flex ${escala === 'semana' ? 'min-h-[4.5rem]' : 'aspect-square'} flex-col items-center justify-center gap-0.5 rounded-xl p-1 text-sm font-bold transition-colors
                      ${seleccionado ? 'bg-sky-600 text-white shadow-pop' : esClase ? 'bg-sky-50 hover:bg-sky-100' : esHoy ? 'bg-sunshine-100' : 'hover:bg-ink/5'}
                      ${esHoy && !seleccionado ? 'ring-2 ring-sunshine-300' : ''}`}
                  >
                    <span>{escala === 'semana' ? new Date(iso + 'T00:00:00').getDate() : d}</span>
                    <div className="flex gap-0.5">
                      {esClase && <span className={`h-1.5 w-1.5 rounded-full ${seleccionado ? 'bg-white' : 'bg-sky-400'}`} />}
                      {tieneDevocional && <span className={`h-1.5 w-1.5 rounded-full ${seleccionado ? 'bg-white/70' : 'bg-sunshine-400'}`} />}
                      {tieneActividad && <span className={`h-1.5 w-1.5 rounded-full ${seleccionado ? 'bg-white/70' : 'bg-grass-400'}`} />}
                      {tienePlaneacion && <span className={`h-1.5 w-1.5 rounded-full ${seleccionado ? 'bg-white/70' : 'bg-grape-400'}`} />}
                      {tieneCobertura && !tieneActividad && !tieneDevocional && <span className={`h-1.5 w-1.5 rounded-full ${seleccionado ? 'bg-white/70' : 'bg-ink/30'}`} />}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-ink/65">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-sky-400" /> Día de clase</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-sunshine-400" /> Devocional</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-grass-400" /> Actividad</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-grape-400" /> Planeación</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-ink/30" /> Cobertura</span>
            </div>
          </div>

          {/* Resumen del mes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card flex flex-col items-center gap-1 !p-3 text-center">
              <span className="text-lg font-extrabold text-grass-600">{resumenMes.planeadas}</span>
              <span className="text-xs font-bold text-ink/65">Días con contenido</span>
            </div>
            <div className="card flex flex-col items-center gap-1 !p-3 text-center">
              <span className={`text-lg font-extrabold ${resumenMes.sinPlanear > 0 ? 'text-coral-600' : 'text-grass-600'}`}>{resumenMes.sinPlanear}</span>
              <span className="text-xs font-bold text-ink/65">Sin planear</span>
            </div>
          </div>
        </div>

        {/* Panel de detalle del día */}
        <div className="flex flex-col gap-4">
          {!selectedDay ? (
            <div className="card flex flex-col items-center gap-3 py-8 text-center">
              <span className="text-4xl">📅</span>
              <p className="font-bold text-ink/65">Elige un día del calendario</p>
              <p className="text-sm text-ink/65">para ver o planear cada clase</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold capitalize">
                    {new Date(selectedDay + 'T00:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h2>
                  {esDiaClase ? (
                    <p className="text-sm font-bold text-sky-600">Día de clase</p>
                  ) : (
                    <p className="text-sm text-ink/65">No es día de clase</p>
                  )}
                </div>
              </div>

              {nivelesVisibles.length === 0 ? (
                esDocente ? (
                  <EmptyState icon="🎒" titulo="Todavía no tienes niveles asignados" texto="Pide al administrador que te asigne a un nivel en la sección Niveles." />
                ) : (
                  <EmptyState icon="🎒" titulo="Todavía no hay niveles creados" texto="Crea los niveles (grupos por edad) para poder planear cada día." accion={{ label: '+ Crear niveles', to: '/clases' }} />
                )
              ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                  {nivelesVisibles.map((nivel) => {
                    const color = nivel.color || 'sky'
                    const fijosGenerales = asignaciones
                      .filter((a) => a.nivel_id === nivel.id)
                      .map((a) => a.docente?.nombre_completo)
                      .filter(Boolean)
                    const devosNivel = devocionalesDelDia.filter((dv) => dv.nivel_id === nivel.id || !dv.nivel_id)
                    const actividad = actividadesDelDia.find((a) => a.nivel_id === nivel.id)
                    const planeacion = planeacionesDelDia.find((pl) => pl.nivel_id === nivel.id)
                    const soloUnHorario = horariosDelDia.length <= 1

                    return (
                      <div
                        key={nivel.id}
                        className={`card animate-pop-in overflow-hidden border-l-4 !p-0 ${STRIPE_CLASSES[color] || STRIPE_CLASSES.sky}`}
                      >
                        {/* Encabezado de la clase */}
                        <div className={`flex items-center justify-between gap-2 px-3 py-2 ${BG_LIGHT[color] || BG_LIGHT.sky}`}>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white ${DOT_CLASSES[color] || DOT_CLASSES.sky}`}>
                              {Array.from(nivel.nombre)[0]}
                            </span>
                            <div>
                              <h3 className="font-bold leading-tight">{nivel.nombre}</h3>
                              {nivel.edad_min != null && (
                                <p className="text-xs text-ink/65">{nivel.edad_min}–{nivel.edad_max ?? '?'} años</p>
                              )}
                            </div>
                          </div>
                          {(() => {
                            const listos = (devosNivel.length > 0 ? 1 : 0) + (actividad ? 1 : 0) + (planeacion ? 1 : 0)
                            return listos === 3 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-grass-100 px-2 py-0.5 text-xs font-bold text-grass-700">✅ Clase lista</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-bold text-ink/70">{listos} de 3 listos</span>
                            )
                          })()}
                        </div>
                        <div className="px-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setPreparar({ nivel, fecha: selectedDay })}
                            className="btn-primary w-full justify-center !py-2 !text-sm"
                          >
                            ✨ Preparar clase
                          </button>
                        </div>

                        {/* Docentes */}
                        <div className="px-3 py-2">
                          <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-ink/65">Docentes</p>
                          <div className="flex flex-col gap-2">
                            {horariosDelDia.map((horario) => {
                              const fijo = asignacionesHorario.find((a) => a.nivel_id === nivel.id && a.horario_id === horario.id)
                              const override = coberturaDelDia.find((c) => c.nivel_id === nivel.id && c.horario_id === horario.id)
                              const nombreFijo = fijo?.docente?.nombre_completo
                              const respaldoGeneral = !nombreFijo && fijosGenerales.length > 0 ? fijosGenerales.join(', ') : null

                              return (
                                <div key={horario.id} className="rounded-lg bg-ink/[0.03] px-2.5 py-1.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {!soloUnHorario && (
                                      <span className="rounded-lg bg-ink/5 px-2 py-0.5 text-xs font-bold uppercase text-ink/65">{horario.nombre}</span>
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
                                      <label className="text-xs font-bold text-ink/65">Cubre hoy:</label>
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
                            {horariosDelDia.length === 0 &&
                              (fijosGenerales.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {fijosGenerales.map((n) => (
                                    <span key={n} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${BADGE_CLASSES[color] || BADGE_CLASSES.sky}`}>{n}</span>
                                  ))}
                                </div>
                              ) : (
                                <span className="inline-flex w-fit items-center rounded-full bg-coral-100 px-2 py-0.5 text-xs font-bold text-coral-700">Sin docente</span>
                              ))}
                          </div>
                        </div>

                        {/* Planeación de la clase */}
                        <div className="border-t border-ink/5 px-3 py-2">
                          <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-ink/65">📝 Planeación de la clase</p>
                          {planeacion ? (
                            <div className="flex flex-col gap-2">
                              {planeacion.contenido && (
                                <div className="max-h-24 overflow-hidden text-sm text-ink/70 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
                                  <RichTextView html={planeacion.contenido} />
                                </div>
                              )}
                              {planeacion.pdf_path && (
                                <a
                                  href={urlPdfPlaneacion(planeacion.pdf_path)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex max-w-full items-center gap-1 self-start truncate rounded-full bg-grape-50 px-2.5 py-1 text-xs font-bold text-grape-700 hover:bg-grape-100"
                                >
                                  📄 {planeacion.pdf_nombre || 'Ver PDF'}
                                </a>
                              )}
                              <div className="flex items-center justify-between gap-2">
                                {planeacion.autor?.nombre_completo && (
                                  <span className="truncate text-xs text-ink/70">Por {planeacion.autor.nombre_completo}</span>
                                )}
                                <button
                                  className="btn-secondary ml-auto shrink-0 !py-1 !px-3 !text-xs"
                                  onClick={() => setModalPlaneacion({ nivel, planeacion })}
                                >
                                  Ver / editar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm text-ink/65">Sin planeación</p>
                              <button
                                className="btn-primary shrink-0 !py-1.5 !px-3 !text-xs"
                                onClick={() => setModalPlaneacion({ nivel, planeacion: null })}
                              >
                                + Escribir o subir PDF
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Devocional */}
                        <div className="border-t border-ink/5 px-3 py-2">
                          <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-ink/65">🙏 Enseñanza</p>
                          {devosNivel.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {devosNivel.map((dv) => (
                                <div
                                  key={dv.id}
                                  className="flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-sunshine-50/60 px-2.5 py-1.5 transition-colors hover:bg-sunshine-100/60"
                                  onClick={() => navigate(`/devocionales/${dv.id}`)}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-bold text-sunshine-800">🙏 {dv.titulo}</p>
                                    {dv.versiculo && <p className="mt-0.5 truncate text-xs italic text-ink/65">📖 {dv.versiculo}</p>}
                                    {!dv.nivel_id && <span className="text-xs font-bold text-ink/65">Para todos los niveles</span>}
                                  </div>
                                  <span className="shrink-0 text-xs text-sunshine-700">Ver →</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm text-ink/65">Sin devocional para este día</p>
                              <button
                                className="btn-primary shrink-0 !py-1.5 !px-3 !text-xs"
                                onClick={() => setPreparar({ nivel, fecha: selectedDay, paso: 'ensenanza' })}
                              >
                                + Crear devocional
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Actividad */}
                        <div className="border-t border-ink/5 px-3 py-2">
                          <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-ink/65">🎨 Actividad</p>
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
                              <p className="text-sm text-ink/65">Sin actividad complementaria</p>
                              <button
                                className="btn-secondary shrink-0 !py-1.5 !px-3 !text-xs"
                                onClick={() => setPreparar({ nivel, fecha: selectedDay, paso: 'actividad' })}
                              >
                                + Agregar
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
      </div>}

      <PrepararClaseModal
        open={!!preparar}
        onClose={() => setPreparar(null)}
        nivel={preparar?.nivel}
        fecha={preparar?.fecha}
        pasoInicial={preparar?.paso}
        userId={user?.id}
        onSaved={loadMes}
      />

      <PlaneacionClaseModal
        open={!!modalPlaneacion}
        onClose={() => setModalPlaneacion(null)}
        nivel={modalPlaneacion?.nivel}
        planeacion={modalPlaneacion?.planeacion || null}
        fecha={selectedDay}
        userId={user?.id}
        onSaved={loadMes}
      />

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
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${!form.es_tarea ? 'bg-sky-600 text-white' : 'bg-ink/5'}`}
              >
                Solo informativa
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, es_tarea: true })}
                className={`flex-1 rounded-chunky px-3 py-2 text-sm font-bold ${form.es_tarea ? 'bg-sky-600 text-white' : 'bg-ink/5'}`}
              >
                📝 Es una tarea
              </button>
            </div>
          </div>
          <p className="text-xs text-ink/65">
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
