'use client'

type HolePickerProps = {
  holeCount: number
  currentHole: number
  completedHoles: ReadonlySet<number>
  onSelect: (index: number) => void
}

export default function HolePicker({
  holeCount,
  currentHole,
  completedHoles,
  onSelect,
}: HolePickerProps) {
  const cols = holeCount <= 9 ? 3 : 6

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      role="listbox"
      aria-label="Select hole"
    >
      {Array.from({ length: holeCount }, (_, i) => {
        const isCurrent = i === currentHole
        const isComplete = completedHoles.has(i)

        return (
          <button
            key={i}
            type="button"
            role="option"
            aria-selected={isCurrent}
            onClick={() => onSelect(i)}
            className={`relative flex flex-col items-center justify-center min-h-12 rounded-xl border text-sm font-bold transition touch-manipulation active:scale-[0.97] ${
              isCurrent
                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/30'
                : isComplete
                  ? 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-emerald-300'
            }`}
          >
            <span>{i + 1}</span>
            {isComplete && (
              <span
                className={`absolute bottom-1 text-[10px] leading-none ${
                  isCurrent ? 'text-emerald-600' : 'text-emerald-500'
                }`}
                aria-hidden
              >
                ✓
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
