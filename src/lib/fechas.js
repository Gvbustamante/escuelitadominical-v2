// Fechas en hora LOCAL del dispositivo (no UTC).
// toISOString() usa UTC: en América, un domingo después de las 7 p. m. ya sería lunes.
export function fechaLocal(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function hoyLocal() {
  return fechaLocal(new Date())
}

/** Primera letra en mayúscula ("domingo, 4 de octubre" → "Domingo, 4 de octubre"). No usar la clase CSS `capitalize`: pone "De" en mayúscula. */
export function capitalizar(t) {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

const fechaDe = (iso) => new Date(iso + 'T12:00:00')

/** "Domingo, 4 de octubre" (con año si no es el año actual o si anio = true). */
export function fechaLarga(iso, { anio, diaSemana = true } = {}) {
  if (!iso) return ''
  const d = fechaDe(iso)
  const conAnio = anio ?? d.getFullYear() !== new Date().getFullYear()
  return capitalizar(d.toLocaleDateString('es', { ...(diaSemana ? { weekday: 'long' } : {}), day: 'numeric', month: 'long', ...(conAnio ? { year: 'numeric' } : {}) }))
}

/** "Dom 4 oct" (con año si no es el año actual). */
export function fechaCorta(iso) {
  if (!iso) return ''
  const d = fechaDe(iso)
  const conAnio = d.getFullYear() !== new Date().getFullYear()
  const t = d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', ...(conAnio ? { year: 'numeric' } : {}) })
  return capitalizar(t.replace(/\./g, '').replace(/,/g, ''))
}
