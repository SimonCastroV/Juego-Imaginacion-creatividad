// Función de Vercel: todos los pedidos del juego llegan aquí como POST /api/sala { accion, codigo, secreto, ... }.
import { manejar } from '../lib/juego.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST.' });
  const { estado, datos } = await manejar(req.body);
  res.setHeader('Cache-Control', 'no-store');
  res.status(estado).json(datos);
}
