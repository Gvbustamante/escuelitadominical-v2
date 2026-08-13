import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import RichTextEditor from './RichTextEditor'

/**
 * Tarjeta para que un padre/madre suba la evidencia de una tarea de su
 * hijo/a. Se usa en PadreActividades.jsx (lista) y en ActividadDetalle.jsx
 * (página extendida de una actividad).
 */
export default function TareaHijoWidget({ actividad, hijo, entrega, onSaved }) {
  const { user } = useAuth()
  const [archivo, setArchivo] = useState(null)
  const [comentario, setComentario] = useState('')
  const [busy, setBusy] = useState(false)

  if (hijo.pausado) {
    return (
      <div className="rounded-2xl bg-ink/5 px-3 py-2 text-sm text-ink/40">
        ⏸️ Esta tarea está en pausa para {hijo.nombre_completo.split(' ')[0]}.
      </div>
    )
  }

  const estado = entrega?.estado || 'pendiente'

  if (estado === 'pausada') {
    return (
      <div className="rounded-2xl bg-sunshine-50 px-3 py-2 text-sm font-bold text-sunshine-700">
        ⏸️ El docente puso esta tarea en pausa para {hijo.nombre_completo.split(' ')[0]}.
      </div>
    )
  }

  if (estado === 'entregada') {
    return (
      <div className="rounded-2xl bg-grass-50 px-3 py-3">
        <p className="text-sm font-bold text-grass-700">✅ {hijo.nombre_completo.split(' ')[0]} ya entregó esta tarea</p>
        {entrega.archivo_url && (
          <a href={entrega.archivo_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-sky-600 hover:underline">
            📎 Ver lo que subiste
          </a>
        )}
        {entrega.nota_docente && <p className="mt-1 text-sm text-ink/70">💬 Nota del docente: {entrega.nota_docente}</p>}
      </div>
    )
  }

  async function subir() {
    if (!archivo) return
    setBusy(true)
    const path = `tareas/${actividad.id}/${hijo.id}/${Date.now()}-${archivo.name}`
    const { error: upError } = await supabase.storage.from('actividades').upload(path, archivo)
    if (upError) {
      setBusy(false)
      return
    }
    const archivo_url = supabase.storage.from('actividades').getPublicUrl(path).data.publicUrl
    await supabase.from('tarea_entregas').upsert(
      {
        actividad_id: actividad.id,
        nino_id: hijo.id,
        estado: 'entregada',
        archivo_url,
        comentario_padre: comentario || null,
        entregado_por: user.id,
        entregado_at: new Date().toISOString(),
      },
      { onConflict: 'actividad_id,nino_id' },
    )
    setBusy(false)
    setArchivo(null)
    setComentario('')
    onSaved()
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-sky-200 p-3">
      <p className="text-sm font-bold text-sky-700">📝 Sube la tarea de {hijo.nombre_completo.split(' ')[0]}</p>
      <input type="file" className="input mt-2" onChange={(e) => setArchivo(e.target.files[0] || null)} />
      <div className="mt-2">
        <RichTextEditor value={comentario} onChange={setComentario} placeholder="Comentario (opcional)" compact />
      </div>
      <button disabled={!archivo || busy} onClick={subir} className="btn-primary mt-2 w-full justify-center !py-2 !text-sm">
        {busy ? 'Subiendo...' : 'Subir tarea'}
      </button>
    </div>
  )
}
