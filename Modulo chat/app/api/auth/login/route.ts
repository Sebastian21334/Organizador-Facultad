import { NextResponse } from 'next/server'
import { backendUrl, checkOrigin, cookieOptions, readJson, sessionCookieName } from '@/lib/security'

export async function POST(request: Request) {
  const blocked = checkOrigin(request)
  if (blocked) return blocked
  let body: unknown
  try { body = await readJson(request) } catch { return NextResponse.json({ message: 'El contenido es inválido o demasiado grande.' }, { status: 400 }) }
  try {
    const response = await fetch(backendUrl('/auth/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(15_000) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || typeof data.access_token !== 'string') return NextResponse.json({ message: data.message || 'Credenciales inválidas.' }, { status: response.ok ? 502 : response.status })
    const result = NextResponse.json({ ok: true })
    result.cookies.set(sessionCookieName(), data.access_token, cookieOptions())
    return result
  } catch { return NextResponse.json({ message: 'No se pudo conectar con el servidor.' }, { status: 502 }) }
}
