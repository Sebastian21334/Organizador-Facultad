'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, BookOpen, LockKeyhole, Mail } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'No pudimos iniciar sesión.')
      router.push('/chat'); router.refresh()
    } catch (err) { setError(err instanceof Error ? err.message : 'Ocurrió un error.') } finally { setLoading(false) }
  }

  return <main className="login-shell"><section className="login-panel" aria-labelledby="login-title">
    <div className="brand-mark"><BookOpen aria-hidden="true" /><span>apunte</span></div>
    <div className="eyebrow">ORGANIZADOR DE FACULTAD</div>
    <h1 id="login-title">Todo lo que tenés que hacer,<br /><em>en un solo lugar.</em></h1>
    <p className="login-copy">Iniciá sesión para transformar tus mensajes en tareas claras y fechas que no se te escapan.</p>
    <form onSubmit={handleSubmit} className="login-form">
      <label htmlFor="email">Email</label><div className="input-wrap"><Mail aria-hidden="true" /><input id="email" type="email" required autoComplete="email" placeholder="vos@universidad.edu" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <label htmlFor="password">Contraseña</label><div className="input-wrap"><LockKeyhole aria-hidden="true" /><input id="password" type="password" required autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Iniciar sesión'} <ArrowRight aria-hidden="true" /></button>
    </form>
    <p className="login-footnote">Tu espacio de estudio, simple y privado.</p>
  </section></main>
}
