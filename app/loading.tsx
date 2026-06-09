export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-8 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-2/3 bg-slate-200 rounded-lg" />
          <div className="h-4 w-1/3 bg-slate-200 rounded" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-xl border border-slate-200" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
      </div>
    </main>
  )
}
