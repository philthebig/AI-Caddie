import type { TrendSeries } from '@/lib/golf-logic/trends'

type TrendsChartProps = {
  series: TrendSeries[]
  minRounds?: number
}

function Sparkline({
  label,
  unit,
  color,
  values,
}: {
  label: string
  unit: string
  color: string
  values: { label: string; value: number | null }[]
}) {
  const numeric = values.map((v) => v.value).filter((v): v is number => v != null)
  if (numeric.length === 0) return null

  const min = Math.min(...numeric)
  const max = Math.max(...numeric)
  const range = max - min || 1
  const w = 200
  const h = 48
  const pad = 4

  const points = values
    .map((v, i) => {
      if (v.value == null) return null
      const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2)
      const y = h - pad - ((v.value - min) / range) * (h - pad * 2)
      return `${x},${y}`
    })
    .filter(Boolean)
    .join(' ')

  const latest = numeric[numeric.length - 1]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <span className="text-lg font-black" style={{ color }}>
          {latest}
          {unit}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" aria-hidden>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {values.map((v, i) => {
          if (v.value == null) return null
          const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2)
          const y = h - pad - ((v.value - min) / range) * (h - pad * 2)
          return <circle key={i} cx={x} cy={y} r="3" fill={color} />
        })}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400 font-medium">
        <span>{values[0]?.label}</span>
        <span>{values[values.length - 1]?.label}</span>
      </div>
    </div>
  )
}

export default function TrendsChart({ series, minRounds = 2 }: TrendsChartProps) {
  const hasData = series.some((s) => s.values.some((v) => v.value != null))

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">
          Log a few rounds to see GIR, fairway, and putting trends over time.
        </p>
      </div>
    )
  }

  const roundCount = series[0]?.values.length ?? 0

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Trends</h2>
        <p className="text-sm text-slate-500">
          {roundCount >= minRounds
            ? `Last ${roundCount} rounds`
            : 'Add more rounds for clearer trends'}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {series.map((s) => (
          <Sparkline
            key={s.key}
            label={s.label}
            unit={s.unit}
            color={s.color}
            values={s.values}
          />
        ))}
      </div>
    </section>
  )
}
