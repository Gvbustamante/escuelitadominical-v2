// Módulos que la iglesia puede activar/desactivar (config_iglesia.modulos_activos).
// Si modulos_activos es null (nunca se configuró), todos están activos.
export const MODULOS_KEYS = [
  'devocionales',
  'asistencia',
  'actividades',
  'bitacora',
  'planeacion',
  'agenda',
  'foro',
  'drive',
  'progreso',
  'reconocimientos',
]

export function moduloActivo(config, key) {
  if (!key) return true
  const activos = config?.modulos_activos
  if (!Array.isArray(activos)) return true
  return activos.includes(key)
}
