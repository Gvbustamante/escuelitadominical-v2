// Fechas en hora LOCAL del dispositivo (no UTC).
// toISOString() usa UTC: en América, un domingo después de las 7 p. m. ya sería lunes.
export function fechaLocal(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function hoyLocal() {
  return fechaLocal(new Date())
}
