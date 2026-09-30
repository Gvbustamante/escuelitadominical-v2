import { Icono } from '../IconoRuta'

/** Título de pantalla uniforme: ícono de color de la sección del menú + texto. */
export default function TituloPagina({ ruta, children }) {
  return (
    <h1 className="flex items-center gap-3 text-2xl font-bold leading-tight sm:text-3xl">
      {ruta && <Icono item={{ to: ruta }} size={20} />}
      <span className="min-w-0">{children}</span>
    </h1>
  )
}
