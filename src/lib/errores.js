// Mensajes de la base pasados a texto claro para la persona.
export function mensajeError(msg = '') {
  const limite = msg.match(/LIMITE_PLAN:\s*(.*)/)
  if (limite) return `${limite[1].charAt(0).toUpperCase()}${limite[1].slice(1)}. Para agregar más, cambia de plan.`
  return msg
}
