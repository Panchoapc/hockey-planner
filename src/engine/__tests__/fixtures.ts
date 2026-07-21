import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fixtureCategoria, generarSlots } from "../index";
import type { PreAsignado, RecintoInput, SolverInput } from "../types";
import {
  recintoDeEquipo,
  recintosQueAdmitenVarones,
} from "../../lib/localia";

// Construye un SolverInput realista (3 categorias adulto, DOBLE rueda) desde el
// seed + el catalogo de recintos, sin DB.

interface SeedCat {
  id: string;
  genero: string;
  formato: string;
  equipos: string[];
}
interface Seed {
  formatosPartido: Record<string, { bloqueMin: number }>;
  categorias: SeedCat[];
}
interface Catalogo {
  recintos: { nombre: string; ciudad: string }[];
  clubARecinto: Record<string, string>;
}

const CATS = ["varones-primera-a", "varones-primera-b", "damas-primera-a"];

function leer<T>(rel: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), rel), "utf-8"));
}

export function construirRecintos(): RecintoInput[] {
  const cat = leer<Catalogo>("seed/recintos.seed.json");
  const seed = leer<Seed>("seed/torneo.seed.json");
  const equipos = CATS.flatMap((slug) => {
    const c = seed.categorias.find((x) => x.id === slug)!;
    return c.equipos.map((nombre) => ({
      nombre,
      genero: c.genero.toUpperCase() as "VARONES" | "DAMAS",
    }));
  });
  const admiten = recintosQueAdmitenVarones(equipos, cat.clubARecinto);
  return cat.recintos.map((r) => ({
    id: r.nombre,
    nombre: r.nombre,
    ciudad: r.ciudad,
    admiteVarones: admiten.has(r.nombre),
  }));
}

export interface OpcionesInput {
  arbitros?: number;
  bloqueos?: { dia: string; hora: string }[];
  preAsignados?: PreAsignado[];
}

export function construirInput(opts: OpcionesInput = {}): SolverInput {
  const seed = leer<Seed>("seed/torneo.seed.json");
  const cat = leer<Catalogo>("seed/recintos.seed.json");
  const bloqueMin = seed.formatosPartido.adulto.bloqueMin;

  const partidos = CATS.flatMap((slug) => {
    const c = seed.categorias.find((x) => x.id === slug)!;
    const genero = c.genero.toUpperCase() as "VARONES" | "DAMAS";
    const equipoIds = c.equipos.map((e) => `${c.id}::${e}`);
    const recintoPorEquipo: Record<string, string> = {};
    for (const e of c.equipos)
      recintoPorEquipo[`${c.id}::${e}`] = recintoDeEquipo(e, cat.clubARecinto);
    return fixtureCategoria(
      { id: c.id, genero, bloqueMin, rueda: "DOBLE" },
      equipoIds,
      recintoPorEquipo,
    );
  });

  const nArb = opts.arbitros ?? 30; // TODO(2.b): pool alto para que sature el RECINTO, no el arbitro. Arbitros regionales delgados sin modelar.
  return {
    partidos,
    recintos: construirRecintos(),
    slots: generarSlots(bloqueMin, ["sabado", "domingo"], "08:30", "19:00"),
    arbitros: Array.from({ length: nArb }, (_, i) => `arb-${i + 1}`),
    bloqueos: opts.bloqueos ?? [],
    preAsignados: opts.preAsignados ?? [],
  };
}
