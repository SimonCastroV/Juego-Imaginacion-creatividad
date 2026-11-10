// Servidor local para probar sin Vercel ni Upstash: guarda las salas en memoria.
// Uso: npm run dev  → abre la URL de red en los celulares conectados al mismo WiFi.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { manejar } from './lib/juego.js';

const PUERTO = Number(process.env.PORT) || 3000;
const RAIZ = fileURLToPath(new URL('./public/', import.meta.url));
const TIPOS = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  if (ruta === '/api/sala') {
    if (req.method !== 'POST') return enviar(res, 405, { error: 'Usa POST.' });
    let cuerpo = '';
    for await (const trozo of req) cuerpo += trozo;
    let datos = {};
    try { datos = JSON.parse(cuerpo || '{}'); } catch {}
    const r = await manejar(datos);
    return enviar(res, r.estado, r.datos);
  }
  const archivo = normalize(join(RAIZ, ruta === '/' ? 'index.html' : ruta));
  if (!archivo.startsWith(RAIZ)) return enviar(res, 403, { error: 'Prohibido' });
  try {
    const contenido = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': `${TIPOS[extname(archivo)] ?? 'application/octet-stream'}; charset=utf-8` });
    res.end(contenido);
  } catch {
    enviar(res, 404, { error: 'No encontrado' });
  }
}).listen(PUERTO, '0.0.0.0', () => {
  console.log(`\n  Entre Voces corriendo (salas en memoria)\n  Local:  http://localhost:${PUERTO}`);
  for (const red of Object.values(networkInterfaces()).flat()) {
    if (red?.family === 'IPv4' && !red.internal) console.log(`  Red:    http://${red.address}:${PUERTO}`);
  }
  console.log('');
});

function enviar(res, estado, datos) {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(datos));
}
