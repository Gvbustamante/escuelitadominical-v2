import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useMisHijos } from '../lib/useMisHijos'
import Spinner from '../components/Spinner'
import HijoSelector from '../components/HijoSelector'
import { BADGE_CLASSES } from '../lib/colors'

function calcularEdad(fecha) {
  if (!fecha) return '—'
  const nacimiento = new Date(fecha)
  const hoy = new Date()
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const m = hoy.getMonth() - nacimiento.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return edad
}

function formatFecha(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MiFamilia() {
  const { user } = useAuth()
  const hijos = useMisHijos()
  const [selectedId, setSelectedId] = useState(null)
  const [datosPorHijo, setDatosPorHijo] = useState({})

  // Cargar datos de cada hijo
  useEffect(() => {
    async function loadAll() {
      if (!hijos || hijos.length === 0) return
      const result = {}
      for (const hijo of hijos) {
        if (datosPorHijo[hijo.id]) continue // ya cargado
        const [{ data: acts }, { data: prog }, { data: agenda }] = await Promise.all([
          supabase
            .from('actividades')
            .select('*, actividad_archivos(*)')
            .eq('nivel_id', hijo.nivel_id)
            .order('fecha', { ascending: false })
            .limit(5),
          supabase.from('progreso_notas').select('*').eq('nino_id', hijo.id).order('fecha', { ascending: false }).limit(5),
          supabase
            .from('agenda')
            .select('*')
            .or(`nivel_id.is.null,nivel_id.eq.${hijo.nivel_id}`)
            .gte('fecha', new Date().toISOString().slice(0, 10))
            .order('fecha')
            .limit(5),
        ])
        result[hijo.id] = { actividades: acts || [], notas: prog || [], eventos: agenda || [] }
      }
      setDatosPorHijo((prev) => ({ ...prev, ...result }))
    }
    loadAll()
  }, [hijos])

  if (!hijos) return <Spinner />

  if (hijos.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Mi familia 👪</h1>
        <p className="card text-ink/50">Todavía no tienes ningún hijo/a vinculado en la escuelita.</p>
      </div>
    )
  }

  const verTodos = !selectedId
  const hijosAMostrar = verTodos ? hijos : hijos.filter((h) => h.id === selectedId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Mi familia 👪</h1>
        <p className="text-ink/50">
          {hijos.length === 1
            ? 'La información de tu hijo/a en la escuelita'
            : `${hijos.length} hijos/as vinculados`}
        </p>
      </div>

      <HijoSelector hijos={hijos} selectedId={selectedId} onChange={setSelectedId} />

      {/* Vista "Todos": resumen en tabla */}
      {verTodos && hijos.length > 1 && (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-left">
            <thead className="bg-sky-50 text-xs font-bold uppercase text-ink/40">
              <tr>
                <th className="px-3 py-2.5 sm:px-4">Nombre</th>
                <th className="px-3 py-2.5 sm:px-4">Edad</th>
                <th className="px-3 py-2.5 sm:px-4">Clase</th>
                <th className="px-3 py-2.5 sm:px-4 hidden sm:table-cell">Parentesco</th>
                <th className="px-3 py-2.5 sm:px-4 hidden sm:table-cell">Alergias</th>
                <th className="px-3 py-2.5 sm:px-4 hidden md:table-cell">Último progreso</th>
                <th className="px-3 py-2.5 sm:px-4">Ver</th>
              </tr>
            </thead>
            <tbody>
              {hijos.map((hijo) => {
                const datos = datosPorHijo[hijo.id]
                const ultimaNota = datos?.notas?.[0]
                return (
                  <tr key={hijo.id} className="border-t border-ink/5 hover:bg-sky-50/30">
                    <td className="px-3 py-2.5 sm:px-4 font-bold">{hijo.nombre_completo}</td>
                    <td className="px-3 py-2.5 sm:px-4 text-ink/60">{calcularEdad(hijo.fecha_nacimiento)} años</td>
                    <td className="px-3 py-2.5 sm:px-4">
                      {hijo.nivel ? (
                        <span className={`badge ${BADGE_CLASSES[hijo.nivel.color] || BADGE_CLASSES.sky}`}>
                          {hijo.nivel.nombre}
                        </span>
                      ) : (
                        <span className="text-ink/30">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 text-ink/50 hidden sm:table-cell">{hijo.parentesco || '—'}</td>
                    <td className="px-3 py-2.5 sm:px-4 hidden sm:table-cell">
                      {hijo.alergias ? (
                        <span className="font-bold text-coral-600">⚠️ {hijo.alergias}</span>
                      ) : (
                        <span className="text-ink/30">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4 hidden md:table-cell text-sm text-ink/50">
                      {ultimaNota ? (
                        <span>
                          {ultimaNota.emocion && `${ultimaNota.emocion} `}
                          <span className="text-ink/30">{formatFecha(ultimaNota.fecha)}</span>
                        </span>
                      ) : (
                        <span className="text-ink/30">Sin notas</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4">
                      <button
                        onClick={() => setSelectedId(hijo.id)}
                        className="btn-secondary !py-1 !px-3 !text-xs"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Vista detalle de cada hijo */}
      {hijosAMostrar.map((hijo) => {
        const datos = datosPorHijo[hijo.id]
        return (
          <div key={hijo.id} className="flex flex-col gap-4">
            {/* Tarjeta principal del hijo */}
            <div className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{hijo.nombre_completo}</h2>
                  <p className="text-sm text-ink/50">
                    {calcularEdad(hijo.fecha_nacimiento)} años
                    {hijo.parentesco && ` · ${hijo.parentesco}`}
                  </p>
                </div>
                {hijo.nivel && (
                  <span className={`badge ${BADGE_CLASSES[hijo.nivel.color] || BADGE_CLASSES.sky}`}>
                    {hijo.nivel.nombre}
                  </span>
                )}
              </div>
              {hijo.alergias && (
                <p className="mt-2 rounded-xl bg-coral-50 px-3 py-1.5 text-xs font-bold text-coral-600">
                  ⚠️ Alergias: {hijo.alergias}
                </p>
              )}
            </div>

            {/* Paneles de información */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Actividades recientes */}
              <div className="card">
                <h3 className="flex items-center gap-2 font-bold">
                  <span className="text-lg">🎨</span> Últimas actividades
                </h3>
                <div className="mt-3 flex flex-col gap-2">
                  {(datos?.actividades || []).length > 0 ? (
                    datos.actividades.map((a) => (
                      <div key={a.id} className="flex items-start gap-2 rounded-xl bg-ink/[0.03] px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{a.titulo}</p>
                          <p className="text-xs text-ink/40">{formatFecha(a.fecha)}</p>
                        </div>
                        {a.actividad_archivos?.length > 0 && (
                          <span className="shrink-0 text-xs text-ink/30">📎 {a.actividad_archivos.length}</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-ink/40">Sin actividades todavía.</p>
                  )}
                </div>
              </div>

              {/* Progreso */}
              <div className="card">
                <h3 className="flex items-center gap-2 font-bold">
                  <span className="text-lg">🌱</span> Progreso reciente
                </h3>
                <div className="mt-3 flex flex-col gap-2">
                  {(datos?.notas || []).length > 0 ? (
                    datos.notas.map((n) => (
                      <div key={n.id} className="rounded-xl bg-ink/[0.03] px-3 py-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold">{n.emocion || formatFecha(n.fecha)}</p>
                          {n.emocion && <span className="text-xs text-ink/30">{formatFecha(n.fecha)}</span>}
                        </div>
                        {n.logros && <p className="mt-0.5 text-xs text-ink/60">🌟 {n.logros}</p>}
                        {n.notas && <p className="mt-0.5 text-xs text-ink/40">{n.notas}</p>}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-ink/40">Sin notas todavía.</p>
                  )}
                </div>
              </div>

              {/* Próximos eventos */}
              <div className="card">
                <h3 className="flex items-center gap-2 font-bold">
                  <span className="text-lg">📅</span> Próximos eventos
                </h3>
                <div className="mt-3 flex flex-col gap-2">
                  {(datos?.eventos || []).length > 0 ? (
                    datos.eventos.map((e) => (
                      <div key={e.id} className="flex items-center gap-2 rounded-xl bg-ink/[0.03] px-3 py-2">
                        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                          <span className="text-[10px] font-bold leading-none">
                            {new Date(e.fecha + 'T12:00:00').toLocaleDateString('es', { month: 'short' }).toUpperCase()}
                          </span>
                          <span className="text-sm font-extrabold leading-none">
                            {new Date(e.fecha + 'T12:00:00').getDate()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{e.titulo}</p>
                          {e.descripcion && <p className="truncate text-xs text-ink/40">{e.descripcion}</p>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-ink/40">No hay eventos próximos.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
