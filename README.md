# Entre Voces · ¿Quién usó IA?

Juego de aula sobre polarización en Colombia, estilo "impostor". Cada persona juega desde su celular.
En cada ronda, a un jugador en secreto le toca usar IA para escribir su definición; los demás escriben sin IA
y luego votan cuál creen que hizo la IA. 5 rondas, 5 palabras.

## Probar en tu computador

```bash
npm run dev
```

Abre `http://localhost:3000`. Para jugar con celulares en el mismo WiFi, usa la dirección "Red" que imprime la consola.
En local las salas viven en memoria: no hace falta Upstash ni instalar nada.

## Desplegar en Vercel

1. Sube la carpeta `entre-voces` a GitHub e impórtala en Vercel (Framework: *Other*, sin comando de build).
2. En el proyecto de Vercel: **Storage → Create / Connect → Upstash for Redis** (plan gratis) y conéctalo al proyecto.
   Eso crea las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` (también sirven `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).
3. Vuelve a desplegar. Listo.

Las salas se borran solas 3 horas después del último movimiento. No hay base de datos ni login.

> Cada celular consulta el estado cada 1,5 s. El plan gratis de Upstash alcanza para clases normales;
> si juegan muchos grupos a la vez durante horas, revisa el consumo en el panel de Upstash.

## Estructura

```
api/sala.js          Función de Vercel: recibe todas las acciones (POST /api/sala)
lib/juego.js         Reglas, fases, elección del impostor y SISTEMA DE PUNTOS (PUNTOS y puntuar())
lib/palabras.js      Las 5 palabras con su caso y pregunta para conversar
lib/store.js         Guardado temporal: Upstash en Vercel, memoria en local
dev-server.js        Servidor local (npm run dev)
public/
  index.html
  css/               base · ambiente (fondo) · personajes · animaciones
  js/main.js         Consulta el estado y cambia de pantalla
  js/api.js          Llamadas al servidor y sesión (recargar la página vuelve a la sala)
  js/personajes.js   Muñequitos SVG de los personajes
  js/animaciones.js  Animación de rol y de expulsión del impostor
  js/pantallas/      inicio · lobby · ronda (rol/escritura/votación) · resultado (revelación/podio)
```

## Fases de una ronda

`lobby` → (todos listos, mínimo 3) → `rol` (7 s de animación) → `escritura` (3 min o hasta que todos envíen)
→ `votacion` (2 min o hasta que todos voten) → `revelacion` → el anfitrión pasa a la siguiente ronda → … → `fin`.

Los tiempos están en `REGLAS` dentro de `lib/juego.js`.
