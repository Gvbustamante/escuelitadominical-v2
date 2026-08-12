import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'

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

export default function Planeacion() {
  const { user } = useAuth()
  const [cursor, setCursor] = useState(() => {
    const h = new Date()
    return { year: h.getFullYear(), month: h.getMonth() }
  })
  const [diasClase, setDiasClase] = useState(null)
  const [niveles, setNiveles] = useState([])
  const [docentes, setDocentes] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [actividadesMes, setActividadesMes] = useState([])
  const [coberturaMes, setCoberturaMes] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)

  const [modalActividad, setModalActividad] = useState(null) // { nivel, actividad|null }
  const [form, setForm] = useState({ titulo: '', descripcion: '', versiculo_clave: '', historia_biblica: '', visible_padres: true, es_tarea: false })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('dias_clase').select('*').then(({ data }) => setDiasClase(data || []))
    supabase
      .from('niveles')
      .select('*')
      .eq('activo', true)
      .order('edad_min', { ascending: true, nullsFirst: true })
      .then(({ data }) => setNiveles(data || []))
    supabase
      .from('profiles')
      .select('id, nombre_completo')
      .eq('role', 'docente')
      .eq('activo', true)
      .order('nombre_completo')
      .then(({ data }) => setDocentes(data || []))
    supabase.from('docentes_niveles').select('docente_id, nivel_id, docente:profiles(nombre_completo)').then(({ data }) => setAsignaciones(data || []))
  }, [])

  const { year, month } = cursor
  const inicioMes = toISO(year, month, 1)
  const finMes = toISO(year, month, new Date(year, month + 1, 0).getDate())

  const loadMes = useCallback(async () => {
    const [{ data: acts }, { data: cob }] = await Promise.all([
      supabase.from('actividades').select('id, nivel_id, fecha, titulo').gte('fecha', inicioMes).lte('fecha', finMes),
      supabase.from('cobertura_dia').select('*, docente:profiles(nombre_completo)').gte('fecha', inicioMes).lte('fecha', finMes),
    ])
    setActividadesMes(acts || [])
    setCoberturaMes(cob || [])
  }, [inicioMes, finMes])

  useEffect(() => {
    loadMes()
  }, [loadMes])

  const diasClaseSet = useMemo(() => new Set((diasClase || []).filter((d) => d.activo).map((d) => d.dia_semana)), [diasClase])

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

  async function asignarCobertura(nivelId, docenteId) {
    if (!docenteId) {
      await supabase.from('cobertura_dia').delete().eq('nivel_id', nivelId).eq('fecha', selectedDay)
    } else {
      await supabase
        .from('cobertura_dia')
        .upsert(
          { nivel_id: nivelId, fecha: selectedDay, docente_id: docenteId, updated_at: new Date().toISOString() },
          { onConflict: 'nivel_id,fecha' },
        )
    }
    loadMes()
  }

  if (diasClase === null) return <Spinner />

  const hoy = hoyISO()
  const coberturaDelDia = coberturaMes.filter((c) => c.fecha === selectedDay)
  const actividadesDelDia = actividadesMes.filter((a) => a.fecha === selectedDay)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Planeación 📆</h1>
        <p className="text-ink/50">Días de clase, quién cubre cada una y qué se va a enseñar</p>
      </div>

      {diasClaseSet.size === 0 && (
        <div className="card border-2 border-sunshine-200 bg-sunshine-50">
          <p className="font-bold text-sunshine-800">Todavía no configuraste los días de clase.</p>
          <p className="mt-1 text-sm text-ink/60">
            Ve a <strong>Ajustes → Días de clase</strong> y activa los días que corresponda (ej. Domingo).
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
              const esDiaClase = diasClaseSet.has(diaSemana)
              const esHoy = iso === hoy
              const seleccionado = iso === selectedDay
              const tieneAlgo = actividadesMes.some((a) => a.fecha === iso) || coberturaMes.some((c) => c.fecha === iso)
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(iso)}
                  className={`flex aspect-square flex-col items-center justify-start gap-0.5 rounded-xl p-1 text-sm font-bold transition-colors
                    ${seleccionado ? 'bg-sky-400 text-white' : esDiaClase ? 'bg-sky-50 hover:bg-sky-100' : esHoy ? 'bg-sunshine-100' : 'hover:bg-ink/5'}
                    ${esHoy && !seleccionado ? 'ring-2 ring-sunshine-300' : ''}`}
                >
                  <span>{d}</span>
                  {esDiaClase && <span className={`h-1.5 w-1.5 rounded-full ${seleccionado ? 'bg-white' : 'bg-sky-400'}`} />}
                  {tieneAlgo && !esDiaClase && <span className={`h-1.5 w-1.5 rounded-full ${seleccionado ? 'bg-white' : 'bg-coral-400'}`} />}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-ink/40">🔵 Día de clase configurado · anillo amarillo = hoy</p>
        </div>

        <div className="flex flex-col gap-3">
          {!selectedDay ? (
            <p className="card text-ink/50">Elige un día del calendario para ver o planear cada clase.</p>
          ) : (
            <>
              <p className="font-bold">
                {new Date(selectedDay + 'T00:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {niveles.map((nivel) => {
                const fijos = asignaciones.filter((a) => a.nivel_id === nivel.id).map((a) => a.docente?.nombre_completo).filter(Boolean)
                const override = coberturaDelDia.find((c) => c.nivel_id === nivel.id)
                const actividad = actividadesDelDia.find((a) => a.nivel_id === nivel.id)
                return (
                  <div key={nivel.id} className="card">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold">{nivel.nombre}</h3>
                      {override ? (
                        <span className="badge bg-grape-100 text-grape-700">🔁 {override.docente?.nombre_completo || 'Sin asignar'}</span>
                      ) : fijos.length > 0 ? (
                        <span className="badge bg-sky-100 text-sky-700">{fijos.join(', ')}</span>
                      ) : (
                        <span className="badge bg-coral-100 text-coral-700">Sin docente</span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs font-bold text-ink/40">Cubre este día:</label>
                      <select
                        className="input !w-auto !py-1 !text-sm"
                        value={override?.docente_id || ''}
                        onChange={(e) => asignarCobertura(nivel.id, e.target.value || null)}
                      >
                        <option value="">
                          {fijos.length > 0 ? `Fijo (${fijos.join(', ')})` : 'Sin asignar'}
                        </option>
                        {docentes.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.nombre_completo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-ink/5 px-3 py-2">
                      {actividad ? (
                        <p className="min-w-0 truncate text-sm font-bold text-grass-700">📝 {actividad.titulo}</p>
                      ) : (
                        <p className="text-sm text-ink/40">Sin actividad planeada</p>
                      )}
                      <button
                        className="btn-secondary shrink-0 !py-1 !px-3 !text-xs"
                        onClick={() => openActividad(nivel, actividad)}
                      >
                        {actividad ? 'Editar' : '+ Planear'}
                      </button>
                    </div>
                  </div>
                )
              })}
              {niveles.length === 0 && <p className="card text-ink/50">Todavía no hay clases creadas.</p>}
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
