import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import AppLogo from '../../components/AppLogo'
import { useConfigIglesia, refreshConfigIglesia } from '../../lib/configIglesia'

export default function Ajustes() {
  const config = useConfigIglesia()
  const [nombreIglesia, setNombreIglesia] = useState('')
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const inputRef = useRef(null)

  const [revisando, setRevisando] = useState(false)
  const [resultadoRevision, setResultadoRevision] = useState('')

  async function handleRevisarInactividad() {
    setRevisando(true)
    setResultadoRevision('')
    const { data, error: rpcError } = await supabase.rpc('revisar_inactividad')
    setRevisando(false)
    if (rpcError) {
      setResultadoRevision('❌ ' + rpcError.message)
      return
    }
    const fila = Array.isArray(data) ? data[0] : data
    setResultadoRevision(
      `✅ Se pausaron ${fila?.ninos_pausados ?? 0} niño(s) y ${fila?.padres_pausados ?? 0} cuenta(s) de padre/madre por inactividad.`,
    )
  }

  useEffect(() => {
    setNombreIglesia(config?.nombre_iglesia || '')
  }, [config])

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setError('')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleGuardar() {
    setBusy(true)
    setError('')
    setOk('')

    let logo_url = config?.logo_url || null

    if (file) {
      const path = `logo-${Date.now()}-${file.name}`
      const { error: upError } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
      if (upError) {
        setError(upError.message)
        setBusy(false)
        return
      }
      logo_url = supabase.storage.from('logos').getPublicUrl(path).data.publicUrl
    }

    const payload = { nombre_iglesia: nombreIglesia || null, logo_url, updated_at: new Date().toISOString() }
    const { error: saveError } = config?.id
      ? await supabase.from('config_iglesia').update(payload).eq('id', config.id)
      : await supabase.from('config_iglesia').insert(payload)

    setBusy(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setOk('¡Guardado! Los cambios ya se ven en toda la plataforma.')
    setFile(null)
    setPreview(null)
    await refreshConfigIglesia()
  }

  async function handleQuitarLogo() {
    if (!config?.id) return
    setBusy(true)
    setError('')
    setOk('')
    const { error: saveError } = await supabase
      .from('config_iglesia')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', config.id)
    setBusy(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setOk('Logo quitado. Volviste al ícono por defecto.')
    setFile(null)
    setPreview(null)
    await refreshConfigIglesia()
  }

  if (config === null) return <Spinner />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Ajustes ⚙️</h1>
        <p className="text-ink/50">Personaliza el logo y el nombre de tu escuelita</p>
      </div>

      <div className="card max-w-xl">
        <p className="label mb-3">Logo de la escuelita</p>

        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-sky-50">
            {preview ? (
              <img src={preview} alt="Vista previa" className="h-16 w-16 object-contain" />
            ) : (
              <AppLogo emojiClassName="text-5xl" imgClassName="h-16 w-16 object-contain" />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn-secondary"
            >
              📷 Elegir imagen
            </button>
            {config?.logo_url && !preview && (
              <button
                type="button"
                onClick={handleQuitarLogo}
                disabled={busy}
                className="text-sm font-bold text-coral-500 hover:underline"
              >
                Quitar logo y usar el ícono por defecto
              </button>
            )}
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>
        </div>
        <p className="mt-3 text-sm text-ink/50">
          Usa una imagen cuadrada de fondo transparente si puedes (PNG). Se verá en el menú, la pantalla de
          ingreso y la página pública.
        </p>

        <div className="mt-5">
          <label className="label">Nombre de la iglesia o escuelita (opcional)</label>
          <input
            className="input"
            value={nombreIglesia}
            onChange={(e) => setNombreIglesia(e.target.value)}
            placeholder="Ej. Escuelita Dominical Casa de Fe"
          />
        </div>

        {error && <p className="mt-3 rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
        {ok && <p className="mt-3 rounded-xl bg-grass-50 px-3 py-2 text-sm font-bold text-grass-600">{ok}</p>}

        <button type="button" onClick={handleGuardar} disabled={busy} className="btn-primary mt-5 justify-center">
          {busy ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <div className="card max-w-xl">
        <p className="label mb-1">Revisar inactividad</p>
        <p className="mb-4 text-sm text-ink/50">
          Pausa automáticamente a los niños sin asistencia hace más de 3 meses, y a los padres/madres que no han
          entrado en más de 2 meses. No borra nada — es reversible, y un padre se reactiva solo la próxima vez que
          entra. Tócalo cuando quieras (ej. cada domingo).
        </p>
        <button type="button" onClick={handleRevisarInactividad} disabled={revisando} className="btn-secondary">
          {revisando ? 'Revisando...' : '🔍 Revisar inactividad'}
        </button>
        {resultadoRevision && <p className="mt-3 text-sm font-bold text-ink/70">{resultadoRevision}</p>}
      </div>
    </div>
  )
}
