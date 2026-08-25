import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const response = await fetch('http://localhost:3000/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.access_token) return NextResponse.json({ message: data.message || 'Credenciales inválidas.' }, { status: response.status || 401 })
    const result = NextResponse.json({ ok: true })
    result.cookies.set('session_token', data.access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 })
    return result
  } catch { return NextResponse.json({ message: 'No se pudo conectar con el servidor.' }, { status: 502 }) }
}
