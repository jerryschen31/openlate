import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Openlate - Find Late-Night Spots Near You',
  description: 'Discover restaurants, bars, cafes, and essential services open late at night. Your hyper-focused late-night spot finder.',
  generator: 'v0.app',
  icons: {
    icon: '/icon.svg?v=2',
    shortcut: '/icon.svg?v=2',
    apple: '/icon.svg?v=2',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        {children}
        <Toaster position="bottom-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
