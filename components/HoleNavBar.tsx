'use client'

import HolePicker from '@/components/HolePicker'

type HoleNavBarProps = {
  currentHole: number
  holeCount: number
  completedHoles: ReadonlySet<number>
  onSelectHole: (index: number) => void
  onPrev: () => void
  onNext: () => void
  onReview?: () => void
  pickerOpen: boolean
  onTogglePicker: () => void
  disabled?: boolean
}

export default function HoleNavBar({
  currentHole,
  holeCount,
  completedHoles,
  onSelectHole,
  onPrev,
  onNext,
  onReview,
  pickerOpen,
  onTogglePicker,
  disabled = false,
}: HoleNavBarProps) {
  const isFirst = currentHole === 0
  const isLast = currentHole === holeCount - 1

  function handleSelect(index: number) {
    onSelectHole(index)
    onTogglePicker()
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-bottom">
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-4 space-y-3">
        {pickerOpen && (
          <div className="pb-1">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
              Jump to hole
            </p>
            <HolePicker
              holeCount={holeCount}
              currentHole={currentHole}
              completedHoles={completedHoles}
              onSelect={handleSelect}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isFirst || disabled}
            onClick={onPrev}
            className="shrink-0 min-h-12 px-4 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 touch-manipulation"
          >
            {isFirst ? '—' : `< #${currentHole}`}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={onTogglePicker}
            className="flex-1 min-h-12 rounded-xl border-2 border-emerald-600 bg-emerald-50 text-emerald-800 font-black text-base touch-manipulation"
            aria-expanded={pickerOpen}
          >
            #{currentHole + 1}
            <span className="ml-1 text-xs font-semibold text-emerald-600">
              {pickerOpen ? '▲' : '▼'}
            </span>
          </button>

          {isLast ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onReview}
              className="shrink-0 min-h-12 px-4 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 touch-manipulation"
            >
              {disabled ? 'Saving…' : 'Finish'}
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={onNext}
              className="shrink-0 min-h-12 px-4 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 touch-manipulation"
            >
              {disabled ? 'Saving…' : `#${currentHole + 2} →`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
