export const PAGE_SIZE = 50;
export const MAX_MESSAGE_LENGTH = 4000;

export type Task = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  tipo: string;
  fechaLimite?: string | null;
  materia?: { nombre: string } | null;
};
export type Incoming = {
  id: string;
  textoOriginal: string;
  procesado?: boolean;
  resultadoIA?: { aclaracion?: string | null } | null;
  tareaGenerada?: Task | null;
};
export type Message = {
  id: string;
  text: string;
  role: "user" | "ai";
  task?: Task | null;
  pending?: boolean;
  failed?: boolean;
};

export class ChatRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ChatRequestError";
    this.status = status;
  }
}

export async function requestJson(
  url: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? data.message
        : null;
    const detail =
      typeof message === "string"
        ? message
        : Array.isArray(message) &&
            message.every((item) => typeof item === "string")
          ? message.join(" ")
          : "No se pudo completar la solicitud. Intentá de nuevo.";
    throw new ChatRequestError(detail, response.status);
  }
  return data;
}

export function parseIncoming(value: unknown): Incoming {
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !("textoOriginal" in value) ||
    typeof value.textoOriginal !== "string"
  ) {
    throw new Error(
      "El servidor devolvió un mensaje inválido. Intentá cargar de nuevo.",
    );
  }
  const item = value as Record<string, unknown>;
  const record = (input: unknown): input is Record<string, unknown> =>
    input !== null && typeof input === "object" && !Array.isArray(input);
  const nullableText = (input: unknown) =>
    input == null || typeof input === "string";
  const result = item.resultadoIA;
  const task = item.tareaGenerada;
  if (
    (result != null && (!record(result) || !nullableText(result.aclaracion))) ||
    (task != null &&
      (!record(task) ||
        typeof task.id !== "string" ||
        typeof task.titulo !== "string" ||
        typeof task.tipo !== "string" ||
        !nullableText(task.fechaLimite) ||
        (task.materia != null &&
          (!record(task.materia) || typeof task.materia.nombre !== "string"))))
  ) {
    throw new Error(
      "El servidor devolvió un mensaje inválido. Intentá cargar de nuevo.",
    );
  }
  return value as Incoming;
}

export function parseHistory(value: unknown): Incoming[] {
  if (!Array.isArray(value))
    throw new Error("No se pudo leer el historial. Intentá cargar de nuevo.");
  return value.map(parseIncoming);
}

export function fromIncoming(item: Incoming): Message[] {
  return [
    { id: `${item.id}-u`, text: item.textoOriginal, role: "user" },
    {
      id: `${item.id}-a`,
      text:
        item.resultadoIA?.aclaracion ||
        (item.procesado === false
          ? "Este mensaje no llegó a procesarse. Podés volver a enviarlo."
          : ""),
      role: "ai",
      task: item.tareaGenerada,
    },
  ];
}

/** La API pagina de más reciente a más antiguo; la conversación se lee al revés. */
export function historyMessages(items: Incoming[]): Message[] {
  return [...items].reverse().flatMap(fromIncoming);
}

export function mergeHistory(current: Message[], older: Message[]): Message[] {
  const currentIds = new Set(current.map((message) => message.id));
  return [
    ...older.filter((message) => !currentIds.has(message.id)),
    ...current,
  ];
}

export function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date =
    value.length <= 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" })
    .format(date)
    .replace(".", "");
}

export async function closeSession(): Promise<void> {
  await requestJson("/api/auth/logout", { method: "POST" });
}
