import type { PracticeFocus } from '@/lib/golf-logic/insights'

type PracticeFocusBannerProps = {
  focus: PracticeFocus
}

export default function PracticeFocusBanner({ focus }: PracticeFocusBannerProps) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 mb-1">
        Practice focus this week
      </p>
      <h2 className="text-lg font-extrabold text-amber-950">{focus.headline}</h2>
      <p className="text-sm text-amber-900 mt-1">{focus.detail}</p>
      {focus.trendNote && (
        <p className="text-xs text-amber-800 mt-2 font-medium">↳ {focus.trendNote}</p>
      )}
      {focus.drillName && (
        <p className="text-xs text-amber-700 mt-2">
          Suggested drill: <span className="font-semibold">{focus.drillName}</span>
        </p>
      )}
      <p className="text-[10px] text-amber-500 mt-3">
        Based on your last {focus.roundCount} rounds with hole-by-hole data
      </p>
    </section>
  )
}
