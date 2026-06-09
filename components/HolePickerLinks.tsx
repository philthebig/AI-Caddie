import Link from 'next/link'

type HolePickerLinksProps = {
  roundId: string
  holeCount: number
}

export default function HolePickerLinks({ roundId, holeCount }: HolePickerLinksProps) {
  const cols = holeCount <= 9 ? 3 : 6

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: holeCount }, (_, i) => (
        <Link
          key={i}
          href={`/rounds/${roundId}/edit?hole=${i + 1}`}
          className="relative flex flex-col items-center justify-center min-h-12 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:border-emerald-300 active:scale-[0.97] transition touch-manipulation"
        >
          <span>{i + 1}</span>
          <span className="absolute bottom-1 text-[10px] leading-none text-emerald-500" aria-hidden>
            ✓
          </span>
        </Link>
      ))}
    </div>
  )
}
