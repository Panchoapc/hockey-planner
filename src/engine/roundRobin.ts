import type { Enfrentamiento, PartidoInput } from "./types";

/**
 * Genera una rueda todos-contra-todos (single round-robin) con el metodo del
 * circulo. n equipos -> n(n-1)/2 partidos en n-1 jornadas.
 * Ej: 8 equipos -> 28 partidos en 7 jornadas de 4. Funcion pura.
 */
export function generarFixture(equipoIds: string[]): Enfrentamiento[] {
  const ids = [...equipoIds];
  if (ids.length < 2) return [];

  const bye = "__BYE__";
  if (ids.length % 2 !== 0) ids.push(bye);

  const n = ids.length;
  const jornadas = n - 1;
  const mitad = n / 2;
  const partidos: Enfrentamiento[] = [];
  let ronda = [...ids];

  for (let j = 0; j < jornadas; j++) {
    for (let i = 0; i < mitad; i++) {
      const a = ronda[i];
      const b = ronda[n - 1 - i];
      if (a !== bye && b !== bye) {
        const [localId, visitaId] = j % 2 === 0 ? [a, b] : [b, a];
        partidos.push({
          id: `${localId}__vs__${visitaId}__j${j + 1}`,
          localId,
          visitaId,
          jornada: j + 1,
        });
      }
    }
    ronda = [ronda[0], ronda[n - 1], ...ronda.slice(1, n - 1)];
  }

  return partidos;
}

/** Contexto de categoria para enriquecer un fixture crudo. */
export interface CategoriaCtx {
  id: string;
  genero: "VARONES" | "DAMAS";
  bloqueMin: number;
}

/** Fixture de una categoria, ya enriquecido con genero/bloque, listo para el
 *  solver. El id se prefija con la categoria para ser estable y unico. */
export function fixtureCategoria(
  cat: CategoriaCtx,
  equipoIds: string[],
): PartidoInput[] {
  return generarFixture(equipoIds).map((e) => ({
    id: `${cat.id}__${e.id}`,
    categoriaId: cat.id,
    genero: cat.genero,
    bloqueMin: cat.bloqueMin,
    localId: e.localId,
    visitaId: e.visitaId,
    jornada: e.jornada,
  }));
}
