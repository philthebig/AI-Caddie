'use client'

import Logo from '@/components/Logo'
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function ConditionalAppHeader() {
  const pathname = usePathname()
  const isPlayRoute = pathname.startsWith('/play/')
  const isShareRoute = pathname.startsWith('/share/')

  if (isPlayRoute) return null

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-3 py-1 flex justify-between items-center safe-top h-11 sm:h-12">
      <Logo priority />
      <div className="flex items-center gap-3">
        <SignedIn>
          {!isShareRoute && (
            <Link
              href="/friends"
              className={`text-sm font-semibold min-h-11 inline-flex items-center px-1 ${
                pathname.startsWith('/friends')
                  ? 'text-emerald-800'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Friends
            </Link>
          )}
          <UserButton />
        </SignedIn>
        <SignedOut>
          {!isShareRoute && (
            <SignInButton mode="modal">
              <button
                type="button"
                className="text-sm font-semibold text-slate-600 hover:text-emerald-700 min-h-11 px-1"
              >
                Sign in
              </button>
            </SignInButton>
          )}
        </SignedOut>
      </div>
    </header>
  )
}
