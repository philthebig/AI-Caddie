'use client'

import ToggleGroup from '@/components/ToggleGroup'
import {
  APP_MISS_DIRECTIONS,
  OTT_MISS_DIRECTIONS,
  type HoleInput,
} from '@/lib/types/golf'

function ToggleYesNo({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <ToggleGroup
      label={label}
      options={['YES', 'NO'] as const}
      value={value ? 'YES' : 'NO'}
      onChange={(v) => onChange(v === 'YES')}
      labels={{ YES: 'Yes', NO: 'No' }}
    />
  )
}

type HoleScoreCardProps = {
  hole: HoleInput
  onUpdate: (patch: Partial<HoleInput>) => void
}

export default function HoleScoreCard({ hole, onUpdate }: HoleScoreCardProps) {
  const isPar3 = (hole.par ?? 4) === 3

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Score</label>
          <input
            type="number"
            min={1}
            max={15}
            value={hole.score}
            onChange={(e) => onUpdate({ score: Number(e.target.value) })}
            className="w-full rounded-md border border-slate-300 p-3 text-lg font-bold"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Putts</label>
          <input
            type="number"
            min={0}
            max={10}
            value={hole.putts}
            onChange={(e) => onUpdate({ putts: Number(e.target.value) })}
            className="w-full rounded-md border border-slate-300 p-3 text-lg font-bold"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Penalty strokes</label>
        <input
          type="number"
          min={0}
          max={5}
          value={hole.penaltyStrokes}
          onChange={(e) => onUpdate({ penaltyStrokes: Number(e.target.value) })}
          className="w-full rounded-md border border-slate-300 p-3"
        />
      </div>

      {!isPar3 && (
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-3">
            Off the Tee (OTT)
          </p>
          <ToggleGroup
            label="Driving result"
            options={OTT_MISS_DIRECTIONS}
            value={hole.ottMissDirection ?? 'HIT'}
            onChange={(v) => onUpdate({ ottMissDirection: v })}
            labels={{ LEFT: 'Left', HIT: 'Fairway', RIGHT: 'Right' }}
          />
        </div>
      )}

      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-3">
          Approach (APP)
        </p>
        <ToggleYesNo
          label="Green in regulation"
          value={hole.gir}
          onChange={(gir) => onUpdate({ gir })}
        />
        {!hole.gir && (
          <div className="mt-4 space-y-4">
            <ToggleGroup
              label="Miss direction"
              options={APP_MISS_DIRECTIONS}
              value={hole.appMissDirection ?? 'SHORT'}
              onChange={(v) => onUpdate({ appMissDirection: v })}
              labels={{ LEFT: 'Left', RIGHT: 'Right', SHORT: 'Short', LONG: 'Long' }}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Approach proximity (feet from pin)
              </label>
              <input
                type="number"
                min={0}
                max={200}
                placeholder="e.g. 25"
                value={hole.approachProximity ?? ''}
                onChange={(e) =>
                  onUpdate({
                    approachProximity: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full rounded-md border border-slate-300 p-3"
              />
            </div>
          </div>
        )}
      </div>

      {!hole.gir && (
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-3">
            Around the Green (ARG)
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
          />
          {hole.upAndDownAttempt && (
            <div className="mt-4 space-y-4">
              <ToggleYesNo
                label="Saved par / up-and-down"
                value={hole.upAndDownSuccess ?? false}
                onChange={(v) => onUpdate({ upAndDownSuccess: v })}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Chip proximity (feet)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="e.g. 8"
                  value={hole.argProximity ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      argProximity: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-md border border-slate-300 p-3"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
