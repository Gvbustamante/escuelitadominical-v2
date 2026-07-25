import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function AsistenciaAdmin() {
  const [fecha, setFecha] = useState(hoyISO())
  const [niveles, setNiveles] = useState([])
  const [nivelId, setNivelId] = useState('')
  const [registros, setRegistros] = useState(null)

  useEffect(() => {
    supabase.from('niveles').select('*').eq('activo', true).then(({ data }) => setNiveles(data || []))
  }, [])

  const load = useCallback(async () => {
    let query = supabase
      .from('asistencia')
      .select('*, nino:ninos(nombre_completo), nivel:niveles(nombre)')
      .eq('fecha', fecha)
      .order('created_at')
    if (nivelId) query = query.eq('nivel_id', nivelId)
    const { data } = await query
    setRegistros(data || [])
  }, [fecha, nivelId])

  useEffect(() => {
    load()
  }, [load])

  const presentes = registros?.filter((r) => r.presente).length ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Asistencia ✅</h1>
        <p className="text-ink/50">Vista general de todas las clases</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input type="date" className="input max-w-xs" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <select className="input max-w-xs" value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
          <option value="">Todas las clases</option>
          {niveles.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nombre}
            </option>
          ))}
        </select>
      </div>

      {!registros ? (
        <Spinner />
      ) : (
        <>
          <p className="font-bold text-ink/60">
            {presentes} presentes de {registros.length} registrados
          </p>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-left">
              <thead className="bg-sky-50 text-sm font-bold uppercase text-ink/50">
                <tr>
                  <th className="px-4 py-3">Niño/a</th>
                  <th className="px-4 py-3">Clase</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id} className="border-t border-ink/5">
                    <td className="px-4 py-3 font-bold">{r.nino?.nombre_completo}</td>
                    <td className="px-4 py-3 text-ink/60">{r.nivel?.nombre}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${r.presente ? 'bg-grass-100 text-grass-700' : 'bg-coral-100 text-coral-700'}`}>
                        {r.presente ? 'Presente' : 'Ausente'}
                      </span>
                    </td>
                  </tr>
                ))}
                {registros.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-ink/40">
                      Sin registros para esta fecha.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
