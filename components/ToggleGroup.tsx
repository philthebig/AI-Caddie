type ToggleGroupProps<T extends string> = {
  label: string
  options: readonly T[]
  value: T | null
  onChange: (value: T) => void
  labels?: Partial<Record<T, string>>
  large?: boolean
}

export default function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  labels,
  large = false,
}: ToggleGroupProps<T>) {
  const gridCols =
    options.length >= 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : options.length === 3
        ? 'grid-cols-3'
        : 'grid-cols-2'

  return (
    <div>
      <span className="block text-sm font-medium text-slate-700 mb-2">{label}</span>
      <div
        role="group"
        aria-label={label}
        className={`grid gap-2 ${gridCols}`}
      >
        {options.map((option) => {
          const active = value === option
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option)}
              className={`${large ? 'min-h-14 text-base' : 'min-h-12 sm:min-h-11 text-sm'} rounded-xl border px-3 py-3 font-semibold transition touch-manipulation select-none active:scale-[0.97] ${
                active
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 active:bg-slate-50'
              }`}
            >
              {labels?.[option] ?? option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
