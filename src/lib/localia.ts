// Preparacion de datos de localia (fuera del engine puro): mapea equipos a
// recintos y deriva que recintos admiten varones. Lo usan el seed y los tests.
import type { Genero } from "@/engine";

export interface RecintoCatalogo {
  recintos: { nombre: string; ciudad: string }[];
  clubARecinto: Record<string, string>;
}

/** Club de un equipo: quita sufijo numerico o de una sola letra.
 *  "CCC 1" -> "CCC", "PWCC A" -> "PWCC", "Vina HC" -> "Vina HC". */
export function clubDeEquipo(nombreEquipo: string): string {
  return nombreEquipo.replace(/\s+([0-9]+|[A-Z])$/, "").trim();
}

export function recintoDeEquipo(
  nombreEquipo: string,
  clubARecinto: Record<string, string>,
): string {
  const club = clubDeEquipo(nombreEquipo);
  const r = clubARecinto[club];
  if (!r)
    throw new Error(
      `Sin recinto para "${nombreEquipo}" (club "${club}"). TODO: agregar a clubARecinto.`,
    );
  return r;
}

/** admiteVarones DERIVADO: un recinto admite varones sii algun equipo adulto
 *  masculino es local ahi. */
export function recintosQueAdmitenVarones(
  equipos: { nombre: string; genero: Genero }[],
  clubARecinto: Record<string, string>,
): Set<string> {
  const set = new Set<string>();
  for (const e of equipos)
    if (e.genero === "VARONES") set.add(recintoDeEquipo(e.nombre, clubARecinto));
  return set;
}
