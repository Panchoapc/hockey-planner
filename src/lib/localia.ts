// Preparacion de datos de localia (fuera del engine puro): mapea equipos a
// recintos. Los recintos (con admiteVarones explicito) viven en
// torneo.seed.json. Lo usan el seed y los tests.

export interface MapaLocalia {
  clubARecintoId: Record<string, string>;
  recintoFemeninoPorDefecto: string;
}

/** Club de un equipo: quita sufijo numerico o de una sola letra.
 *  "CCC 1" -> "CCC", "PWCC A" -> "PWCC", "Vina HC" -> "Vina HC". */
export function clubDeEquipo(nombreEquipo: string): string {
  return nombreEquipo.replace(/\s+([0-9]+|[A-Z])$/, "").trim();
}

/** Recinto (id) donde el equipo es local. Los clubes sin entrada explicita
 *  (colegios femeninos) caen en el recinto femenino por defecto. */
export function recintoDeEquipo(nombreEquipo: string, mapa: MapaLocalia): string {
  const club = clubDeEquipo(nombreEquipo);
  return mapa.clubARecintoId[club] ?? mapa.recintoFemeninoPorDefecto;
}
