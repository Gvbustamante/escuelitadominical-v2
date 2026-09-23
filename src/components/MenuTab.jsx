import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { refreshConfigIglesia } from '../lib/configIglesia'

const ITEMS_MENU = [
  { to: '/devocionales', label: 'Devocionales', icon: '🙏' },
  { to: '/asistencia', label: 'Asistencia', icon: '✅' },
  { to: '/actividades', label: 'Actividades', icon: '🎨' },
  { to: '/bitacora', label: 'Bitácora', icon: '📋' },
  { to: '/planeacion', label: 'Planeación', icon: '📆' },
  { to: '/agenda', label: 'Agenda', icon: '📅' },
  { to: '/foro', label: 'Nuestra comunidad', icon: '🤝' },
  { to: '/drive', label: 'Drive', icon: '📁' },
  { to: '/ninos', label: 'Niños', icon: '🧒' },
  { to: '/clases', label: 'Clases', icon: '🎒' },
  { to: '/docentes', label: 'Equipo', icon: '🍎' },
  { to: '/reporte-docentes', label: 'Reporte docentes', icon: '📊' },
]

const ICONOS_CATEGORIA = ['📚', '📂', '👥', '📊', '🎯', '🛠️', '🌟', '📌', '🏫', '💡']

function itemPorRuta(ruta) {
  return ITEMS_MENU.find((i) => i.to === ruta)
}

export default function MenuTab({ config }) {
  const [modo, setModo] = useState('plano')
  const [categorias, setCategorias] = useState([])
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [nuevaCat, setNuevaCat] = useState('')

  useEffect(() => {
    if (config?.menu_estructura && Array.isArray(config.menu_estructura) && config.menu_estructura.length > 0) {
      setModo('categorizado')
      setCategorias(config.menu_estructura)
    } else {
      setModo('plano')
      setCategorias([])
    }
  }, [config?.menu_estructura])

  const itemsAsignados = new Set(categorias.flatMap((c) => c.items || []))
  const itemsLibres = ITEMS_MENU.filter((i) => !itemsAsignados.has(i.to))

  function agregarCategoria(e) {
    e.preventDefault()
    if (!nuevaCat.trim()) return
    setCategorias([...categorias, { nombre: nuevaCat.trim(), icon: '📂', items: [] }])
    setNuevaCat('')
    setOk('')
  }

  function eliminarCategoria(idx) {
    setCategorias(categorias.filter((_, i) => i !== idx))
    setOk('')
  }

  function cambiarNombreCat(idx, nombre) {
    setCategorias(categorias.map((c, i) => (i === idx ? { ...c, nombre } : c)))
    setOk('')
  }

  function cambiarIconoCat(idx, icon) {
    setCategorias(categorias.map((c, i) => (i === idx ? { ...c, icon } : c)))
    setOk('')
  }

  function agregarItemACat(idx, ruta) {
    setCategorias(categorias.map((c, i) => (i === idx ? { ...c, items: [...(c.items || []), ruta] } : c)))
    setOk('')
  }

  function quitarItemDeCat(idx, ruta) {
    setCategorias(categorias.map((c, i) => (i === idx ? { ...c, items: (c.items || []).filter((r) => r !== ruta) } : c)))
    setOk('')
  }

  function moverCategoria(idx, dir) {
    const nueva = [...categorias]
    const target = idx + dir
    if (target < 0 || target >= nueva.length) return
    ;[nueva[idx], nueva[target]] = [nueva[target], nueva[idx]]
    setCategorias(nueva)
    setOk('')
  }

  async function guardar() {
    if (!config?.id) return
    setSaving(true)
    const valor = modo === 'categorizado' && categorias.length > 0 ? categorias : null
    await supabase.from('config_iglesia').update({ menu_estructura: valor, updated_at: new Date().toISOString() }).eq('id', config.id)
    setSaving(false)
    setOk('¡Menú actualizado! Los cambios ya se ven para todos.')
    await refreshConfigIglesia()
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <div className="card">
        <p className="label mb-1">Estructura del menú</p>
        <p className="mb-4 text-sm text-ink/50">
          Elige si el menú lateral se muestra plano (todos los items sueltos) o categorizado (agrupados en secciones con submenús).
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setModo('plano'); setOk('') }}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${modo === 'plano' ? 'bg-sky-400 text-white' : 'bg-ink/5 text-ink/50'}`}
          >
            📋 Solo menús
          </button>
          <button
            type="button"
            onClick={() => { setModo('categorizado'); setOk('') }}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${modo === 'categorizado' ? 'bg-sky-400 text-white' : 'bg-ink/5 text-ink/50'}`}
          >
            📂 Menús y submenús
          </button>
        </div>
      </div>

      {modo === 'categorizado' && (
        <>
          {categorias.map((cat, idx) => (
            <div key={idx} className="card !p-0 overflow-hidden">
              <div className="flex items-center gap-2 bg-ink/5 px-4 py-3">
                <select
                  value={cat.icon}
                  onChange={(e) => cambiarIconoCat(idx, e.target.value)}
                  className="rounded-lg border-0 bg-transparent py-0 text-xl focus:ring-2 focus:ring-sky-300"
                >
                  {ICONOS_CATEGORIA.map((ic) => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
                <input
                  className="input !py-1.5 flex-1 !text-sm font-bold"
                  value={cat.nombre}
                  onChange={(e) => cambiarNombreCat(idx, e.target.value)}
                  placeholder="Nombre de la categoría"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moverCategoria(idx, -1)}
                    disabled={idx === 0}
                    className="rounded-lg px-2 py-1 text-xs font-bold text-ink/30 hover:bg-ink/10 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moverCategoria(idx, 1)}
                    disabled={idx === categorias.length - 1}
                    className="rounded-lg px-2 py-1 text-xs font-bold text-ink/30 hover:bg-ink/10 disabled:opacity-30"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarCategoria(idx)}
                    className="rounded-lg px-2 py-1 text-xs font-bold text-coral-500 hover:bg-coral-50"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1 px-4 py-3">
                {(cat.items || []).length === 0 && (
                  <p className="text-xs text-ink/30">Sin items — agrega uno abajo</p>
                )}
                {(cat.items || []).map((ruta) => {
                  const item = itemPorRuta(ruta)
                  if (!item) return null
                  return (
                    <div key={ruta} className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-1.5">
                      <span>{item.icon}</span>
                      <span className="flex-1 text-sm font-bold text-sky-700">{item.label}</span>
                      <button
                        type="button"
                        onClick={() => quitarItemDeCat(idx, ruta)}
                        className="text-xs font-bold text-ink/30 hover:text-coral-500"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}

                {itemsLibres.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) agregarItemACat(idx, e.target.value) }}
                    className="input mt-1 !py-1.5 !text-xs"
                  >
                    <option value="">+ Agregar item a esta categoría</option>
                    {itemsLibres.map((item) => (
                      <option key={item.to} value={item.to}>
                        {item.icon} {item.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}

          <form onSubmit={agregarCategoria} className="flex gap-2">
            <input
              className="input flex-1"
              value={nuevaCat}
              onChange={(e) => setNuevaCat(e.target.value)}
              placeholder="Nombre de nueva categoría"
            />
            <button className="btn-secondary shrink-0">+ Categoría</button>
          </form>

          {itemsLibres.length > 0 && (
            <div className="rounded-xl bg-sunshine-50 px-4 py-3">
              <p className="text-xs font-bold text-sunshine-700 mb-2">Items sin categoría (se mostrarán sueltos):</p>
              <div className="flex flex-wrap gap-1.5">
                {itemsLibres.map((item) => (
                  <span key={item.to} className="badge bg-white text-ink/50">
                    {item.icon} {item.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {ok && <p className="rounded-xl bg-grass-50 px-3 py-2 text-sm font-bold text-grass-600">{ok}</p>}
      <button type="button" onClick={guardar} disabled={saving} className="btn-primary justify-center">
        {saving ? 'Guardando...' : '💾 Guardar estructura de menú'}
      </button>
    </div>
  )
}
