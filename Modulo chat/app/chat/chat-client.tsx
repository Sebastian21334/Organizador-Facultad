'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { BookOpen, CalendarDays, Check, LogOut, Send, Sparkles, ClipboardList, LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Result = { titulo: string; descripcion?: string | null; materia?: string | null; fecha?: string | null; tipo: string; aclaracion?: string | null }
type Task = { id: string; titulo: string; descripcion?: string; tipo: string; fechaLimite?: string; materia?: { nombre: string } }
type Message = { id: string; text: string; role: 'user' | 'ai'; result?: Result | null; task?: Task | null; pending?: boolean }

const typeLabels: Record<string, string> = { tarea: 'Tarea', examen: 'Examen', entrega: 'Entrega', tp: 'Trabajo práctico', otro: 'Pendiente' }
function formatDate(value?: string | null) {
  if (!value) return null
  const date = value.length <= 10 ? new Date(`${value}T12:00:00`) : new Date(value)
  if (isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' }).format(date).replace('.', '')
}
function fromIncoming(item: any): Message[] { return [{ id: `${item.id}-u`, text: item.textoOriginal, role: 'user' }, { id: `${item.id}-a`, text: item.resultadoIA?.aclaracion || '', role: 'ai', result: item.resultadoIA, task: item.tareaGenerada }] }

export default function ChatClient() {
  const router = useRouter(); const [messages, setMessages] = useState<Message[]>([]); const [text, setText] = useState(''); const [loading, setLoading] = useState(true); const [sending, setSending] = useState(false); const [error, setError] = useState(''); const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { fetch('/api/mensajes').then(async r => { if (r.status === 401) return router.replace('/login'); const data = await r.json(); if (!r.ok) throw new Error(data.message); setMessages(data.flatMap(fromIncoming)) }).catch(e => setError(e.message || 'No se pudo cargar el historial.')).finally(() => setLoading(false)) }, [router])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])
  async function send(event?: FormEvent) { event?.preventDefault(); const value = text.trim(); if (!value || sending) return; setText(''); setError(''); const id = `now-${Date.now()}`; setMessages(m => [...m, { id, text: value, role: 'user' }, { id: `${id}-pending`, text: '', role: 'ai', pending: true }]); setSending(true); try { const r = await fetch('/api/mensajes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: value, fuente: 'chat_app' }) }); const data = await r.json(); if (!r.ok) throw new Error(data.message); setMessages(m => [...m.filter(x => x.id !== `${id}-pending`), ...fromIncoming(data).filter(x => x.role === 'ai')]) } catch (e) { setMessages(m => m.filter(x => x.id !== `${id}-pending`)); setError(e instanceof Error ? e.message : 'No se pudo enviar.') } finally { setSending(false) } }
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); router.replace('/login') }
  return <main className="chat-shell"><header className="chat-header"><div className="brand-mark small"><BookOpen aria-hidden="true" /><span>apunte</span></div><div className="header-actions"><span className="online-dot">● conectado</span><button className="icon-button" onClick={logout} aria-label="Cerrar sesión"><LogOut aria-hidden="true" /></button></div></header><section className="conversation" aria-label="Conversación con apunte">{loading ? <div className="empty-state"><LoaderCircle className="spin" aria-hidden="true" /><p>Cargando tus apuntes…</p></div> : messages.length === 0 ? <div className="empty-state"><Sparkles aria-hidden="true" /><h1>¿Qué tenés para hoy?</h1><p>Escribime algo como “el parcial de Sistemas es el viernes” y lo convierto en una tarea.</p></div> : messages.map(m => <div className={`message-row ${m.role}`} key={m.id}><div className="avatar">{m.role === 'ai' ? <Sparkles aria-hidden="true" /> : 'VOS'}</div><div className="message-content">{m.role === 'user' ? <div className="bubble user-bubble">{m.text}</div> : m.pending ? <div className="bubble ai-bubble typing"><span /><span /><span /></div> : m.task ? <div className="task-card"><div className="task-card-title"><Check aria-hidden="true" /><span>Tarea creada</span></div><h2>{m.task.titulo}</h2><div className="task-meta">{m.task.materia?.nombre && <span><BookOpen aria-hidden="true" />{m.task.materia.nombre}</span>}{m.task.fechaLimite && <span><CalendarDays aria-hidden="true" />Vence {formatDate(m.task.fechaLimite)}</span>}<span><ClipboardList aria-hidden="true" />{typeLabels[m.task.tipo] || m.task.tipo}</span></div></div> : <div className="bubble ai-bubble">{m.text || 'No pude interpretar ese mensaje.'}</div>}</div></div>)}<div ref={endRef} /></section><form className="composer" onSubmit={send}><div className="composer-inner"><input aria-label="Escribí un mensaje" value={text} onChange={e => setText(e.target.value)} placeholder="Escribí una tarea, fecha o recordatorio…" /><button className="send-button" type="submit" disabled={!text.trim() || sending} aria-label="Enviar mensaje"><Send aria-hidden="true" /></button></div>{error && <p className="chat-error" role="alert">{error}</p>}</form></main>
}
