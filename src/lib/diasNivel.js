import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Días de clase por nivel. niveles.dias_semana = [0..6] (0 = domingo); null/vacío = todos los días activos.

export const NOMBRE_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const CORTO_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/** ¿El nivel tiene clase ese día de la semana? (no mira si el día está activo en la escuelita) */
export function nivelTieneDia(nivel, diaSemana) {
  const dias = nivel?.dias_semana
  return !dias || dias.length === 0 || dias.includes(diaSemana)
}

// ---------- Excepciones por fecha (tabla excepciones_clase) ----------
// Días puntuales sin clase: de un nivel, o de toda la escuelita (nivel_id null).
// Se cargan una vez y se comparten; si la tabla no existe, simplemente no hay excepciones.
let EXC = []
let promesa = null
const avisar = new Set()

export function cargarExcepciones(forzar = false) {
  if (promesa && !forzar) return promesa
  promesa = supabase
    .from('excepciones_clase')
    .select('id, fecha, nivel_id, motivo, nivel:niveles(nombre)')
    .order('fecha')
    .then(({ data, error }) => {
      EXC = error ? [] : data || []
      avisar.forEach((f) => f())
      return EXC
    })
  return promesa
}

/** Hook: carga las excepciones y re-renderiza cuando cambian. Devuelve la lista. */
export function useExcepciones() {
  const [, setV] = useState(0)
  useEffect(() => {
    const f = () => setV((v) => v + 1)
    avisar.add(f)
    cargarExcepciones()
    return () => avisar.delete(f)
  }, [])
  return EXC
}

/** Excepción que aplica a ese nivel en esa fecha (la del nivel o la de toda la escuelita), o null. */
export function excepcionDe(nivelId, iso) {
  return EXC.find((e) => e.fecha === iso && (!e.nivel_id || e.nivel_id === nivelId)) || null
}

/** ¿Ese día no hay clase en toda la escuelita? */
export function sinClaseGeneral(iso) {
  return EXC.some((e) => e.fecha === iso && !e.nivel_id)
}

/** ¿El nivel tiene clase en esa fecha (YYYY-MM-DD)? Días del nivel + excepciones. */
export function nivelTieneClaseEn(nivel, iso) {
  return nivelTieneDia(nivel, new Date(iso + 'T12:00:00').getDay()) && !excepcionDe(nivel?.id, iso)
}

/** Niveles que tienen clase en esa fecha. */
export function nivelesDelDia(niveles, iso) {
  return (niveles || []).filter((n) => nivelTieneClaseEn(n, iso))
}

/** Días activos de la escuelita en los que el nivel tiene clase. */
export function diasDelNivel(nivel, diasActivos) {
  return [...(diasActivos || [])].sort((a, b) => a - b).filter((d) => nivelTieneDia(nivel, d))
}
