type ToggleGroupProps<T extends string> = {
  label: string
  options: readonly T[]
  value: T | null
  onChange: (value: T) => void
  labels?: Partial<Record<T, string>>
}

export default function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  labels,
}: ToggleGroupProps<T>) {
  return (
    <div>
      <span className="block text-sm font-medium text-slate-700 mb-2">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`min-h-11 min-w-[4.5rem] flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                active
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
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
