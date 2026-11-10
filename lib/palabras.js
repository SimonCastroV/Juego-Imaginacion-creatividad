// Las 5 palabras de la partida, una por ronda: [palabra, contexto, pregunta para conversar al final].
export const CASOS = [
  ['Confianza', 'En un chat familiar circula un audio anónimo sobre un supuesto cierre de vías. Unos lo reenvían porque viene de un familiar. Otros piden confirmar de dónde salió.', '¿Cómo confirmarías el origen del audio antes de reenviarlo?'],
  ['Protesta', 'Dos cuentas comparten el mismo video recortado de una marcha en una ciudad colombiana. Cada una le atribuye una intención distinta a quienes marchan.', '¿Qué buscarías para saber qué pasó antes y después del fragmento?'],
  ['Seguridad', 'En un barrio se comparte una imagen que supuestamente muestra un robo reciente. La conversación pasa del incidente a acusar a toda una comunidad.', '¿Qué evidencia permitiría evaluar el incidente y qué parte de la conversación es una generalización?'],
  ['Justicia', 'Un mensaje viral acusa a una persona de desviar recursos de un municipio. Algunas personas la defienden por afinidad política y otras dan por hecha su culpabilidad.', '¿Qué fuentes consultarías antes de emitir un juicio?'],
  ['Reconciliación', 'En un municipio colombiano se propone un encuentro entre vecinos que discrepan sobre cómo recordar el conflicto armado. Una publicación atribuye la misma intención a todas las personas de cada grupo.', '¿Qué pregunta abriría una conversación que permita escuchar experiencias diferentes?'],
].map(([palabra, contexto, pregunta]) => ({ palabra, contexto, pregunta }));
