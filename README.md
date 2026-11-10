# Entre Voces · El impostor

Juego de aula sobre polarización en Colombia para 3 a 12 personas. Cada jugador entra desde su
celular. En cada ronda, el grupo recibe un caso de la política colombiana y el impostor recibe una
pista general. Por turnos, todos dicen una pista en voz alta y luego votan en secreto por otro jugador.

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

Las salas se guardan temporalmente en Redis y caducan tres horas después de la última escritura.
Las partidas de la versión de definiciones requieren un código nuevo.

> Cada celular consulta el estado cada 1,5 s. El plan gratis de Upstash alcanza para clases normales;
> si juegan muchos grupos a la vez durante horas, revisa el consumo en el panel de Upstash.

## Estructura

```
api/sala.js          Función de Vercel: recibe todas las acciones (POST /api/sala)
lib/juego.js         Reglas, fases, orden de turnos, elección del impostor y puntuación
lib/casos.js         Las cinco tarjetas, pistas privadas, fuentes y preguntas para conversar
lib/store.js         Guardado temporal: Upstash en Vercel, memoria en local
dev-server.js        Servidor local (npm run dev)
public/
  index.html
  css/               base · ambiente (fondo) · personajes · animaciones
  js/main.js         Consulta el estado y cambia de pantalla
  js/api.js          Llamadas al servidor y sesión (recargar la página vuelve a la sala)
  js/personajes.js   Muñequitos SVG de los personajes
  js/animaciones.js  Animación de rol y de expulsión del impostor
  js/pantallas/      inicio · lobby · ronda (rol, pistas, votación e intento) · resultado
```

## Fases de una ronda

`lobby` → `rol` → `pistas` (20 s por jugador) → `votacion` (45 s o hasta que todos voten).
Si más de la mitad de los jugadores vota por el impostor, tiene 25 segundos para identificar
el caso entre cuatro opciones. Las abstenciones cuentan para calcular el umbral. Si falta mayoría,
la ronda termina sin expulsión y el rol queda en secreto. En ambos casos se muestra el recuento,
la fuente y la pregunta de cierre. El anfitrión pasa a la siguiente ronda o al podio final.

Cada voto acertado suma 2 puntos. El impostor gana 3 si escapa con al menos un voto emitido,
o 2 si lo descubren y acierta el caso. Los puntos de las rondas sin expulsión se muestran al final
de la partida para guardar el secreto del rol.

Los tiempos están en `REGLAS` dentro de `lib/juego.js`.
