'use client'

import Logo from '@/components/Logo'
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'

export default function ConditionalAppHeader() {
  const pathname = usePathname()
  const isPlayRoute = pathname.startsWith('/play/')

  if (isPlayRoute) return null

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-3 py-1 flex justify-between items-center safe-top h-11 sm:h-12">
      <Logo priority />
      <SignedIn>
        <UserButton />
      </SignedIn>
      <SignedOut>
        <SignInButton />
      </SignedOut>
    </header>
  )
}
