import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'apunte — organizador de facultad', description: 'Convertí tus mensajes en tareas claras y fechas que no se te escapan.', generator: 'v0.app' }
export const viewport: Viewport = { themeColor: '#ede4d3', userScalable: false }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
