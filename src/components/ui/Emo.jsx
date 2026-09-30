import {
  BarChart3, Upload, Download, KeyRound, Camera, Paperclip, Printer, Search, Pencil, Trash2, ClipboardList,
  Eye, CalendarDays, Settings, NotebookPen, Wrench, Link2, Sparkles, Copy, Users, Pause, Play, Ban, CheckCircle2,
  FileText, MessageCircle, FolderPlus, Info,
} from 'lucide-react'

// Emojis de interfaz → íconos de línea (se ven igual en Android, iPhone y PC).
// Los emojis de contenido (niveles, reacciones, insignias) NO pasan por aquí.
const MAPA = {
  '📊': BarChart3, '📤': Upload, '📥': Download, '⬇️': Download, '🔑': KeyRound, '📷': Camera, '📎': Paperclip,
  '🖨️': Printer, '🔍': Search, '✏️': Pencil, '🗑️': Trash2, '📋': ClipboardList, '👁️': Eye, '📅': CalendarDays,
  '⚙️': Settings, '📝': NotebookPen, '🧰': Wrench, '🔗': Link2, '✨': Sparkles, '📄': Copy, '👪': Users,
  '⏸️': Pause, '▶️': Play, '🚫': Ban, '✅': CheckCircle2, '💬': MessageCircle, '📁': FolderPlus, 'ℹ️': Info,
  '🧾': FileText,
}

/** Ícono de interfaz a partir de su emoji. Si no hay equivalente, muestra el emoji. */
export default function Emo({ e, className = '' }) {
  const Cmp = MAPA[e]
  if (!Cmp) return <span aria-hidden="true" className={className}>{e}</span>
  return <Cmp aria-hidden="true" size="1.1em" strokeWidth={2.2} className={`inline-block shrink-0 align-[-0.18em] ${className}`} />
}
