import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/chat') && !request.cookies.has('session_token')) return NextResponse.redirect(new URL('/login', request.url))
  return NextResponse.next()
}
export const config = { matcher: ['/chat/:path*'] }
