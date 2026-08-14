import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'
import RichTextEditor from '../components/RichTextEditor'
import ArticulosAdjuntos from '../components/ArticulosAdjuntos'
import CitasBiblicasAdmin from './admin/CitasBiblicasAdmin'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function hoyYYYYMM() {
  return new Date().toISOString().slice(0, 7)
}

function diasEnMes(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export default function Devocionales() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const puedeCrear = ['admin', 'coordinador', 'docente'].includes(profile.role)
  const puedeVerVersiculos = ['admin', 'coordinador'].includes(profile.role)
  const [tab, setTab] = useState('devocionales')

  const [devocionales, setDevocionales] = useState(null)
  const [niveles, setNiveles] = useState([])
  const [mes, setMes] = useState(hoyYYYYMM())
  const [verTodos, setVerTodos] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ titulo: '', versiculo: '', contenido: '', fecha: hoyISO(), nivel_id: '' })
  const [imagen, setImagen] = useState(null)
  const [preview, setPreview] = useState(null)
  const [archivos, setArchivos] = useState([])
  const [busy, setBusy] = useState(false)
  const [progreso, setProgreso] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    let query = supabase
      .from('devocionales_ninos')
      .select('*, nivel:niveles(nombre), devocional_reacciones(*), devocional_archivos(*)')
      .order('fecha', { ascending: false })
    if (!verTodos) {
      query = query.gte('fecha', `${mes}-01`).lte('fecha', `${mes}-${String(diasEnMes(mes)).padStart(2, '0')}`)
    }
    const { data } = await query
    setDevocionales(data || [])
  }, [mes, verTodos])

  useEffect(() => {
    load()
    if (puedeCrear) {
      supabase.from('niveles').select('*').eq('activo', true).then(({ data }) => setNiveles(data || []))
    }
  }, [load, puedeCrear])

  function openNew() {
    setEditing(null)
    setForm({ titulo: '', versiculo: '', contenido: '', fecha: hoyISO(), nivel_id: '' })
    setImagen(null)
    setPreview(null)
    setArchivos([])
    setError('')
    setModalOpen(true)
  }

  function openEdit(d) {
    setEditing(d)
    setForm({
      titulo: d.titulo,
      versiculo: d.versiculo || '',
      contenido: d.contenido,
      fecha: d.fecha,
      nivel_id: d.nivel_id || '',
    })
    setImagen(null)
    setPreview(null)
    setArchivos([])
    setError('')
    setModalOpen(true)
  }

  function handleImagen(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setImagen(f)
    setPreview(URL.createObjectURL(f))
  }

  async function marcarActivo(d) {
    await supabase.from('devocionales_ninos').update({ activo: false }).eq('activo', true)
    await supabase.from('devocionales_ninos').update({ activo: true }).eq('id', d.id)
    load()
  }

  async function quitarActivo(d) {
    await supabase.from('devocionales_ninos').update({ activo: false }).eq('id', d.id)
    load()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.contenido) {
      setError('Escribe la reflexión para el niño/a.')
      return
    }
    setBusy(true)
    setError('')

    const payload = {
      titulo: form.titulo,
      versiculo: form.versiculo || null,
      contenido: form.contenido,
      fecha: form.fecha,
      nivel_id: form.nivel_id || null,
    }

    let devocionalId = editing?.id
    if (editing) {
      const { error: updError } = await supabase.from('devocionales_ninos').update(payload).eq('id', editing.id)
      if (updError) {
        setError(updError.message)
        setBusy(false)
        return
      }
    } else {
      const { data: devocional, error: insError } = await supabase
        .from('devocionales_ninos')
        .insert({ ...payload, creado_por: user.id })
        .select()
        .single()
      if (insError) {
        setError(insError.message)
        setBusy(false)
        return
      }
      devocionalId = devocional.id
    }

    if (imagen) {
      const path = `devocionales/${devocionalId}/${Date.now()}-${imagen.name}`
      const { error: upError } = await supabase.storage.from('actividades').upload(path, imagen)
      if (!upError) {
        const imagen_url = supabase.storage.from('actividades').getPublicUrl(path).data.publicUrl
        await supabase.from('devocionales_ninos').update({ imagen_url }).eq('id', devocionalId)
      }
    }

    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i]
      setProgreso(`Subiendo ${i + 1} de ${archivos.length}...`)
      const path = `devocionales-archivos/${devocionalId}/${Date.now()}-${file.name}`
      const { error: upError } = await supabase.storage.from('actividades').upload(path, file)
      if (!upError) {
        await supabase.from('devocional_archivos').insert({
          devocional_id: devocionalId,
          storage_path: path,
          nombre_archivo: file.name,
          tipo: file.type,
        })
      }
    }

    setProgreso('')
    setBusy(false)
    setModalOpen(false)
    load()
  }

  if (!devocionales) return <Spinner />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Devocionales 🙏</h1>
          <p className="text-ink/50">Reflexiones para niños, y el versículo que se muestra cada día</p>
        </div>
        {tab === 'devocionales' && puedeCrear && (
          <button className="btn-primary" onClick={openNew}>
            + Nuevo devocional
          </button>
        )}
      </div>

      {puedeVerVersiculos && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('devocionales')}
            className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'devocionales' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
          >
            🙏 Devocionales
          </button>
          <button
            type="button"
            onClick={() => setTab('versiculos')}
            className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'versiculos' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
          >
            📖 Versículos
          </button>
        </div>
      )}

      {tab === 'versiculos' && puedeVerVersiculos ? (
        <CitasBiblicasAdmin />
      ) : (
        <>
      <div className="flex flex-wrap items-center gap-3">
        {!verTodos && (
          <input type="month" className="input max-w-xs" value={mes} onChange={(e) => setMes(e.target.value)} />
        )}
        <button
          onClick={() => setVerTodos((v) => !v)}
          className={`rounded-full px-4 py-2 text-sm font-bold ${verTodos ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          {verTodos ? 'Ver por mes' : 'Ver todos'}
        </button>
      </div>

      <div className="card divide-y divide-ink/5 !p-0">
        {devocionales.map((d) => (
          <div
            key={d.id}
            className={`flex cursor-pointer flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-3 ${d.activo ? 'bg-sunshine-50' : ''}`}
            onClick={() => navigate(`/devocionales/${d.id}`)}
          >
            <div className="flex items-start gap-3">
              {d.imagen_url && (
                <img src={d.imagen_url} alt={d.titulo} className="h-12 w-12 shrink-0 rounded-xl object-cover sm:h-14 sm:w-14" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-bold sm:text-base hover:text-sky-600">{d.titulo}</p>
                  {d.activo && <span className="badge bg-sunshine-200 text-sunshine-800">🟢 Activo</span>}
                  {d.nivel?.nombre && <span className="badge bg-sky-100 text-sky-700">{d.nivel.nombre}</span>}
                  <span className="text-xs text-ink/40">{d.fecha}</span>
                </div>
                {d.versiculo && <p className="mt-1 truncate italic text-ink/60">📖 "{d.versiculo}"</p>}
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              <span className="text-xs font-bold text-coral-500">{d.devocional_reacciones?.length || 0} ❤️</span>
              {puedeCrear && (
                <button
                  className="btn-secondary !py-1 !px-3 !text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    d.activo ? quitarActivo(d) : marcarActivo(d)
                  }}
                >
                  {d.activo ? 'Quitar activo' : '⭐ Marcar activo'}
                </button>
              )}
              {puedeCrear && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(d)
                  }}
                  className="text-lg text-ink/30 hover:text-sky-500"
                  title="Editar"
                >
                  ✏️
                </button>
              )}
            </div>
          </div>
        ))}
        {devocionales.length === 0 && (
          <p className="p-6 text-center text-ink/50">
            {verTodos ? 'Todavía no hay devocionales publicados.' : 'No hay devocionales publicados este mes.'}
          </p>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar devocional' : 'Nuevo devocional'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Título</label>
            <input required className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div>
            <label className="label">Versículo (opcional)</label>
            <input
              className="input"
              placeholder='Ej. "Todo lo puedo en Cristo..." — Filipenses 4:13'
              value={form.versiculo}
              onChange={(e) => setForm({ ...form, versiculo: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Reflexión para el niño/a</label>
            <RichTextEditor
              value={form.contenido}
              onChange={(html) => setForm({ ...form, contenido: html })}
              placeholder="Escribe algo corto y sencillo que un niño pueda entender..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
            <div>
              <label className="label">Clase (opcional)</label>
              <select className="input" value={form.nivel_id} onChange={(e) => setForm({ ...form, nivel_id: e.target.value })}>
                <option value="">Para todas las clases</option>
                {niveles.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">{editing ? 'Cambiar imagen principal (opcional)' : 'Imagen principal (opcional)'}</label>
            <input type="file" accept="image/*" className="input" onChange={handleImagen} />
            {(preview || (editing && editing.imagen_url)) && (
              <img src={preview || editing.imagen_url} alt="" className="mt-2 h-32 w-full rounded-2xl object-cover" />
            )}
          </div>
          <div>
            <label className="label">{editing ? 'Agregar más materiales (opcional)' : 'Materiales para descargar (opcional)'}</label>
            <input type="file" multiple className="input" onChange={(e) => setArchivos(Array.from(e.target.files))} />
            {archivos.length > 0 && <p className="mt-1 text-sm text-ink/50">{archivos.length} archivo(s) seleccionado(s)</p>}
            {editing && <ArticulosAdjuntos archivos={editing.devocional_archivos} titulo="Ya subidos" />}
          </div>
          {progreso && <p className="text-sm font-bold text-sky-600">{progreso}</p>}
          {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-bold text-coral-600">{error}</p>}
          <button disabled={busy} className="btn-primary justify-center">
            {busy ? 'Guardando...' : editing ? 'Guardar cambios' : 'Publicar devocional'}
          </button>
        </form>
      </Modal>
        </>
      )}
    </div>
  )
}
