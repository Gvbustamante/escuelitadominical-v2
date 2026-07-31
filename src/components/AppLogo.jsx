import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

let cache = null
const listeners = new Set()

async function fetchConfig() {
  const { data } = await supabase.from('config_iglesia').select('logo_url').limit(1).maybeSingle()
  cache = data || {}
  listeners.forEach((fn) => fn(cache))
  return cache
}

export function notifyLogoChanged() {
  fetchConfig()
}

export default function AppLogo({ emojiClassName = 'text-4xl', imgClassName = 'h-10 w-10 object-contain' }) {
  const [config, setConfig] = useState(cache)

  useEffect(() => {
    if (!cache) fetchConfig()
    const fn = (c) => setConfig(c)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  if (config?.logo_url) {
    return <img src={config.logo_url} alt="Logo de la escuelita" className={imgClassName} />
  }
  return <span className={emojiClassName}>📖</span>
}
