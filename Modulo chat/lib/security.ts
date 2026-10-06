import { NextResponse } from 'next/server'

export const sessionCookieName = () => process.env.NODE_ENV === 'production' ? '__Host-tempo_chat' : 'tempo_chat'
export const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 86400 * 7 })

export function backendUrl(path: string): string {
  const base = new URL(process.env.BACKEND_URL || 'http://localhost:3000')
  if (base.username || base.password || !['http:', 'https:'].includes(base.protocol) ||
    (process.env.NODE_ENV === 'production' && base.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(base.hostname))) {
    throw new Error('BACKEND_URL debe ser una URL segura del backend')
  }
  return new URL(path, base.origin).toString()
}

export function checkOrigin(request: Request): NextResponse | null {
  const configured = process.env.APP_ORIGIN
  if (process.env.NODE_ENV === 'production' && !configured) return NextResponse.json({ message: 'Falta configurar el origen público de la app.' }, { status: 503 })
  let expected: string
  try {
    const url = new URL(configured || 'http://localhost:3001')
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new Error('Origen inseguro')
    expected = url.origin
  } catch { return NextResponse.json({ message: 'El origen público de la app no está configurado correctamente.' }, { status: 503 }) }
  if (request.headers.get('origin') !== expected) return NextResponse.json({ message: 'Origen no permitido.' }, { status: 403 })
  return null
}

export async function readJson(request: Request): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new Error('JSON requerido')
  const reader = request.body?.getReader()
  if (!reader) throw new Error('Falta contenido')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 24_000) { await reader.cancel(); throw new Error('Contenido demasiado grande') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const data = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength }
  return JSON.parse(new TextDecoder().decode(data))
}
