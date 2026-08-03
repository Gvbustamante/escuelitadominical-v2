import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function CoberturaHoy() {
  const [filas, setFilas] = useState(null)

  useEffect(() => {
    async function load() {
      const hoy = hoyISO()
      const [{ data: niveles }, { data: asignaciones }, { data: ninos }, { data: asistenciaHoy }] = await Promise.all([
        supabase.from('niveles').select('id, nombre').eq('activo', true).order('edad_min', { ascending: true, nullsFirst: true }),
        supabase.from('docentes_niveles').select('nivel_id, docente:profiles(nombre_completo)'),
        supabase.from('ninos').select('nivel_id').eq('activo', true),
        supabase.from('asistencia').select('nivel_id, tomada_por:profiles(nombre_completo)').eq('fecha', hoy),
      ])

      const docentesPorNivel = {}
      ;(asignaciones || []).forEach((a) => {
        if (!a.docente?.nombre_completo) return
        docentesPorNivel[a.nivel_id] = docentesPorNivel[a.nivel_id] || []
        docentesPorNivel[a.nivel_id].push(a.docente.nombre_completo)
      })

      const ninosPorNivel = {}
      ;(ninos || []).forEach((n) => {
        if (!n.nivel_id) return
        ninosPorNivel[n.nivel_id] = (ninosPorNivel[n.nivel_id] || 0) + 1
      })

      const tomadaPorNivel = {}
      ;(asistenciaHoy || []).forEach((r) => {
        if (!tomadaPorNivel[r.nivel_id]) tomadaPorNivel[r.nivel_id] = r.tomada_por?.nombre_completo || 'el equipo'
      })

      setFilas(
        (niveles || []).map((n) => ({
          id: n.id,
          nombre: n.nombre,
          docentes: docentesPorNivel[n.id] || [],
          ninosCount: ninosPorNivel[n.id] || 0,
          tomadaPor: tomadaPorNivel[n.id] || null,
        })),
      )
    }
    load()
  }, [])

  if (!filas) {
    return (
      <div className="card flex items-center gap-3 text-ink/50">
        <div className="h-6 w-6 shrink-0 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
        <p className="font-bold">Revisando cobertura de hoy...</p>
      </div>
    )
  }

  const sinDocente = filas.filter((f) => f.docentes.length === 0)
  const pendientes = filas.filter((f) => f.docentes.length > 0 && f.ninosCount > 0 && !f.tomadaPor)
  const alertas = sinDocente.length + pendientes.length

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Cobertura de hoy 🗓️</h2>
          <p className="text-sm text-ink/50">Quién está a cargo de cada clase y si ya se registró asistencia.</p>
        </div>
        {filas.length === 0 ? null : alertas === 0 ? (
          <span className="badge bg-grass-100 text-grass-700">✅ Todo cubierto</span>
        ) : (
          <span className="badge bg-coral-100 text-coral-700">
            ⚠️ {alertas} clase{alertas === 1 ? '' : 's'} necesita{alertas === 1 ? '' : 'n'} atención
          </span>
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-xs font-bold uppercase text-ink/40">
            <tr>
              <th className="px-2 py-2">Clase</th>
              <th className="px-2 py-2">Docente(s)</th>
              <th className="px-2 py-2">Niños</th>
              <th className="px-2 py-2">Asistencia hoy</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const sinDoc = f.docentes.length === 0
              return (
                <tr key={f.id} className="border-t border-ink/5">
                  <td className="px-2 py-3 font-bold">{f.nombre}</td>
                  <td className="px-2 py-3 text-sm">
                    {sinDoc ? <span className="font-bold text-coral-600">Sin docente asignado</span> : f.docentes.join(', ')}
                  </td>
                  <td className="px-2 py-3 text-sm text-ink/50">{f.ninosCount}</td>
                  <td className="px-2 py-3">
                    {f.tomadaPor ? (
                      <span className="badge bg-grass-100 text-grass-700">✅ Tomada por {f.tomadaPor}</span>
                    ) : sinDoc ? (
                      <span className="badge bg-coral-100 text-coral-700">🔴 Sin docente</span>
                    ) : f.ninosCount === 0 ? (
                      <span className="badge bg-ink/5 text-ink/40">— Sin niños</span>
                    ) : (
                      <span className="badge bg-sunshine-100 text-sunshine-700">⏳ Pendiente</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {filas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-6 text-center text-ink/40">
                  Aún no hay clases activas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Link to="/clases" className="mt-4 inline-block text-sm font-bold text-sky-600 hover:underline">
        Gestionar clases y docentes asignados →
      </Link>
    </div>
  )
}
