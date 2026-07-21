import type { Genero, RecintoInput } from "./types";

/**
 * Acceso por genero. Con localia modelada, esto se cumple POR CONSTRUCCION
 * (un equipo masculino es local en un recinto que admite varones), asi que se
 * usa como INVARIANTE / validacion, no como filtro principal (Tarea 1 2.b).
 *
 *   VARONES -> solo recintos que admiten varones.
 *   DAMAS   -> todos.
 */
export function esRecintoElegible(genero: Genero, recinto: RecintoInput): boolean {
  return genero === "DAMAS" ? true : recinto.admiteVarones;
}

export function recintosElegibles(
  genero: Genero,
  recintos: RecintoInput[],
): RecintoInput[] {
  return recintos.filter((r) => esRecintoElegible(genero, r));
}
