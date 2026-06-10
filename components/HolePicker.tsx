'use client'

type HolePickerProps = {
  holeCount: number
  currentHole: number
  completedHoles: ReadonlySet<number>
  pendingHoles?: ReadonlySet<number>
  failedHoles?: ReadonlySet<number>
  onSelect: (index: number) => void
}

export default function HolePicker({
  holeCount,
  currentHole,
  completedHoles,
  pendingHoles,
  failedHoles,
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
        const isPending = pendingHoles?.has(i) ?? false
        const isFailed = failedHoles?.has(i) ?? false

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
                : isFailed
                  ? 'border-red-300 bg-red-50 text-red-800 hover:border-red-400'
                  : isPending
                    ? 'border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400'
                    : isComplete
                      ? 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-emerald-300'
            }`}
          >
            <span>{i + 1}</span>
            {isFailed ? (
              <span
                className="absolute top-1 right-1.5 text-[10px] font-black leading-none text-red-600"
                aria-label="Sync failed"
                title="Sync failed"
              >
                !
              </span>
            ) : isPending ? (
              <span
                className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500"
                aria-label="Pending sync"
                title="Pending sync"
              />
            ) : isComplete ? (
              <span
                className={`absolute top-1 right-1.5 text-xs font-black leading-none ${
                  isCurrent ? 'text-emerald-600' : 'text-emerald-500'
                }`}
                aria-label="Completed"
              >
                ✓
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
