type StatPillProps = {
  label: string
  value: string | number
  sub?: string
}

export default function StatPill({ label, value, sub }: StatPillProps) {
  return (
    <div className="text-center p-3 bg-slate-50 rounded-xl min-w-0">
      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="font-black text-slate-800 text-lg leading-none">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}
