import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  ChatRequestError,
  closeSession,
  historyMessages,
  mergeHistory,
  parseHistory,
  requestJson,
} from "./chat.ts";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("el historial reciente primero pasa a cronología sin mutar la página", () => {
  const items = [
    { id: "nuevo", textoOriginal: "Hoy" },
    { id: "viejo", textoOriginal: "Ayer" },
  ];
  assert.deepEqual(
    historyMessages(items).map((item) => item.id),
    ["viejo-u", "viejo-a", "nuevo-u", "nuevo-a"],
  );
  assert.equal(items[0].id, "nuevo");
});
test("cargar anteriores conserva mensajes nuevos y evita duplicados de páginas solapadas", () => {
  const current = historyMessages([{ id: "nuevo", textoOriginal: "Hoy" }]);
  const older = historyMessages([
    { id: "nuevo", textoOriginal: "Hoy" },
    { id: "viejo", textoOriginal: "Ayer" },
  ]);
  assert.deepEqual(
    mergeHistory(current, older).map((item) => item.id),
    ["viejo-u", "viejo-a", "nuevo-u", "nuevo-a"],
  );
});
test("un historial con forma inválida se convierte en error recuperable", () => {
  assert.throws(() => parseHistory({ message: "error" }), /historial/);
  assert.throws(() => parseHistory([{ id: 2 }]), /mensaje inválido/);
  assert.throws(
    () =>
      parseHistory([
        { id: "1", textoOriginal: "Hola", resultadoIA: { aclaracion: {} } },
      ]),
    /mensaje inválido/,
  );
  assert.throws(
    () =>
      parseHistory([
        { id: "1", textoOriginal: "Hola", tareaGenerada: { titulo: [] } },
      ]),
    /mensaje inválido/,
  );
});
test("un mensaje pendiente de backend tiene explicación visible", () => {
  const messages = historyMessages([
    { id: "a", textoOriginal: "Parcial", procesado: false },
  ]);
  assert.match(messages[1].text, /no llegó a procesarse/);
});
test("logout fallido rechaza en vez de anunciar sesión cerrada", async () => {
  globalThis.fetch = async () =>
    Response.json({ message: "Servidor no disponible" }, { status: 502 });
  await assert.rejects(
    closeSession(),
    (error) => error instanceof ChatRequestError && error.status === 502,
  );
});
test("logout exitoso usa POST y espera la respuesta", async () => {
  let called = false;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/auth/logout");
    assert.equal(options.method, "POST");
    called = true;
    return Response.json({ ok: true });
  };
  await closeSession();
  assert.equal(called, true);
});
test("401 y errores de validación conservan código y texto accionable", async () => {
  globalThis.fetch = async () =>
    Response.json(
      { message: ["Sesión vencida", "Iniciá sesión"] },
      { status: 401 },
    );
  await assert.rejects(
    requestJson("/api/mensajes"),
    (error) =>
      error.status === 401 && error.message === "Sesión vencida Iniciá sesión",
  );
});
test("un error sin JSON no filtra HTML del proveedor", async () => {
  globalThis.fetch = async () =>
    new Response("<h1>Error interno</h1>", { status: 500 });
  await assert.rejects(requestJson("/api/mensajes"), /No se pudo completar/);
});
