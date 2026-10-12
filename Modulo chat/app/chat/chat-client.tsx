"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  LogOut,
  Send,
  Sparkles,
  ClipboardList,
  LoaderCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ChatRequestError,
  closeSession,
  formatDate,
  fromIncoming,
  historyMessages,
  MAX_MESSAGE_LENGTH,
  mergeHistory,
  PAGE_SIZE,
  parseHistory,
  parseIncoming,
  requestJson,
  type Message,
} from "@/lib/chat";

const typeLabels: Record<string, string> = {
  tarea: "Tarea",
  examen: "Examen",
  entrega: "Entrega",
  tp: "Trabajo práctico",
  otro: "Pendiente",
};
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Ocurrió un error. Intentá de nuevo.";

export default function ChatClient() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const offset = useRef(0);
  const draftRevision = useRef(0);
  const sendingRequest = useRef(false);
  const loggingOutRequest = useRef(false);
  const conversationRef = useRef<HTMLElement>(null);
  const scroll = useRef<
    | { mode: "bottom"; instant?: boolean }
    | { mode: "preserve"; height: number; top: number }
    | null
  >(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setHistoryError("");
    requestJson(`/api/mensajes?limit=${PAGE_SIZE}&offset=0`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        const items = parseHistory(data);
        offset.current = items.length;
        setHasOlder(items.length === PAGE_SIZE);
        scroll.current = { mode: "bottom", instant: true };
        setMessages(historyMessages(items));
        setLoaded(true);
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        if (cause instanceof ChatRequestError && cause.status === 401)
          router.replace("/login");
        else setHistoryError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [router, reload]);

  useEffect(() => {
    const container = conversationRef.current;
    const pending = scroll.current;
    if (!container || !pending) return;
    scroll.current = null;
    if (pending.mode === "preserve")
      container.scrollTop =
        pending.top + container.scrollHeight - pending.height;
    else {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: reducedMotion || pending.instant ? "instant" : "smooth",
      });
    }
  }, [messages]);

  async function loadOlder() {
    if (loadingOlder || sending || !hasOlder) return;
    setLoadingOlder(true);
    setHistoryError("");
    try {
      const data = await requestJson(
        `/api/mensajes?limit=${PAGE_SIZE}&offset=${offset.current}`,
      );
      const items = parseHistory(data);
      const container = conversationRef.current;
      if (container)
        scroll.current = {
          mode: "preserve",
          height: container.scrollHeight,
          top: container.scrollTop,
        };
      setMessages((current) => mergeHistory(current, historyMessages(items)));
      offset.current += items.length;
      setHasOlder(items.length === PAGE_SIZE);
    } catch (cause) {
      if (cause instanceof ChatRequestError && cause.status === 401)
        router.replace("/login");
      else setHistoryError(errorMessage(cause));
    } finally {
      setLoadingOlder(false);
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = text.trim();
    if (
      !value ||
      value.length > MAX_MESSAGE_LENGTH ||
      sendingRequest.current ||
      !loaded ||
      loadingOlder
    )
      return;
    sendingRequest.current = true;
    const revision = draftRevision.current;
    const id = `draft-${crypto.randomUUID()}`;
    setText("");
    setError("");
    setSending(true);
    scroll.current = { mode: "bottom" };
    setMessages((current) => [
      ...current,
      { id, text: value, role: "user" },
      { id: `${id}-pending`, text: "", role: "ai", pending: true },
    ]);
    try {
      const data = await requestJson("/api/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: value, fuente: "chat_app" }),
      });
      const incoming = parseIncoming(data);
      scroll.current = { mode: "bottom" };
      setMessages((current) => [
        ...current.filter(
          (message) => message.id !== id && message.id !== `${id}-pending`,
        ),
        ...fromIncoming(incoming),
      ]);
      offset.current += 1;
    } catch (cause) {
      setMessages((current) =>
        current
          .filter((message) => message.id !== `${id}-pending`)
          .map((message) =>
            message.id === id ? { ...message, failed: true } : message,
          ),
      );
      if (draftRevision.current === revision) setText(value);
      if (cause instanceof ChatRequestError && cause.status === 401) {
        setError(
          "Tu sesión venció. Iniciá sesión para continuar. Conservá el texto antes de salir.",
        );
      } else
        setError(
          `${errorMessage(cause)} El mensaje quedó disponible para copiar o editar.`,
        );
    } finally {
      sendingRequest.current = false;
      setSending(false);
    }
  }

  async function logout() {
    if (loggingOutRequest.current) return;
    loggingOutRequest.current = true;
    setLoggingOut(true);
    setError("");
    try {
      await closeSession();
      router.replace("/login");
      router.refresh();
    } catch (cause) {
      setError(`${errorMessage(cause)} La sesión sigue abierta.`);
    } finally {
      loggingOutRequest.current = false;
      setLoggingOut(false);
    }
  }

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <div className="brand-mark small">
          <BookOpen aria-hidden="true" />
          <span>apunte</span>
        </div>
        <div className="header-actions">
          <span className="online-dot">Asistente de estudio</span>
          <button
            className="icon-button"
            onClick={logout}
            disabled={loggingOut || sending}
            aria-label={loggingOut ? "Cerrando sesión" : "Cerrar sesión"}
            title="Cerrar sesión"
          >
            {loggingOut ? (
              <LoaderCircle className="spin" aria-hidden="true" />
            ) : (
              <LogOut aria-hidden="true" />
            )}
          </button>
        </div>
      </header>
      <h1 className="sr-only">Tus mensajes de estudio</h1>
      <section
        ref={conversationRef}
        className="conversation"
        aria-label="Conversación con apunte"
        tabIndex={0}
      >
        {loading ? (
          <div className="empty-state" role="status">
            <LoaderCircle className="spin" aria-hidden="true" />
            <p>Cargando tus apuntes…</p>
          </div>
        ) : (
          <>
            {historyError && (
              <div className="history-feedback">
                <p className="chat-error" role="alert">
                  {historyError}
                </p>
                <button
                  className="text-button"
                  onClick={() =>
                    loaded ? void loadOlder() : setReload((value) => value + 1)
                  }
                >
                  Reintentar carga
                </button>
              </div>
            )}
            {loaded && hasOlder && (
              <div className="history-feedback">
                <button
                  className="text-button"
                  onClick={loadOlder}
                  disabled={loadingOlder || sending}
                >
                  {loadingOlder ? "Cargando…" : "Cargar mensajes anteriores"}
                </button>
              </div>
            )}
            {loaded && messages.length === 0 && (
              <div className="empty-state">
                <Sparkles aria-hidden="true" />
                <h2>¿Qué tenés para hoy?</h2>
                <p>
                  Escribime algo como “el parcial de Sistemas es el viernes” y
                  lo convierto en una tarea.
                </p>
              </div>
            )}
            <div
              role="log"
              aria-label="Mensajes"
              aria-live="polite"
              aria-relevant="additions"
            >
              {messages.map((message) => (
                <div className={`message-row ${message.role}`} key={message.id}>
                  <div className="avatar" aria-hidden="true">
                    {message.role === "ai" ? <Sparkles /> : "VOS"}
                  </div>
                  <div className="message-content">
                    <span className="sr-only">
                      {message.role === "user" ? "Vos: " : "Apunte: "}
                    </span>
                    {message.role === "user" ? (
                      <>
                        <div className="bubble user-bubble">{message.text}</div>
                        {message.failed && (
                          <p className="message-note">
                            Envío no confirmado. El texto se conserva en esta
                            conversación.
                          </p>
                        )}
                      </>
                    ) : message.pending ? (
                      <div className="bubble ai-bubble typing">
                        <span aria-hidden="true" />
                        <span aria-hidden="true" />
                        <span aria-hidden="true" />
                        <span className="sr-only">Procesando tu mensaje…</span>
                      </div>
                    ) : message.task ? (
                      <div className="task-card">
                        <div className="task-card-title">
                          <Check aria-hidden="true" />
                          <span>Tarea creada</span>
                        </div>
                        <h2>{message.task.titulo}</h2>
                        <div className="task-meta">
                          {message.task.materia?.nombre && (
                            <span>
                              <BookOpen aria-hidden="true" />
                              {message.task.materia.nombre}
                            </span>
                          )}
                          {message.task.fechaLimite && (
                            <span>
                              <CalendarDays aria-hidden="true" />
                              Vence {formatDate(message.task.fechaLimite)}
                            </span>
                          )}
                          <span>
                            <ClipboardList aria-hidden="true" />
                            {typeLabels[message.task.tipo] || message.task.tipo}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bubble ai-bubble">
                        {message.text ||
                          "No pude interpretar ese mensaje. Podés enviarme más detalles."}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <form className="composer" onSubmit={send} aria-busy={sending}>
        <label className="sr-only" htmlFor="chat-message">
          Escribí un mensaje
        </label>
        <div className="composer-inner">
          <input
            id="chat-message"
            value={text}
            maxLength={MAX_MESSAGE_LENGTH}
            aria-describedby="message-help"
            disabled={!loaded || loggingOut}
            onChange={(event) => {
              draftRevision.current += 1;
              setText(event.target.value);
            }}
            placeholder="Escribí una tarea, fecha o recordatorio…"
          />
          <button
            className="send-button"
            type="submit"
            disabled={
              !text.trim() || sending || !loaded || loadingOlder || loggingOut
            }
            aria-label={sending ? "Enviando mensaje" : "Enviar mensaje"}
          >
            <Send aria-hidden="true" />
          </button>
        </div>
        <p id="message-help" className="composer-help">
          {sending
            ? "Interpretando tu mensaje…"
            : `${text.length}/${MAX_MESSAGE_LENGTH} caracteres`}
        </p>
        {error && (
          <p className="chat-error" role="alert">
            {error}
          </p>
        )}
        {error.startsWith("Tu sesión venció") && (
          <a className="text-button" href="/login">
            Volver a iniciar sesión
          </a>
        )}
      </form>
    </main>
  );
}
