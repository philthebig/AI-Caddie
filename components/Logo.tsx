import Image from 'next/image'
import Link from 'next/link'

type LogoProps = {
  heightClass?: string
  priority?: boolean
}

export default function Logo({ heightClass = 'h-9', priority }: LogoProps) {
  return (
    <Link
      href="/"
      className="inline-flex items-center min-h-11 shrink-0 touch-manipulation"
    >
      <Image
        src="/logo.png"
        alt="AI Caddie"
        width={160}
        height={48}
        className={`w-auto object-contain ${heightClass}`}
        priority={priority}
      />
    </Link>
  )
}
