// Días de clase por nivel. niveles.dias_semana = [0..6] (0 = domingo); null/vacío = todos los días activos.

export const NOMBRE_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const CORTO_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/** ¿El nivel tiene clase ese día de la semana? (no mira si el día está activo en la escuelita) */
export function nivelTieneDia(nivel, diaSemana) {
  const dias = nivel?.dias_semana
  return !dias || dias.length === 0 || dias.includes(diaSemana)
}

/** ¿El nivel tiene clase en esa fecha (YYYY-MM-DD)? */
export function nivelTieneClaseEn(nivel, iso) {
  return nivelTieneDia(nivel, new Date(iso + 'T12:00:00').getDay())
}

/** Niveles que tienen clase en esa fecha. */
export function nivelesDelDia(niveles, iso) {
  return (niveles || []).filter((n) => nivelTieneClaseEn(n, iso))
}

/** Días activos de la escuelita en los que el nivel tiene clase. */
export function diasDelNivel(nivel, diasActivos) {
  return [...(diasActivos || [])].sort((a, b) => a - b).filter((d) => nivelTieneDia(nivel, d))
}
