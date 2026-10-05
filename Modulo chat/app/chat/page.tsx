import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { backendUrl, sessionCookieName } from '@/lib/security'
import ChatClient from './chat-client'

export default async function ChatPage() {
  const token = (await cookies()).get(sessionCookieName())?.value
  if (!token) redirect('/login')
  let valido = false
  try {
    const response = await fetch(backendUrl('/auth/session'), { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', signal: AbortSignal.timeout(10_000) })
    valido = response.ok
  } catch { /* Nunca mostrar una sección privada sin poder verificar la sesión. */ }
  if (!valido) redirect('/login')
  return <ChatClient />
}
