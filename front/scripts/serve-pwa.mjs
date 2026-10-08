// Servidor estático de prueba: sirve el build y reenvía /api al backend local.
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist/organizador-facultad/browser');
const api = new URL(process.env.PWA_API_URL || 'http://localhost:3000');
const port = Number(process.env.PWA_PORT || 8080);
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

await stat(resolve(root, 'ngsw.json')).catch(() => {
  throw new Error('Primero ejecutá npm run build para generar la PWA de producción.');
});

createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    const target = new URL(api);
    target.pathname = api.pathname.replace(/\/$/, '') + url.pathname.slice(4);
    target.search = url.search;
    const upstream = (api.protocol === 'https:' ? httpsRequest : httpRequest)(
      target,
      {
        method: req.method,
        headers: { ...req.headers, host: api.host },
        timeout: 75_000,
      },
      (response) => {
        res.writeHead(response.statusCode || 502, response.headers);
        response.pipe(res);
      },
    );
    upstream.on('timeout', () => upstream.destroy());
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({ message: 'Backend no disponible. Iniciá back/ o configurá PWA_API_URL.' }),
      );
    });
    req.pipe(upstream);
    return;
  }
  try {
    const file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    let content;
    let type = types[extname(file)] || 'application/octet-stream';
    try {
      content = await readFile(file);
    } catch {
      if (extname(file)) {
        res.writeHead(404);
        res.end();
        return;
      }
      content = await readFile(resolve(root, 'index.html'));
      type = 'text/html';
    }
    res.writeHead(200, { 'Content-Type': type });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(400);
    res.end();
  }
}).listen(port, '127.0.0.1', () =>
  console.log(`PWA: http://localhost:${port} · API: ${api.origin}`),
);
