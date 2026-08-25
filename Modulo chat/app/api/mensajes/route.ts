import { NextRequest, NextResponse } from 'next/server'

async function proxy(request: NextRequest, method: 'GET' | 'POST') {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ message: 'Sesión requerida.' }, { status: 401 })
  try {
    const response = await fetch('http://localhost:3000/mensajes', { method, headers: { Authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) }, body: method === 'POST' ? JSON.stringify(await request.json()) : undefined, cache: 'no-store' })
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch { return NextResponse.json({ message: 'No se pudo conectar con el servidor.' }, { status: 502 }) }
}
export async function GET(request: NextRequest) { return proxy(request, 'GET') }
export async function POST(request: NextRequest) { return proxy(request, 'POST') }
