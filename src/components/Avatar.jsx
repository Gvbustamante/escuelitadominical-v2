const COLORES_AVATAR = [
  'bg-sky-600 text-white',
  'bg-coral-600 text-white',
  'bg-grape-500 text-white',
  'bg-sunshine-400 text-ink',
  'bg-grass-600 text-white',
]

const TAMANOS = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-xl',
}

function colorPara(nombre) {
  let hash = 0
  for (let i = 0; i < (nombre || '').length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) | 0
  return COLORES_AVATAR[Math.abs(hash) % COLORES_AVATAR.length]
}

function iniciales(nombre) {
  if (!nombre) return '?'
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export default function Avatar({ nombre, size = 'md', className = '' }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold ${TAMANOS[size]} ${colorPara(nombre)} ${className}`}
    >
      {iniciales(nombre)}
    </div>
  )
}
