import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import AppLogo from '../components/AppLogo'
import AppName from '../components/AppName'
import PasswordInput from '../components/PasswordInput'

export default function Login() {
  const { session, signIn, loading } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [modo, setModo] = useState('login')
  const [resetEmail, setResetEmail] = useState('')
  const [resetNombre, setResetNombre] = useState('')
  const [resetOk, setResetOk] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetBusy, setResetBusy] = useState(false)

  if (!loading && session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const valor = usuario.trim()
    const email = valor.includes('@')
      ? valor
      : `${valor.toLowerCase().replace(/[^a-z0-9]/g, '')}@accesskids.local`
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setError('Usuario (o correo) o contraseña incorrectos.')
  }

  async function handleReset(e) {
    e.preventDefault()
    setResetError('')
    setResetBusy(true)
    const valor = resetEmail.trim()
    const email = valor.includes('@')
      ? valor
      : `${valor.toLowerCase().replace(/[^a-z0-9]/g, '')}@accesskids.local`
    const { error } = await supabase.from('solicitudes_reset').insert({
      email,
      nombre: resetNombre.trim() || null,
    })
    setResetBusy(false)
    if (error) {
      setResetError('No se pudo enviar la solicitud. Intenta de nuevo.')
      return
    }
    setResetOk(true)
  }

  if (modo === 'reset') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sky-100 p-4">
        <div className="card w-full max-w-md">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <AppLogo emojiClassName="text-6xl" imgClassName="h-16 w-16 object-contain" />
            <h1 className="text-2xl font-bold text-sky-500">Restablecer contraseña</h1>
            <p className="text-sm text-ink/50">Envía una solicitud y el administrador la aprobará.</p>
          </div>

          {resetOk ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="text-5xl">📨</span>
              <p className="font-bold text-grass-600">Solicitud enviada</p>
              <p className="text-sm text-ink/50">
                Tu administrador recibirá tu solicitud. Cuando la apruebe, recibirás un correo para restablecer tu
                contraseña.
              </p>
              <button className="btn-primary mt-2 justify-center" onClick={() => { setModo('login'); setResetOk(false); setResetEmail(''); setResetNombre('') }}>
                Volver al inicio
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="flex flex-col gap-4">
              <div>
                <label className="label">Tu nombre</label>
                <input
                  required
                  className="input"
                  value={resetNombre}
                  onChange={(e) => setResetNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                />
              </div>
              <div>
                <label className="label">Tu usuario o correo</label>
                <input
                  required
                  className="input"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Tu usuario o correo"
                />
              </div>
              {resetError && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{resetError}</p>}
              <button type="submit" disabled={resetBusy} className="btn-primary justify-center">
                {resetBusy ? 'Enviando...' : 'Enviar solicitud'}
              </button>
              <button type="button" onClick={() => setModo('login')} className="text-sm font-bold text-sky-500 hover:underline">
                ← Volver al inicio de sesión
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sky-100 p-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <AppLogo emojiClassName="text-6xl" imgClassName="h-16 w-16 object-contain" />
          <h1 className="text-3xl uppercase text-sky-500">
            <AppName />
          </h1>
          <p className="font-bold text-ink/50">Ingresa con tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Usuario</label>
            <input
              required
              className="input"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Tu usuario"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary mt-2 justify-center">
            {busy ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setModo('reset')}
          className="mt-4 block w-full text-center text-sm font-bold text-coral-500 hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </button>

        <p className="mt-4 text-center text-sm text-ink/40">
          ¿No tienes cuenta? Pide al administrador de tu escuelita que te invite.
        </p>
        <Link to="/bienvenida" className="mt-2 block text-center text-sm font-bold text-sky-500 hover:underline">
          ← Conoce KidsMin
        </Link>
      </div>
    </div>
  )
}
