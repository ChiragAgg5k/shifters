import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shifters Racing Simulator',
  description: 'Real-time Competitive Mobility Systems Visualization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="dark">
        {children}
      </body>
    </html>
  )
}
