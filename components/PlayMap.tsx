'use client'

import dynamic from 'next/dynamic'
import type { PlayMapProps } from '@/components/PlayMapInner'

const PlayMapInner = dynamic(() => import('@/components/PlayMapInner'), {
  ssr: false,
  loading: () => (
    <div
      className="h-[40dvh] shrink-0 w-full animate-pulse border-b border-slate-200 bg-slate-100"
      aria-hidden
    />
  ),
})

export default function PlayMap(props: PlayMapProps) {
  return <PlayMapInner {...props} />
}
