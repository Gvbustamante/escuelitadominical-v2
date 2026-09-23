import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Skeleton from '../components/Skeleton'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import FilePreview, { getFileIcon, getFileType } from '../components/FilePreview'
import { coincide } from '../lib/busqueda'

function fileUrl(path) {
  return supabase.storage.from('drive').getPublicUrl(path).data.publicUrl
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatFecha(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Drive() {
  const { profile } = useAuth()
  const [carpetas, setCarpetas] = useState(null)
  const [archivos, setArchivos] = useState(null)
  const [ruta, setRuta] = useState([])
  const [vista, setVista] = useState(() => localStorage.getItem('drive-vista') || 'grid')
  const [busqueda, setBusqueda] = useState('')
  const [verPapelera, setVerPapelera] = useState(false)
  const [dragging, setDragging] = useState(false)

  const [carpetaModal, setCarpetaModal] = useState(false)
  const [carpetaEditando, setCarpetaEditando] = useState(null)
  const [carpetaNombre, setCarpetaNombre] = useState('')
  const [renombrarModal, setRenombrarModal] = useState(null)
  const [renombrarNombre, setRenombrarNombre] = useState('')
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [preview, setPreview] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [moverModal, setMoverModal] = useState(null)
  const [moverDestino, setMoverDestino] = useState(null)
  const [todasCarpetas, setTodasCarpetas] = useState([])

  const fileInputRef = useRef(null)
  const dropRef = useRef(null)
  const carpetaActualId = ruta.length > 0 ? ruta[ruta.length - 1].id : null

  const load = useCallback(async () => {
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from('carpetas_drive').select('*, creador:profiles(nombre_completo)').order('nombre'),
      supabase.from('archivos_drive').select('*, subidor:profiles(nombre_completo)').order('nombre'),
    ])
    setCarpetas(c || [])
    setArchivos(a || [])
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    localStorage.setItem('drive-vista', vista)
  }, [vista])

  // Drag & drop
  useEffect(() => {
    const el = dropRef.current
    if (!el || verPapelera) return
    let dragCount = 0
    function onDragEnter(e) { e.preventDefault(); dragCount++; setDragging(true) }
    function onDragLeave(e) { e.preventDefault(); dragCount--; if (dragCount <= 0) { dragCount = 0; setDragging(false) } }
    function onDragOver(e) { e.preventDefault() }
    function onDrop(e) { e.preventDefault(); dragCount = 0; setDragging(false); subirArchivos(e.dataTransfer.files) }
    el.addEventListener('dragenter', onDragEnter)
    el.addEventListener('dragleave', onDragLeave)
    el.addEventListener('dragover', onDragOver)
    el.addEventListener('drop', onDrop)
    return () => {
      el.removeEventListener('dragenter', onDragEnter)
      el.removeEventListener('dragleave', onDragLeave)
      el.removeEventListener('dragover', onDragOver)
      el.removeEventListener('drop', onDrop)
    }
  })

  const carpetasAqui = (carpetas || []).filter((c) => {
    if (verPapelera) return !!c.eliminado_at && coincide(busqueda, c.nombre)
    return c.padre_id === carpetaActualId && !c.eliminado_at && coincide(busqueda, c.nombre)
  })
  const archivosAqui = (archivos || []).filter((a) => {
    if (verPapelera) return !!a.eliminado_at && coincide(busqueda, a.nombre)
    return a.carpeta_id === carpetaActualId && !a.eliminado_at && coincide(busqueda, a.nombre)
  })

  const enPapelera = (carpetas || []).filter((c) => c.eliminado_at).length + (archivos || []).filter((a) => a.eliminado_at).length

  function entrar(carpeta) { setRuta([...ruta, { id: carpeta.id, nombre: carpeta.nombre }]); setBusqueda('') }
  function irA(index) { setRuta(ruta.slice(0, index + 1)); setBusqueda('') }
  function irARaiz() { setRuta([]); setBusqueda('') }

  function openNuevaCarpeta() { setCarpetaEditando(null); setCarpetaNombre(''); setCarpetaModal(true) }
  function openEditarCarpeta(c) { setCarpetaEditando(c); setCarpetaNombre(c.nombre); setCarpetaModal(true) }

  async function guardarCarpeta(e) {
    e.preventDefault()
    if (!carpetaNombre.trim()) return
    if (carpetaEditando) {
      await supabase.from('carpetas_drive').update({ nombre: carpetaNombre.trim() }).eq('id', carpetaEditando.id)
    } else {
      await supabase.from('carpetas_drive').insert({ nombre: carpetaNombre.trim(), padre_id: carpetaActualId, creado_por: profile.id })
    }
    setCarpetaModal(false)
    load()
  }

  async function subirArchivos(fileList) {
    if (!fileList?.length) return
    setSubiendo(true)
    const files = Array.from(fileList)
    for (const file of files) {
      const ts = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = carpetaActualId ? `${carpetaActualId}/${ts}-${safeName}` : `raiz/${ts}-${safeName}`
      const { error: upErr } = await supabase.storage.from('drive').upload(storagePath, file)
      if (upErr) { console.error(upErr); continue }
      await supabase.from('archivos_drive').insert({
        carpeta_id: carpetaActualId, nombre: file.name, storage_path: storagePath,
        tipo: file.type || null, tamano: file.size || null, subido_por: profile.id,
      })
    }
    setSubiendo(false)
    load()
  }

  function openRenombrar(archivo) { setRenombrarModal(archivo); setRenombrarNombre(archivo.nombre) }
  async function guardarRenombrar(e) {
    e.preventDefault()
    if (!renombrarNombre.trim()) return
    await supabase.from('archivos_drive').update({ nombre: renombrarNombre.trim() }).eq('id', renombrarModal.id)
    setRenombrarModal(null)
    load()
  }

  async function confirmarEliminar() {
    setConfirmBusy(true)
    const { tipo, item } = confirmEliminar
    const ahora = new Date().toISOString()
    if (tipo === 'carpeta') {
      await supabase.from('carpetas_drive').update({ eliminado_at: ahora }).eq('id', item.id)
      for (const a of (archivos || []).filter((a) => a.carpeta_id === item.id && !a.eliminado_at)) {
        await supabase.from('archivos_drive').update({ eliminado_at: ahora }).eq('id', a.id)
      }
    } else {
      await supabase.from('archivos_drive').update({ eliminado_at: ahora }).eq('id', item.id)
    }
    setConfirmBusy(false)
    setConfirmEliminar(null)
    load()
  }

  async function restaurar(tipo, item) {
    if (tipo === 'carpeta') {
      await supabase.from('carpetas_drive').update({ eliminado_at: null }).eq('id', item.id)
      for (const a of (archivos || []).filter((a) => a.carpeta_id === item.id && a.eliminado_at)) {
        await supabase.from('archivos_drive').update({ eliminado_at: null }).eq('id', a.id)
      }
    } else {
      await supabase.from('archivos_drive').update({ eliminado_at: null }).eq('id', item.id)
    }
    load()
  }

  const [confirmDefinitivo, setConfirmDefinitivo] = useState(null)
  const [confirmDefBusy, setConfirmDefBusy] = useState(false)

  async function eliminarDefinitivamente() {
    setConfirmDefBusy(true)
    const { tipo, item } = confirmDefinitivo
    if (tipo === 'carpeta') {
      for (const a of (archivos || []).filter((a) => a.carpeta_id === item.id)) {
        await supabase.storage.from('drive').remove([a.storage_path])
      }
      await supabase.from('carpetas_drive').delete().eq('id', item.id)
    } else {
      await supabase.storage.from('drive').remove([item.storage_path])
      await supabase.from('archivos_drive').delete().eq('id', item.id)
    }
    setConfirmDefBusy(false)
    setConfirmDefinitivo(null)
    load()
  }

  const [confirmVaciar, setConfirmVaciar] = useState(false)
  const [vaciarBusy, setVaciarBusy] = useState(false)

  async function vaciarPapelera() {
    setVaciarBusy(true)
    for (const a of (archivos || []).filter((a) => a.eliminado_at)) {
      await supabase.storage.from('drive').remove([a.storage_path])
    }
    await supabase.from('archivos_drive').delete().not('eliminado_at', 'is', null)
    await supabase.from('carpetas_drive').delete().not('eliminado_at', 'is', null)
    setVaciarBusy(false)
    setConfirmVaciar(false)
    load()
  }

  async function openMover(item, tipo) {
    setMoverModal({ item, tipo })
    setMoverDestino(tipo === 'carpeta' ? item.padre_id : item.carpeta_id)
    const { data } = await supabase.from('carpetas_drive').select('id, nombre, padre_id').order('nombre')
    setTodasCarpetas(data || [])
  }

  async function confirmarMover() {
    if (!moverModal) return
    const { item, tipo } = moverModal
    if (tipo === 'carpeta') {
      await supabase.from('carpetas_drive').update({ padre_id: moverDestino || null }).eq('id', item.id)
    } else {
      await supabase.from('archivos_drive').update({ carpeta_id: moverDestino || null }).eq('id', item.id)
    }
    setMoverModal(null)
    load()
  }

  function abrirPreview(archivo) {
    setPreview({ url: fileUrl(archivo.storage_path), nombre: archivo.nombre, mime: archivo.tipo })
  }

  if (!carpetas || !archivos) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      </div>
    )
  }

  const hayContenido = carpetasAqui.length > 0 || archivosAqui.length > 0
  const esAdmin = ['superadmin', 'admin', 'coordinador'].includes(profile.role)

  const viewProps = {
    carpetas: carpetasAqui, archivos: archivosAqui,
    onEntrar: verPapelera ? undefined : entrar,
    onPreview: abrirPreview,
    onEditarCarpeta: verPapelera ? undefined : openEditarCarpeta,
    onEliminar: verPapelera ? undefined : (tipo, item) => setConfirmEliminar({ tipo, item }),
    onRenombrar: verPapelera ? undefined : openRenombrar,
    onMover: verPapelera ? undefined : openMover,
    onRestaurar: verPapelera ? restaurar : undefined,
    onEliminarDefinitivo: verPapelera ? (tipo, item) => setConfirmDefinitivo({ tipo, item }) : undefined,
    esAdmin, papelera: verPapelera,
  }

  return (
    <div ref={dropRef} className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{verPapelera ? '🗑️ Papelera' : '📁 Drive'}</h1>
          <p className="text-sm text-ink/50">
            {verPapelera ? 'Archivos eliminados' : 'Archivos compartidos del equipo'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!verPapelera && (
            <>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400 text-white shadow-pop transition-transform hover:scale-105 active:scale-95 sm:h-auto sm:w-auto sm:rounded-full sm:px-4 sm:py-2"
                onClick={openNuevaCarpeta}
                title="Nueva carpeta"
              >
                <span className="sm:hidden text-lg">📁</span>
                <span className="hidden sm:inline text-sm font-bold">📁 Nueva carpeta</span>
              </button>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-ink/60 shadow-pop ring-1 ring-ink/10 transition-transform hover:scale-105 active:scale-95 sm:h-auto sm:w-auto sm:rounded-full sm:px-4 sm:py-2"
                disabled={subiendo}
                onClick={() => fileInputRef.current?.click()}
                title="Subir archivos"
              >
                <span className="sm:hidden text-lg">{subiendo ? '⏳' : '📤'}</span>
                <span className="hidden sm:inline text-sm font-bold">{subiendo ? '⏳ Subiendo...' : '📤 Subir'}</span>
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { subirArchivos(e.target.files); e.target.value = '' }} />
            </>
          )}
          {verPapelera && enPapelera > 0 && esAdmin && (
            <button className="rounded-full bg-coral-50 px-3 py-2 text-xs font-bold text-coral-600 hover:bg-coral-100 sm:px-4 sm:text-sm" onClick={() => setConfirmVaciar(true)}>
              🗑️ <span className="hidden sm:inline">Vaciar</span>
            </button>
          )}
          <button
            onClick={() => { setVerPapelera(!verPapelera); setBusqueda(''); setRuta([]) }}
            className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors sm:h-auto sm:w-auto sm:rounded-full sm:px-4 sm:py-2 ${
              verPapelera ? 'bg-coral-400 text-white' : 'bg-white text-ink/50 ring-1 ring-ink/10'
            }`}
            title="Papelera"
          >
            <span className="sm:hidden text-lg">🗑️</span>
            <span className="hidden sm:inline text-sm font-bold">🗑️ Papelera</span>
            {!verPapelera && enPapelera > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[9px] font-bold text-white sm:h-5 sm:w-5 sm:text-[10px]">
                {enPapelera}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      {!verPapelera && (
        <nav className="flex items-center gap-1 overflow-x-auto text-sm">
          <button
            onClick={irARaiz}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 font-bold transition-colors ${ruta.length === 0 ? 'bg-sky-100 text-sky-700' : 'text-ink/50 hover:bg-ink/5'}`}
          >
            🏠 Inicio
          </button>
          {ruta.map((r, i) => (
            <span key={r.id} className="flex items-center gap-1">
              <span className="text-ink/20">/</span>
              <button
                onClick={() => irA(i)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 font-bold transition-colors ${i === ruta.length - 1 ? 'bg-sky-100 text-sky-700' : 'text-ink/50 hover:bg-ink/5'}`}
              >
                {r.nombre}
              </button>
            </span>
          ))}
        </nav>
      )}

      {/* Search + View toggle */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Buscar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input flex-1 !py-2 !text-sm sm:max-w-xs"
        />
        <div className="flex overflow-hidden rounded-xl ring-1 ring-ink/10">
          {[['grid', '▦'], ['lista', '☰']].map(([v, icon]) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`px-3 py-2 text-sm font-bold transition-colors ${vista === v ? 'bg-sky-400 text-white' : 'bg-white text-ink/40 hover:bg-sky-50'}`}
              title={v === 'grid' ? 'Cuadrícula' : 'Lista'}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Upload overlay */}
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-sky-400/20 backdrop-blur-sm">
          <div className="rounded-3xl border-4 border-dashed border-sky-400 bg-white/90 px-12 py-10 text-center shadow-soft">
            <p className="text-5xl">📤</p>
            <p className="mt-3 text-lg font-bold text-sky-600">Suelta aquí para subir</p>
          </div>
        </div>
      )}

      {/* Upload progress bar */}
      {subiendo && (
        <div className="card flex items-center gap-3 !py-3 animate-pop-in">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-sky-400" />
          </div>
          <span className="text-xs font-bold text-ink/40">Subiendo...</span>
        </div>
      )}

      {/* Content */}
      {!hayContenido ? (
        <div
          className={`card flex flex-col items-center gap-3 py-16 text-center transition-colors ${
            !verPapelera ? 'cursor-pointer hover:bg-sky-50/50 border-2 border-dashed border-ink/10' : ''
          }`}
          onClick={!verPapelera ? () => fileInputRef.current?.click() : undefined}
        >
          <span className="text-5xl">{verPapelera ? '🗑️' : '📂'}</span>
          <p className="font-bold text-ink/40">
            {busqueda ? 'No hay resultados.' : verPapelera ? 'La papelera está vacía.' : 'Esta carpeta está vacía'}
          </p>
          {!verPapelera && !busqueda && (
            <p className="text-sm text-ink/30">Arrastra archivos aquí o toca para subir</p>
          )}
        </div>
      ) : vista === 'grid' ? (
        <GridView {...viewProps} />
      ) : (
        <ListView {...viewProps} />
      )}

      {/* Modals */}
      <Modal open={carpetaModal} onClose={() => setCarpetaModal(false)} title={carpetaEditando ? 'Renombrar carpeta' : 'Nueva carpeta'}>
        <form onSubmit={guardarCarpeta} className="flex flex-col gap-4">
          <div>
            <label className="label">Nombre</label>
            <input required className="input" value={carpetaNombre} onChange={(e) => setCarpetaNombre(e.target.value)} placeholder="Ej. Materiales de clase" autoFocus />
          </div>
          <button className="btn-primary justify-center">{carpetaEditando ? 'Guardar' : 'Crear carpeta'}</button>
        </form>
      </Modal>

      <Modal open={!!renombrarModal} onClose={() => setRenombrarModal(null)} title="Renombrar archivo">
        <form onSubmit={guardarRenombrar} className="flex flex-col gap-4">
          <div>
            <label className="label">Nombre</label>
            <input required className="input" value={renombrarNombre} onChange={(e) => setRenombrarNombre(e.target.value)} autoFocus />
          </div>
          <button className="btn-primary justify-center">Guardar</button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmEliminar} onClose={() => setConfirmEliminar(null)}
        onConfirm={confirmarEliminar} busy={confirmBusy}
        title={confirmEliminar?.tipo === 'carpeta' ? '¿Enviar carpeta a la papelera?' : '¿Enviar archivo a la papelera?'}
        confirmLabel="Sí, mover a papelera"
        message={confirmEliminar?.tipo === 'carpeta'
          ? `"${confirmEliminar.item.nombre}" y su contenido irán a la papelera.`
          : `"${confirmEliminar?.item.nombre}" irá a la papelera.`}
      />

      <ConfirmModal
        open={!!confirmDefinitivo} onClose={() => setConfirmDefinitivo(null)}
        onConfirm={eliminarDefinitivamente} busy={confirmDefBusy}
        title="¿Eliminar definitivamente?"
        confirmLabel="Sí, eliminar para siempre"
        message={`"${confirmDefinitivo?.item.nombre}" se borrará para siempre. Esta acción NO se puede deshacer.`}
      />

      <ConfirmModal
        open={confirmVaciar} onClose={() => setConfirmVaciar(false)}
        onConfirm={vaciarPapelera} busy={vaciarBusy}
        title="¿Vaciar toda la papelera?"
        confirmLabel="Sí, eliminar todo"
        message={`Se eliminarán ${enPapelera} elemento(s) del servidor. NO se puede deshacer.`}
      />

      <Modal open={!!moverModal} onClose={() => setMoverModal(null)} title={`Mover: ${moverModal?.item.nombre}`}>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink/50 mb-1">Selecciona la carpeta destino:</p>
          <button
            onClick={() => setMoverDestino(null)}
            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left font-bold transition-colors ${moverDestino === null ? 'bg-sky-100 text-sky-700 ring-2 ring-sky-400' : 'bg-ink/5 text-ink/60 hover:bg-ink/10'}`}
          >
            🏠 Inicio (raíz)
          </button>
          {todasCarpetas
            .filter((c) => moverModal?.tipo === 'carpeta' ? c.id !== moverModal.item.id : true)
            .map((c) => (
              <button
                key={c.id}
                onClick={() => setMoverDestino(c.id)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left font-bold transition-colors ${moverDestino === c.id ? 'bg-sky-100 text-sky-700 ring-2 ring-sky-400' : 'bg-ink/5 text-ink/60 hover:bg-ink/10'}`}
              >
                📁 {c.nombre}
              </button>
            ))}
          <button onClick={confirmarMover} className="btn-primary justify-center mt-2">Mover aquí</button>
        </div>
      </Modal>

      <FilePreview open={!!preview} onClose={() => setPreview(null)} url={preview?.url} nombre={preview?.nombre} mime={preview?.mime} />
    </div>
  )
}

// ─── Vista Grid ────────────────────────────────────────────────
function GridView({ carpetas, archivos, onEntrar, onPreview, onEditarCarpeta, onEliminar, onRenombrar, onMover, onRestaurar, onEliminarDefinitivo, esAdmin, papelera }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
      {carpetas.map((c) => (
        <CarpetaCard key={c.id} carpeta={c} onEntrar={onEntrar} onEditar={onEditarCarpeta} onEliminar={onEliminar} onMover={onMover} onRestaurar={onRestaurar} onEliminarDefinitivo={onEliminarDefinitivo} esAdmin={esAdmin} papelera={papelera} />
      ))}
      {archivos.map((a) => (
        <ArchivoCard key={a.id} archivo={a} onPreview={onPreview} onEliminar={onEliminar} onRenombrar={onRenombrar} onMover={onMover} onRestaurar={onRestaurar} onEliminarDefinitivo={onEliminarDefinitivo} esAdmin={esAdmin} papelera={papelera} />
      ))}
    </div>
  )
}

function CarpetaCard({ carpeta, onEntrar, onEditar, onEliminar, onMover, onRestaurar, onEliminarDefinitivo, esAdmin, papelera }) {
  const [menu, setMenu] = useState(false)
  return (
    <div className={`card-link relative flex flex-col items-center gap-1.5 !p-3 text-center sm:gap-2 sm:!p-4 ${papelera ? 'opacity-60' : ''}`} onClick={() => onEntrar?.(carpeta)}>
      <span className="text-4xl sm:text-5xl">📁</span>
      <p className="w-full truncate text-xs font-bold sm:text-sm">{carpeta.nombre}</p>
      <p className="text-[10px] text-ink/30">{papelera ? formatFecha(carpeta.eliminado_at) : carpeta.creador?.nombre_completo}</p>
      {papelera ? (
        <div className="flex gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onRestaurar?.('carpeta', carpeta)} className="rounded-lg bg-grass-50 px-2 py-1.5 text-xs font-bold text-grass-700 hover:bg-grass-100 active:scale-95">♻️</button>
          {esAdmin && <button onClick={() => onEliminarDefinitivo?.('carpeta', carpeta)} className="rounded-lg bg-coral-50 px-2 py-1.5 text-xs font-bold text-coral-700 hover:bg-coral-100 active:scale-95">🗑️</button>}
        </div>
      ) : (
        <ItemMenu open={menu} setOpen={setMenu}>
          <MenuItem label="✏️ Renombrar" onClick={() => onEditar(carpeta)} />
          <MenuItem label="📦 Mover" onClick={() => onMover(carpeta, 'carpeta')} />
          {esAdmin && <MenuItem label="🗑️ Eliminar" onClick={() => onEliminar('carpeta', carpeta)} danger />}
        </ItemMenu>
      )}
    </div>
  )
}

function ArchivoCard({ archivo, onPreview, onEliminar, onRenombrar, onMover, onRestaurar, onEliminarDefinitivo, esAdmin, papelera }) {
  const [menu, setMenu] = useState(false)
  const tipo = getFileType(archivo.nombre, archivo.tipo)
  const esImagen = tipo === 'imagen'
  const url = fileUrl(archivo.storage_path)

  return (
    <div className={`card-link relative flex flex-col items-center gap-1.5 !p-2 text-center sm:gap-2 sm:!p-3 ${papelera ? 'opacity-60' : ''}`} onClick={() => onPreview(archivo)}>
      {esImagen ? (
        <div className="aspect-square w-full overflow-hidden rounded-xl bg-ink/5">
          <img src={url} alt={archivo.nombre} className="h-full w-full object-cover" loading="lazy" />
        </div>
      ) : (
        <span className="py-2 text-4xl sm:py-3 sm:text-5xl">{getFileIcon(archivo.nombre, archivo.tipo)}</span>
      )}
      <p className="w-full truncate text-[11px] font-bold sm:text-xs">{archivo.nombre}</p>
      <p className="text-[10px] text-ink/30">{papelera ? formatFecha(archivo.eliminado_at) : formatBytes(archivo.tamano)}</p>
      {papelera ? (
        <div className="flex gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onRestaurar?.('archivo', archivo)} className="rounded-lg bg-grass-50 px-2 py-1.5 text-xs font-bold text-grass-700 hover:bg-grass-100 active:scale-95">♻️</button>
          {esAdmin && <button onClick={() => onEliminarDefinitivo?.('archivo', archivo)} className="rounded-lg bg-coral-50 px-2 py-1.5 text-xs font-bold text-coral-700 hover:bg-coral-100 active:scale-95">🗑️</button>}
        </div>
      ) : (
        <ItemMenu open={menu} setOpen={setMenu}>
          <MenuItem label="👁️ Ver" onClick={() => onPreview(archivo)} />
          <MenuItem label="✏️ Renombrar" onClick={() => onRenombrar(archivo)} />
          <MenuItem label="📦 Mover" onClick={() => onMover(archivo, 'archivo')} />
          <a href={url} target="_blank" rel="noreferrer" className="block px-4 py-2.5 text-left text-sm font-bold hover:bg-ink/5">⬇️ Descargar</a>
          {esAdmin && <MenuItem label="🗑️ Eliminar" onClick={() => onEliminar('archivo', archivo)} danger />}
        </ItemMenu>
      )}
    </div>
  )
}

// ─── Vista Lista ──────────────────────────────────────────────
function ListView({ carpetas, archivos, onEntrar, onPreview, onEditarCarpeta, onEliminar, onRenombrar, onMover, onRestaurar, onEliminarDefinitivo, esAdmin, papelera }) {
  return (
    <div className="card overflow-hidden !p-0">
      <div className="flex flex-col divide-y divide-ink/5">
        {carpetas.map((c) => (
          <div
            key={`c-${c.id}`}
            onClick={() => onEntrar?.(c)}
            className={`flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-sky-50/50 sm:px-4 sm:py-3 ${papelera ? 'opacity-60' : 'cursor-pointer'}`}
          >
            <span className="text-2xl shrink-0">📁</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{c.nombre}</p>
              <p className="text-[0.65rem] text-ink/30">
                {papelera ? `Eliminado ${formatFecha(c.eliminado_at)}` : c.creador?.nombre_completo || 'Carpeta'}
              </p>
            </div>
            <span className="hidden text-xs text-ink/30 sm:block">{formatFecha(c.created_at)}</span>
            <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
              {papelera ? (
                <>
                  <ActionBtn icon="♻️" onClick={() => onRestaurar?.('carpeta', c)} color="grass" />
                  {esAdmin && <ActionBtn icon="🗑️" onClick={() => onEliminarDefinitivo?.('carpeta', c)} color="coral" />}
                </>
              ) : (
                <>
                  <ActionBtn icon="✏️" onClick={() => onEditarCarpeta(c)} />
                  <ActionBtn icon="📦" onClick={() => onMover(c, 'carpeta')} />
                  {esAdmin && <ActionBtn icon="🗑️" onClick={() => onEliminar('carpeta', c)} color="coral" />}
                </>
              )}
            </div>
          </div>
        ))}
        {archivos.map((a) => (
          <div
            key={`a-${a.id}`}
            onClick={() => onPreview(a)}
            className={`flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-sky-50/50 sm:px-4 sm:py-3 ${papelera ? 'opacity-60' : 'cursor-pointer'}`}
          >
            <span className="text-2xl shrink-0">{getFileIcon(a.nombre, a.tipo)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{a.nombre}</p>
              <p className="text-[0.65rem] text-ink/30">
                {papelera ? `Eliminado ${formatFecha(a.eliminado_at)}` : `${formatBytes(a.tamano)} · ${a.subidor?.nombre_completo || ''}`}
              </p>
            </div>
            <span className="hidden text-xs text-ink/30 sm:block">{formatFecha(a.created_at)}</span>
            <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
              {papelera ? (
                <>
                  <ActionBtn icon="♻️" onClick={() => onRestaurar?.('archivo', a)} color="grass" />
                  {esAdmin && <ActionBtn icon="🗑️" onClick={() => onEliminarDefinitivo?.('archivo', a)} color="coral" />}
                </>
              ) : (
                <>
                  <ActionBtn icon="✏️" onClick={() => onRenombrar(a)} />
                  <ActionBtn icon="📦" onClick={() => onMover(a, 'archivo')} />
                  {esAdmin && <ActionBtn icon="🗑️" onClick={() => onEliminar('archivo', a)} color="coral" />}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Shared UI pieces ─────────────────────────────────────────
function ActionBtn({ icon, onClick, color }) {
  const colors = color === 'grass' ? 'text-grass-600 hover:bg-grass-50' : color === 'coral' ? 'text-coral-500 hover:bg-coral-50' : 'text-sky-500 hover:bg-sky-50'
  return (
    <button onClick={onClick} className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-colors active:scale-90 ${colors}`}>
      {icon}
    </button>
  )
}

function ItemMenu({ open, setOpen, children }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, setOpen])

  return (
    <div ref={ref} className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-ink/30 shadow-sm hover:bg-white hover:text-ink/60"
        aria-label="Opciones"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 min-w-[150px] rounded-xl bg-white py-1 shadow-soft ring-1 ring-ink/10">
          {children}
        </div>
      )}
    </div>
  )
}

function MenuItem({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2.5 text-left text-sm font-bold hover:bg-ink/5 ${danger ? 'text-coral-600 hover:bg-coral-50' : ''}`}
    >
      {label}
    </button>
  )
}
