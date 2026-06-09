import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClerkProvider, UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import PwaProvider from '@/components/PwaProvider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'AI Caddie',
    template: '%s · AI Caddie',
  },
  description:
    'Log golf rounds hole-by-hole, get AI coaching feedback, and track GIR, fairways, and putting trends.',
  applicationName: 'AI Caddie',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AI Caddie',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#047857',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3 flex justify-between items-center safe-top">
            <a href="/" className="font-bold text-lg text-emerald-800 tracking-tight min-h-11 flex items-center">
              ⛳ AI Caddie
            </a>
            <SignedIn>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <SignInButton />
            </SignedOut>
          </header>

          {children}
          <PwaProvider />
        </body>
      </html>
    </ClerkProvider>
  )
}
