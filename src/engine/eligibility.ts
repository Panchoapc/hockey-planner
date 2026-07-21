import type { CanchaInput, Genero } from "./types";

/**
 * REGLA DE ACCESO POR GENERO — unica fuente de verdad (antes estaba duplicada
 * como `where` de Prisma en la route y en la page).
 *
 *   VARONES -> solo canchas de club (pool CLUB).
 *   DAMAS   -> todas (club + colegio).
 *
 * Funcion pura: se testea como invariante.
 */
export function canchasElegibles(
  genero: Genero,
  canchas: CanchaInput[],
): CanchaInput[] {
  return canchas.filter((c) => esCanchaElegible(genero, c));
}

export function esCanchaElegible(genero: Genero, cancha: CanchaInput): boolean {
  return genero === "VARONES" ? cancha.pool === "CLUB" : true;
}
