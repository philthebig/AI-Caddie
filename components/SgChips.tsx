import type { StrokesGainedBreakdown } from '@/lib/types/golf'

export function formatSg(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`
}

type SgChipsProps = {
  sg: Pick<StrokesGainedBreakdown, 'ott' | 'app' | 'arg' | 'putt' | 'total'>
  /** Include a total chip (default true). */
  showTotal?: boolean
  size?: 'sm' | 'md'
}

const CATEGORIES = [
  ['OTT', 'ott'],
  ['APP', 'app'],
  ['ARG', 'arg'],
  ['PUTT', 'putt'],
] as const

function chipClass(val: number, size: 'sm' | 'md'): string {
  const base =
    val >= 0
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : 'bg-red-50 text-red-800 border-red-200'
  const sizing =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] font-bold'
      : 'px-3 py-1.5 text-sm font-bold'
  return `inline-flex items-center rounded-full border ${base} ${sizing}`
}

export default function SgChips({ sg, showTotal = true, size = 'md' }: SgChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CATEGORIES.map(([label, key]) => (
        <span key={label} className={chipClass(sg[key], size)}>
          {label} {formatSg(sg[key])}
        </span>
      ))}
      {showTotal && (
        <span
          className={`inline-flex items-center rounded-full border bg-slate-100 text-slate-800 border-slate-200 ${
            size === 'sm' ? 'px-2 py-0.5 text-[11px] font-black' : 'px-3 py-1.5 text-sm font-black'
          }`}
        >
          Total {formatSg(sg.total)}
        </span>
      )}
    </div>
  )
}
