import { NextRequest, NextResponse } from 'next/server'
import { backendUrl, checkOrigin, cookieOptions, sessionCookieName } from '@/lib/security'

export async function POST(request: NextRequest) {
  const blocked = checkOrigin(request)
  if (blocked) return blocked
  const token = request.cookies.get(sessionCookieName())?.value
  if (token) {
    try {
      const upstream = await fetch(backendUrl('/auth/logout'), { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store', signal: AbortSignal.timeout(15_000) })
      if (!upstream.ok && upstream.status !== 401) return NextResponse.json({ message: 'No se pudo cerrar la sesión. Intentá de nuevo.' }, { status: upstream.status })
    } catch { return NextResponse.json({ message: 'No se pudo cerrar la sesión en el servidor.' }, { status: 502 }) }
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set(sessionCookieName(), '', { ...cookieOptions(), maxAge: 0 })
  return response
}
