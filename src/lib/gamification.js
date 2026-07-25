export const BADGES = [
  { min: 0, emoji: '🐣', nombre: 'Explorador nuevo' },
  { min: 3, emoji: '🦊', nombre: 'Curioso' },
  { min: 6, emoji: '🦁', nombre: 'Valiente' },
  { min: 10, emoji: '🦋', nombre: 'Brillante' },
  { min: 15, emoji: '🌟', nombre: 'Estrella de la Biblia' },
  { min: 20, emoji: '👑', nombre: 'Campeón de fe' },
]

export function badgeActual(estrellas) {
  return [...BADGES].reverse().find((b) => estrellas >= b.min) || BADGES[0]
}

export function siguienteBadge(estrellas) {
  return BADGES.find((b) => estrellas < b.min) || null
}

export function progresoHaciaSiguiente(estrellas) {
  const actual = badgeActual(estrellas)
  const siguiente = siguienteBadge(estrellas)
  if (!siguiente) return 100
  const rango = siguiente.min - actual.min
  const avance = estrellas - actual.min
  return Math.min(100, Math.round((avance / rango) * 100))
}

export const MENSAJES_MOTIVACION = [
  '¡Lo hiciste increíble!',
  'Jesús está feliz de que estés aprendiendo.',
  '¡Eres un gran explorador de la Biblia!',
  'Has ganado una nueva estrella.',
  '¡Sigue brillando!',
  'Dios está muy orgulloso de ti hoy.',
]

export function mensajeAleatorio() {
  return MENSAJES_MOTIVACION[Math.floor(Math.random() * MENSAJES_MOTIVACION.length)]
}

// Estructura preparada para audio futuro (narración y efectos de sonido).
// Hoy no reproduce nada: solo deja el punto de enganche listo para cuando
// haya archivos de audio. Ej. futuro: new Audio(`/sounds/${name}.mp3`).play()
export function playSound(_name) {}
