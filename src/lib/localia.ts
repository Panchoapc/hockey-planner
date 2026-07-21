// Preparacion de datos de localia (fuera del engine puro): mapea equipos a
// recintos. Recintos de club (admiteVarones) en torneo.seed.json; colegios
// femeninos (separados, uno por club) en recintos.seed.json.

export interface RecintoFem {
  id: string;
  nombre: string;
  ciudad: string;
  admiteVarones: boolean;
}
export interface MapaLocalia {
  clubARecintoId: Record<string, string>;
  recintoFemeninoPorDefecto: string;
  recintosFemeninos: RecintoFem[];
}

/** Club de un equipo: quita sufijo numerico o de una sola letra.
 *  "CCC 1" -> "CCC", "PWCC A" -> "PWCC", "Vina HC" -> "Vina HC". */
export function clubDeEquipo(nombreEquipo: string): string {
  return nombreEquipo.replace(/\s+([0-9]+|[A-Z])$/, "").trim();
}

/** Recinto (id) donde el equipo es local. Clubes sin entrada explicita caen en
 *  el recinto femenino por defecto (no deberia pasar con el mapeo actual). */
export function recintoDeEquipo(nombreEquipo: string, mapa: MapaLocalia): string {
  const club = clubDeEquipo(nombreEquipo);
  return mapa.clubARecintoId[club] ?? mapa.recintoFemeninoPorDefecto;
}
