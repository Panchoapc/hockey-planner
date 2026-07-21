import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fixtureCategoria, generarSlots } from "../index";
import type { CanchaInput, SolverInput, PreAsignado } from "../types";

// Construye un SolverInput realista (3 categorias adulto) desde el seed, sin DB.

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

const CATS = ["varones-primera-a", "varones-primera-b", "damas-primera-a"];

export function cargarSeed(): Seed {
  return JSON.parse(
    readFileSync(join(process.cwd(), "seed", "torneo.seed.json"), "utf-8"),
  );
}

export function construirCanchas(): CanchaInput[] {
  const canchas: CanchaInput[] = [];
  for (let i = 1; i <= 7; i++)
    canchas.push({ id: `club-${i}`, nombre: `Club ${i}`, pool: "CLUB" });
  for (let i = 1; i <= 7; i++)
    canchas.push({ id: `colegio-${i}`, nombre: `Colegio ${i}`, pool: "COLEGIO" });
  return canchas;
}

export interface OpcionesInput {
  arbitros?: number;
  bloqueos?: { dia: string; hora: string }[];
  preAsignados?: PreAsignado[];
}

export function construirInput(opts: OpcionesInput = {}): SolverInput {
  const seed = cargarSeed();
  const bloqueMin = seed.formatosPartido.adulto.bloqueMin;
  const partidos = CATS.flatMap((slug) => {
    const cat = seed.categorias.find((c) => c.id === slug)!;
    const equipoIds = cat.equipos.map((e) => `${cat.id}::${e}`);
    return fixtureCategoria(
      { id: cat.id, genero: cat.genero.toUpperCase() as "VARONES" | "DAMAS", bloqueMin },
      equipoIds,
    );
  });

  const nArb = opts.arbitros ?? 18;
  const arbitros = Array.from({ length: nArb }, (_, i) => `arb-${i + 1}`);
  const slots = generarSlots(bloqueMin, ["sabado", "domingo"], "08:00", "19:00");

  return {
    partidos,
    canchas: construirCanchas(),
    slots,
    arbitros,
    bloqueos: opts.bloqueos ?? [],
    preAsignados: opts.preAsignados ?? [],
  };
}
