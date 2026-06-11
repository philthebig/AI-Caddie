import SgChips from '@/components/SgChips'
import UserAvatar from '@/components/UserAvatar'
import { formatScoreVsPar, type ShareCardData } from '@/lib/social/share-card'
import { loadShareByToken } from '@/lib/social/load-share'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type PageProps = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const loaded = await loadShareByToken(token)
  if (!loaded) {
    return { title: 'Share not found' }
  }

  const { card } = loaded
  const vsPar = formatScoreVsPar(card.scoreVsPar)
  const title = `${card.playerName} shot ${card.totalScore}${vsPar ? ` (${vsPar})` : ''} at ${card.courseName}`

  return {
    title,
    description: card.coachHeadline ?? `Round at ${card.courseName} on AI Caddie`,
    openGraph: {
      title,
      description: card.coachHeadline ?? `Score ${card.totalScore} at ${card.courseName}`,
      type: 'website',
    },
  }
}

function ShareCardView({ card }: { card: ShareCardData }) {
  const vsPar = formatScoreVsPar(card.scoreVsPar)
  const dateLabel = new Date(card.date).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserAvatar name={card.playerName} avatarUrl={card.playerAvatarUrl} size="lg" />
        <div>
          <p className="text-sm text-slate-500">Shared round</p>
          <p className="text-lg font-bold text-slate-800">{card.playerName}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
        <h1 className="text-2xl font-extrabold text-emerald-800">{card.courseName}</h1>
        <p className="text-sm text-slate-500">
          {dateLabel}
          {card.teeName && <span> · {card.teeName} tees</span>}
        </p>
        <div className="pt-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total score</p>
          <p className="text-5xl font-black text-emerald-700 leading-none mt-1">
            {card.totalScore}
            {vsPar && (
              <span className="text-2xl font-bold text-slate-500 ml-2">{vsPar}</span>
            )}
          </p>
        </div>
      </div>

      {card.sg && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Strokes gained
          </h2>
          <SgChips sg={card.sg} />
        </section>
      )}

      {card.coachHeadline && (
        <section className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-800">
            Coach headline
          </h2>
          <p className="text-sm text-emerald-900 leading-relaxed">{card.coachHeadline}</p>
        </section>
      )}

      <p className="text-xs text-slate-400 text-center">
        Full coaching chat and hole-by-hole details stay private unless shared by the player.
      </p>
    </div>
  )
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params
  const loaded = await loadShareByToken(token)
  if (!loaded) notFound()

  return (
    <main className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 min-h-11 inline-flex items-center"
          >
            AI Caddie
          </Link>
        </div>

        <ShareCardView card={loaded.card} />

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-6 text-sm font-bold text-white hover:bg-emerald-800"
          >
            Get your own AI caddie
          </Link>
        </div>
      </div>
    </main>
  )
}
