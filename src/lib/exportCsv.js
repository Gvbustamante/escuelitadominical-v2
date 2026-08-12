// Exporta filas a un .csv que Excel abre directo (con acentos correctos
// gracias al BOM). No agrega ninguna dependencia nueva al proyecto.
function celda(valor) {
  const s = String(valor ?? '')
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportCSV(nombreArchivo, encabezados, filas) {
  const lineas = [encabezados, ...filas].map((fila) => fila.map(celda).join(','))
  const contenido = '﻿' + lineas.join('\r\n')
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : `${nombreArchivo}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
