import FriendsClient from '@/components/FriendsClient'
import { getDbUser } from '@/lib/auth'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Friends',
}

export default async function FriendsPage() {
  const dbUser = await getDbUser()
  if (!dbUser) notFound()

  return (
    <main className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900 min-h-11"
        >
          ← Dashboard
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-800">
            Friends
          </h1>
          <p className="text-sm text-slate-500">
            Connect with golfers you know — share rounds and coach highlights when you&apos;re ready.
          </p>
        </header>

        <FriendsClient initialUsername={dbUser.username} />
      </div>
    </main>
  )
}
