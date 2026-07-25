import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export function useMisHijos() {
  const { user } = useAuth()
  const [hijos, setHijos] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('ninos_padres')
        .select('parentesco, nino:ninos(*, nivel:niveles(*))')
        .eq('padre_id', user.id)
      setHijos((data || []).map((row) => ({ ...row.nino, parentesco: row.parentesco })))
    }
    load()
  }, [user.id])

  return hijos
}
