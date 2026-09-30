import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

/** Pendientes que el admin debería resolver, cada uno con su botón. Si no hay nada, no se muestra. */
export default function AlertasAdmin() {
  const { user } = useAuth()
  const [alertas, setAlertas] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('niveles').select('id, nombre').eq('activo', true),
      supabase.from('docentes_niveles').select('nivel_id'),
      supabase.from('ninos').select('id, alergias').eq('activo', true),
      supabase.from('ninos_padres').select('nino_id'),
      supabase.from('solicitudes_reset').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
      // PQR nuevos: solo para la revisora (los demás solo ven los suyos).
      supabase.from('pqr_revisores').select('user_id').eq('user_id', user?.id).maybeSingle().then(({ data: rev }) =>
        rev ? supabase.from('pqr').select('id', { count: 'exact', head: true }).eq('estado', 'nuevo') : { count: 0 },
      ),
    ]).then(([{ data: niv }, { data: dn }, { data: ninos }, { data: np }, { count: resets }, { count: pqrNuevos }]) => {
      const conDocente = new Set((dn || []).map((a) => a.nivel_id))
      const sinDocente = (niv || []).filter((n) => !conDocente.has(n.id))
      const conPadre = new Set((np || []).map((x) => x.nino_id))
      const sinPadre = (ninos || []).filter((n) => !conPadre.has(n.id)).length
      const lista = []
      if (sinDocente.length) lista.push({ icon: '🍎', tono: 'coral', texto: `${sinDocente.length === 1 ? `"${sinDocente[0].nombre}" no tiene` : `${sinDocente.length} niveles no tienen`} docente asignado`, to: '/clases', accion: 'Asignar' })
      if (sinPadre) lista.push({ icon: '👪', tono: 'sunshine', texto: `${sinPadre} niño${sinPadre === 1 ? '' : 's'} sin padre o madre vinculado`, to: '/ninos', accion: 'Vincular' })
      if (resets) lista.push({ icon: '🔑', tono: 'sky', texto: `${resets} solicitud${resets === 1 ? '' : 'es'} de cambio de contraseña`, to: '/ajustes?s=mantenimiento', accion: 'Revisar' })
      if (pqrNuevos) lista.push({ icon: '📥', tono: 'sky', texto: `${pqrNuevos} PQR nuevo${pqrNuevos === 1 ? '' : 's'} (sugerencias y reclamos)`, to: '/ayuda?s=bandeja', accion: 'Ver' })
      setAlertas(lista)
    })
  }, [user?.id])

  if (!alertas || alertas.length === 0) return null
  const TONO = { coral: 'bg-coral-50 ring-coral-200', sunshine: 'bg-sunshine-50 ring-sunshine-200', sky: 'bg-sky-50 ring-sky-200' }
  return (
    <section aria-label="Pendientes" className="flex flex-col gap-2">
      {alertas.map((a) => (
        <div key={a.texto} className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-1 ${TONO[a.tono]}`}>
          <p className="flex items-center gap-2 text-sm font-bold text-ink/85"><span aria-hidden="true">{a.icon}</span>{a.texto}</p>
          <Link to={a.to} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-sky-700 shadow-sm hover:bg-sky-50">{a.accion} →</Link>
        </div>
      ))}
    </section>
  )
}
