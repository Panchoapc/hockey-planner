import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fixtureCategoria, generarFinesDeSemana, generarHoras } from "../index";
import type { PreAsignado, RecintoInput, Rueda, Slot, SolverInput } from "../types";
import { recintoDeEquipo, type MapaLocalia } from "../../lib/localia";

// SolverInput realista a ESCALA (3 adulto + bloque A de damas) + calendario,
// sin DB. Fuente autoritativa de recintos: torneo.seed.json.

interface SeedCat { id: string; genero: string; formato: string; equipos: string[] }
interface Seed {
  formatosPartido: Record<string, { bloqueMin: number }>;
  categorias: SeedCat[];
  recintos: { id: string; nombre: string; ciudad: string; admiteVarones: boolean }[];
}

// Rueda oficial: Primera Varones A/B = DOBLE; Damas Primera + bloque A = UNICA.
const DOBLE = new Set(["varones-primera-a", "varones-primera-b"]);
export const CATS_DEMO = [
  "varones-primera-a",
  "varones-primera-b",
  "damas-primera-a",
  "damas-sub19-a",
  "damas-sub16-a",
  "damas-sub14-a",
  "damas-sub12-ab",
];
const INICIO = "2026-08-01";

function leer<T>(rel: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), rel), "utf-8"));
}

export function ruedaDe(slug: string): Rueda {
  return DOBLE.has(slug) ? "DOBLE" : "UNICA";
}

export function construirRecintos(): RecintoInput[] {
  const seed = leer<Seed>("seed/torneo.seed.json");
  const mapa = leer<MapaLocalia>("seed/recintos.seed.json");
  const club = seed.recintos
    .filter((r) => r.admiteVarones)
    .map((r) => ({ id: r.id, nombre: r.nombre, ciudad: r.ciudad, admiteVarones: r.admiteVarones }));
  const fem = mapa.recintosFemeninos.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    ciudad: r.ciudad,
    admiteVarones: r.admiteVarones,
  }));
  return [...club, ...fem];
}

export interface OpcionesInput {
  arbitros?: number;
  bloqueos?: Slot[];
  preAsignados?: PreAsignado[];
  categorias?: string[];
}

export function construirInput(opts: OpcionesInput = {}): SolverInput {
  const seed = leer<Seed>("seed/torneo.seed.json");
  const mapa = leer<MapaLocalia>("seed/recintos.seed.json");
  const cats = opts.categorias ?? CATS_DEMO;

  const partidos = cats.flatMap((slug) => {
    const c = seed.categorias.find((x) => x.id === slug)!;
    const genero = c.genero.toUpperCase() as "VARONES" | "DAMAS";
    const bloqueMin = seed.formatosPartido[c.formato].bloqueMin;
    const equipoIds = c.equipos.map((e) => `${c.id}::${e}`);
    const recintoPorEquipo: Record<string, string> = {};
    for (const e of c.equipos) recintoPorEquipo[`${c.id}::${e}`] = recintoDeEquipo(e, mapa);
    return fixtureCategoria(
      { id: c.id, genero, bloqueMin, rueda: ruedaDe(slug) },
      equipoIds,
      recintoPorEquipo,
    );
  });

  const nArb = opts.arbitros ?? 20;
  return {
    partidos,
    recintos: construirRecintos(),
    finesDeSemana: generarFinesDeSemana(INICIO, 22, []),
    horas: generarHoras(90, "08:30", "19:00"),
    arbitros: Array.from({ length: nArb }, (_, i) => `arb-${i + 1}`),
    bloqueos: opts.bloqueos ?? [],
    preAsignados: opts.preAsignados ?? [],
  };
}
