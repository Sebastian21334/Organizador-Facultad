import { NextRequest, NextResponse } from 'next/server'
import { backendUrl, checkOrigin, readJson, sessionCookieName } from '@/lib/security'

async function proxy(request: NextRequest, method: 'GET' | 'POST') {
  if (method === 'POST') { const blocked = checkOrigin(request); if (blocked) return blocked }
  const token = request.cookies.get(sessionCookieName())?.value
  if (!token) return NextResponse.json({ message: 'Sesión requerida.' }, { status: 401 })
  let body: unknown
  if (method === 'POST') {
    try { body = await readJson(request) } catch { return NextResponse.json({ message: 'El contenido es inválido o demasiado grande.' }, { status: 400 }) }
  }
  try {
    const url = new URL(backendUrl('/mensajes'))
    if (method === 'GET') {
      url.searchParams.set('limit', request.nextUrl.searchParams.get('limit') || '100')
      url.searchParams.set('offset', request.nextUrl.searchParams.get('offset') || '0')
    }
    const response = await fetch(url, { method, headers: { Authorization: 'Bearer ' + token, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) }, body: method === 'POST' ? JSON.stringify(body) : undefined, cache: 'no-store', signal: AbortSignal.timeout(40_000) })
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch { return NextResponse.json({ message: 'No se pudo conectar con el servidor.' }, { status: 502 }) }
}
export async function GET(request: NextRequest) { return proxy(request, 'GET') }
export async function POST(request: NextRequest) { return proxy(request, 'POST') }
