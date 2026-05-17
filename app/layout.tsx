import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MyCloud',
  description: 'Espace cloud minimal noir et blanc',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased bg-black text-white">{children}</body>
    </html>
  )
}
