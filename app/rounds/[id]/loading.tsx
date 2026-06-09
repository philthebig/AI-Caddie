export default function RoundDetailLoading() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 space-y-6 animate-pulse">
        <div className="h-5 w-24 bg-slate-200 rounded" />
        <div className="space-y-2">
          <div className="h-8 w-3/4 bg-slate-200 rounded" />
          <div className="h-4 w-1/2 bg-slate-200 rounded" />
        </div>
        <div className="h-28 bg-white rounded-2xl border border-slate-200" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
      </div>
    </main>
  )
}
