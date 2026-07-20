import type { PartidoInput } from "./types";

/**
 * Genera una rueda todos-contra-todos (single round-robin) con el metodo del
 * circulo. Para n equipos produce n(n-1)/2 partidos en n-1 (o n) jornadas.
 * Ej: 8 equipos -> 28 partidos en 7 jornadas de 4 partidos.
 *
 * Funcion pura: mismos ids de entrada -> mismo fixture.
 */
export function generarFixture(equipoIds: string[]): PartidoInput[] {
  const ids = [...equipoIds];
  if (ids.length < 2) return [];

  // Con numero impar de equipos se agrega un "bye" (null): quien juega
  // contra el bye descansa esa jornada.
  const bye = "__BYE__";
  if (ids.length % 2 !== 0) ids.push(bye);

  const n = ids.length;
  const jornadas = n - 1;
  const mitad = n / 2;
  const partidos: PartidoInput[] = [];

  // Array rotatorio: el primer elemento queda fijo, el resto rota.
  let ronda = [...ids];

  for (let j = 0; j < jornadas; j++) {
    for (let i = 0; i < mitad; i++) {
      const a = ronda[i];
      const b = ronda[n - 1 - i];
      if (a !== bye && b !== bye) {
        // Alterna localia por jornada para repartir local/visita.
        const [localId, visitaId] = j % 2 === 0 ? [a, b] : [b, a];
        partidos.push({
          id: `${localId}__vs__${visitaId}__j${j + 1}`,
          localId,
          visitaId,
          jornada: j + 1,
        });
      }
    }
    // Rotacion: fija el primero, rota el resto en el sentido del reloj.
    ronda = [ronda[0], ronda[n - 1], ...ronda.slice(1, n - 1)];
  }

  return partidos;
}
