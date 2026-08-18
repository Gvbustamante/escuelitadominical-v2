import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export function useMisHijos() {
  const { user, profile } = useAuth()
  const [hijos, setHijos] = useState(null)
  const role = profile?.role

  useEffect(() => {
    if (!role) return
    let cancelado = false

    async function load() {
      let resultado = []

      if (role === 'admin' || role === 'coordinador') {
        // Staff ve TODOS los niños activos
        const { data } = await supabase
          .from('ninos')
          .select('*, nivel:niveles(*)')
          .eq('activo', true)
          .order('nombre_completo')
        resultado = (data || []).map((n) => ({ ...n, parentesco: null }))
      } else if (role === 'docente') {
        // Docente ve los niños de sus niveles asignados
        const { data: asignaciones } = await supabase
          .from('docentes_niveles')
          .select('nivel_id')
          .eq('docente_id', user.id)
        const nivelIds = (asignaciones || []).map((a) => a.nivel_id)

        if (nivelIds.length > 0) {
          const { data } = await supabase
            .from('ninos')
            .select('*, nivel:niveles(*)')
            .eq('activo', true)
            .in('nivel_id', nivelIds)
            .order('nombre_completo')
          resultado = (data || []).map((n) => ({ ...n, parentesco: null }))
        }
      } else {
        // Padre: solo sus hijos vinculados
        const { data } = await supabase
          .from('ninos_padres')
          .select('parentesco, nino:ninos(*, nivel:niveles(*))')
          .eq('padre_id', user.id)
        resultado = (data || []).map((row) => ({ ...row.nino, parentesco: row.parentesco }))
      }

      if (!cancelado) setHijos(resultado)
    }

    load()
    return () => { cancelado = true }
  }, [user.id, role])

  return hijos
}
