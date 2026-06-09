import Image from 'next/image'
import Link from 'next/link'

type LogoProps = {
  priority?: boolean
}

export default function Logo({ priority }: LogoProps) {
  return (
    <Link href="/" className="flex items-center shrink-0 touch-manipulation">
      {/* Icon only on mobile — keeps the sticky header compact */}
      <Image
        src="/logo-mark.png"
        alt="AI Caddie"
        width={177}
        height={80}
        className="h-7 w-auto sm:hidden"
        priority={priority}
      />
      {/* Full wordmark on larger screens */}
      <Image
        src="/logo-trimmed.png"
        alt="AI Caddie"
        width={177}
        height={145}
        className="hidden sm:block h-8 w-auto max-w-[140px]"
        priority={priority}
      />
    </Link>
  )
}
