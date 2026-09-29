import { Navigate } from 'react-router-dom'
import { useConfigIglesia } from '../lib/configIglesia'
import { moduloActivo } from '../lib/modulos'
import Spinner from './Spinner'

// Bloquea el acceso por URL a un módulo desactivado (no solo lo oculta del menú).
export default function ModuloRoute({ modulo, children }) {
  const config = useConfigIglesia()
  if (!config) return <Spinner />
  if (!moduloActivo(config, modulo)) return <Navigate to="/" replace />
  return children
}
