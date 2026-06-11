import { formatScoreVsPar } from '@/lib/social/share-card'
import { loadShareByToken } from '@/lib/social/load-share'
import { ImageResponse } from 'next/og'

export const alt = 'AI Caddie round share'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = {
  params: Promise<{ token: string }>
}

function sgColor(val: number): string {
  return val >= 0 ? '#047857' : '#b91c1c'
}

function formatSg(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`
}

export default async function Image({ params }: Props) {
  const { token } = await params
  const loaded = await loadShareByToken(token)

  if (!loaded) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fafc',
            fontSize: 48,
            color: '#64748b',
          }}
        >
          Share not found
        </div>
      ),
      { ...size }
    )
  }

  const { card } = loaded
  const vsPar = formatScoreVsPar(card.scoreVsPar)
  const dateLabel = new Date(card.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #ecfdf5 0%, #f8fafc 50%, #ffffff 100%)',
          padding: 56,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: '#047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            ⛳
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#047857' }}>AI Caddie</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <p style={{ fontSize: 24, color: '#64748b', margin: 0 }}>{card.playerName}</p>
          <h1
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: '#065f46',
              margin: '8px 0 4px',
              lineHeight: 1.1,
            }}
          >
            {card.courseName}
          </h1>
          <p style={{ fontSize: 22, color: '#94a3b8', margin: 0 }}>{dateLabel}</p>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 32 }}>
            <span style={{ fontSize: 96, fontWeight: 900, color: '#047857', lineHeight: 1 }}>
              {card.totalScore}
            </span>
            {vsPar && (
              <span style={{ fontSize: 40, fontWeight: 700, color: '#64748b' }}>{vsPar}</span>
            )}
          </div>

          {card.sg && (
            <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
              {(
                [
                  ['OTT', card.sg.ott],
                  ['APP', card.sg.app],
                  ['ARG', card.sg.arg],
                  ['PUTT', card.sg.putt],
                ] as const
              ).map(([label, val]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    padding: '10px 18px',
                    borderRadius: 999,
                    background: 'white',
                    border: '2px solid #e2e8f0',
                    fontSize: 22,
                    fontWeight: 700,
                    color: sgColor(val),
                  }}
                >
                  {label} {formatSg(val)}
                </div>
              ))}
            </div>
          )}

          {card.coachHeadline && (
            <p
              style={{
                fontSize: 26,
                color: '#334155',
                marginTop: 28,
                lineHeight: 1.4,
                maxWidth: 1000,
              }}
            >
              &ldquo;{card.coachHeadline.length > 140
                ? `${card.coachHeadline.slice(0, 137)}…`
                : card.coachHeadline}&rdquo;
            </p>
          )}
        </div>
      </div>
    ),
    { ...size }
  )
}
