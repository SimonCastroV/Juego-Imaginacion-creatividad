// Conexión con el servidor y sesión guardada (para volver a la sala si se recarga la página).
const CLAVE = 'entre-voces-sesion';
let enMemoria = null;

export const sesion = {
  get() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) ?? enMemoria; } catch { return enMemoria; }
  },
  set(valor) {
    enMemoria = valor;
    try { localStorage.setItem(CLAVE, JSON.stringify(valor)); } catch {}
  },
  borrar() {
    enMemoria = null;
    try { localStorage.removeItem(CLAVE); } catch {}
  },
};

export async function llamar(accion, datos = {}) {
  const { codigo, secreto } = sesion.get() ?? {};
  let respuesta;
  try {
    respuesta = await fetch('/api/sala', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion, codigo, secreto, ...datos }),
    });
  } catch {
    throw Object.assign(new Error('Sin conexión. Reintentando…'), { estado: 0 });
  }
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw Object.assign(new Error(cuerpo.error ?? 'Algo salió mal.'), { estado: respuesta.status });
  return cuerpo;
}
