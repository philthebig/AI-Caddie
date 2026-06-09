'use client'

import ToggleGroup from '@/components/ToggleGroup'
import {
  APP_MISS_DIRECTIONS,
  OTT_MISS_DIRECTIONS,
  type HoleInput,
} from '@/lib/types/golf'
import { useState } from 'react'

function ToggleYesNo({
  label,
  value,
  onChange,
  large = false,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  large?: boolean
}) {
  return (
    <ToggleGroup
      label={label}
      options={['YES', 'NO'] as const}
      value={value ? 'YES' : 'NO'}
      onChange={(v) => onChange(v === 'YES')}
      labels={{ YES: 'Yes', NO: 'No' }}
      large={large}
    />
  )
}

const scoreInputClass =
  'w-full rounded-xl border-2 border-slate-200 bg-white p-4 text-2xl font-black text-center touch-manipulation focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20'

type HoleScoreCardProps = {
  hole: HoleInput
  onUpdate: (patch: Partial<HoleInput>) => void
}

export default function HoleScoreCard({ hole, onUpdate }: HoleScoreCardProps) {
  const isPar3 = (hole.par ?? 4) === 3
  const [moreStatsOpen, setMoreStatsOpen] = useState(false)

  const hasShotDetails =
    !isPar3 || !hole.gir || hole.upAndDownAttempt || hole.penaltyStrokes > 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
            Score
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={15}
            value={hole.score}
            onChange={(e) => onUpdate({ score: Number(e.target.value) })}
            className={scoreInputClass}
            aria-label="Hole score"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
            Putts
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={10}
            value={hole.putts}
            onChange={(e) => onUpdate({ putts: Number(e.target.value) })}
            className={scoreInputClass}
            aria-label="Putts"
          />
        </div>
      </div>

      <ToggleYesNo
        label="Green in regulation"
        value={hole.gir}
        onChange={(gir) => onUpdate({ gir })}
        large
      />

      <button
        type="button"
        onClick={() => setMoreStatsOpen((open) => !open)}
        className="w-full min-h-12 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 touch-manipulation hover:bg-slate-50"
        aria-expanded={moreStatsOpen}
      >
        <span>More stats</span>
        <span className="text-slate-400" aria-hidden>
          {moreStatsOpen ? '▲' : '▼'}
        </span>
      </button>

      {moreStatsOpen && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Penalty strokes
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={5}
              value={hole.penaltyStrokes}
              onChange={(e) => onUpdate({ penaltyStrokes: Number(e.target.value) })}
              className="w-full rounded-xl border border-slate-200 p-3 text-lg font-bold touch-manipulation"
            />
          </div>

          {!isPar3 && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-3">
                Off the tee
              </p>
              <ToggleGroup
                label="Driving result"
                options={OTT_MISS_DIRECTIONS}
                value={hole.ottMissDirection ?? 'HIT'}
                onChange={(v) => onUpdate({ ottMissDirection: v })}
                labels={{ LEFT: 'Left', HIT: 'Fairway', RIGHT: 'Right' }}
                large
              />
            </div>
          )}

          {!hole.gir && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Approach
              </p>
              <ToggleGroup
                label="Miss direction"
                options={APP_MISS_DIRECTIONS}
                value={hole.appMissDirection ?? 'SHORT'}
                onChange={(v) => onUpdate({ appMissDirection: v })}
                labels={{ LEFT: 'Left', RIGHT: 'Right', SHORT: 'Short', LONG: 'Long' }}
                large
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Approach proximity (feet)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={200}
                  placeholder="e.g. 25"
                  value={hole.approachProximity ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      approachProximity: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-3 touch-manipulation"
                />
              </div>
            </div>
          )}

          {!hole.gir && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Around the green
              </p>
              <ToggleYesNo
                label="Up-and-down attempt"
                value={hole.upAndDownAttempt ?? false}
                onChange={(v) =>
                  onUpdate({
                    upAndDownAttempt: v,
                    upAndDownSuccess: v ? hole.upAndDownSuccess : null,
                  })
                }
                large
              />
              {hole.upAndDownAttempt && (
                <>
                  <ToggleYesNo
                    label="Saved par / up-and-down"
                    value={hole.upAndDownSuccess ?? false}
                    onChange={(v) => onUpdate({ upAndDownSuccess: v })}
                    large
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Chip proximity (feet)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      placeholder="e.g. 8"
                      value={hole.argProximity ?? ''}
                      onChange={(e) =>
                        onUpdate({
                          argProximity: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 p-3 touch-manipulation"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {!hasShotDetails && (
            <p className="text-sm text-slate-500 text-center py-2">
              No extra stats needed for this hole.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
