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
        width={1768}
        height={795}
        className="h-7 w-auto object-contain sm:hidden"
        style={{ width: 'auto', height: '1.75rem' }}
        priority={priority}
      />
      {/* Full wordmark on larger screens */}
      <Image
        src="/logo-trimmed.png"
        alt="AI Caddie"
        width={1768}
        height={1446}
        className="hidden sm:block h-8 w-auto max-w-[140px] object-contain"
        style={{ width: 'auto', height: '2rem' }}
        priority={priority}
      />
    </Link>
  )
}
