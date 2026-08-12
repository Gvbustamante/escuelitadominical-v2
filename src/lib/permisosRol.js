import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Descripciones de los permisos curados que se muestran en Usuarios →
// Roles y permisos. Si algún día se agrega un permiso nuevo en el SQL,
// agrégalo aquí también para que tenga texto amigable.
export const PERMISOS_DISPONIBLES = [
  {
    rol: 'docente',
    permiso: 'editar_ninos',
    label: 'Editar los datos de los niños de su clase',
    detalle: 'Nombre, fecha de nacimiento, alergias y notas — solo de las clases que tiene asignadas.',
    porDefecto: true,
  },
  {
    rol: 'docente',
    permiso: 'agregar_ninos',
    label: 'Registrar niños nuevos',
    detalle: 'Poder crear un niño/a nuevo directamente, sin pasar por el admin.',
    porDefecto: false,
  },
  {
    rol: 'docente',
    permiso: 'vincular_padres',
    label: 'Vincular padres/madres a sus niños',
    detalle: 'Crear una cuenta nueva de padre/madre (o vincular una existente) para los niños de su propia clase.',
    porDefecto: false,
  },
]

let cache = null
let inFlight = null
const listeners = new Set()

function fetchPermisos() {
  if (!inFlight) {
    inFlight = supabase
      .from('permisos_rol')
      .select('*')
      .then(({ data }) => {
        cache = data || []
        listeners.forEach((fn) => fn(cache))
        inFlight = null
        return cache
      })
  }
  return inFlight
}

export function refreshPermisosRol() {
  return fetchPermisos()
}

export function usePermisosRol() {
  const [permisos, setPermisos] = useState(cache)

  useEffect(() => {
    if (!cache) fetchPermisos()
    const fn = (p) => setPermisos(p)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  // true/false una vez cargado; false mientras carga (nunca se abre un
  // botón sensible antes de confirmar que el permiso existe de verdad).
  function tiene(rol, permiso) {
    if (!permisos) return false
    return !!permisos.find((p) => p.rol === rol && p.permiso === permiso)?.activo
  }

  return { permisos, tiene, cargando: permisos === null }
}
