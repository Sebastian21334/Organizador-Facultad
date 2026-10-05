import { NextRequest, NextResponse } from 'next/server'
import { sessionCookieName } from './lib/security'

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/chat') && !request.cookies.has(sessionCookieName())) return NextResponse.redirect(new URL('/login', request.url))
  const nonce = btoa(crypto.randomUUID())
  const dev = process.env.NODE_ENV !== 'production'
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'nonce-" + nonce + "' 'strict-dynamic'" + (dev ? " 'unsafe-eval'" : ''),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:", "connect-src 'self'" + (dev ? ' ws: http://localhost:3001' : ''),
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  headers.set('Content-Security-Policy', csp)
  const result = NextResponse.next({ request: { headers } })
  result.headers.set('Content-Security-Policy', csp)
  return result
}
export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] }
