type UserAvatarProps = {
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function UserAvatar({ name, avatarUrl, size = 'md' }: UserAvatarProps) {
  const sizeClass = SIZES[size]

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={`${sizeClass} rounded-full object-cover border border-slate-200 shrink-0`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center border border-emerald-200 shrink-0`}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}
