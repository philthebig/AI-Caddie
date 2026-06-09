type EmptyStateProps = {
  icon?: string
  title: string
  description: string
  action?: React.ReactNode
}

export default function EmptyState({ icon = '⛳', title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center p-8 sm:p-12 bg-white rounded-xl border border-dashed border-slate-300">
      <div className="text-4xl mb-3" aria-hidden>
        {icon}
      </div>
      <h3 className="font-bold text-slate-800 text-lg mb-1">{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
