const COLORS = {
  sky: 'bg-sky-100 text-sky-700',
  grass: 'bg-grass-100 text-grass-700',
  sunshine: 'bg-sunshine-100 text-sunshine-700',
  coral: 'bg-coral-100 text-coral-700',
  grape: 'bg-grape-100 text-grape-700',
}

export default function StatCard({ icon, label, value, color = 'sky' }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl ${COLORS[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-3xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-sm font-bold text-ink/50">{label}</p>
      </div>
    </div>
  )
}
