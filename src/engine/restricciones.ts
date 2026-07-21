import { esRecintoElegible } from "./eligibility";
import type { Asignacion, PartidoInput, RecintoInput, Slot } from "./types";

// Primitivas de restricciones DURAS, compartidas por el solver y el motor de
// alternativas. Estado de ocupacion de UN fin de semana (los slots ya vienen
// filtrados de bloqueos).

export const slotKey = (fecha: string, hora: string) => `${fecha}|${hora}`;
export const cellKey = (recintoId: string, fecha: string, hora: string) =>
  `${recintoId}|${fecha}|${hora}`;
export const teamKey = (eq: string, fecha: string, hora: string) =>
  `${eq}|${fecha}|${hora}`;

export interface Estado {
  recintoOcupado: Set<string>;
  equipoOcupado: Set<string>;
  arbitrosPorSlot: Map<string, Set<string>>;
}

export function crearEstado(): Estado {
  return {
    recintoOcupado: new Set(),
    equipoOcupado: new Set(),
    arbitrosPorSlot: new Map(),
  };
}

export function ocupar(estado: Estado, a: Asignacion, p: PartidoInput) {
  estado.recintoOcupado.add(cellKey(a.recintoId, a.fecha, a.hora));
  estado.equipoOcupado.add(teamKey(p.localId, a.fecha, a.hora));
  estado.equipoOcupado.add(teamKey(p.visitaId, a.fecha, a.hora));
  const sk = slotKey(a.fecha, a.hora);
  const set = estado.arbitrosPorSlot.get(sk) ?? new Set<string>();
  for (const arb of a.arbitros) set.add(arb);
  estado.arbitrosPorSlot.set(sk, set);
}

export function liberar(estado: Estado, a: Asignacion, p: PartidoInput) {
  estado.recintoOcupado.delete(cellKey(a.recintoId, a.fecha, a.hora));
  estado.equipoOcupado.delete(teamKey(p.localId, a.fecha, a.hora));
  estado.equipoOcupado.delete(teamKey(p.visitaId, a.fecha, a.hora));
  const set = estado.arbitrosPorSlot.get(slotKey(a.fecha, a.hora));
  if (set) for (const arb of a.arbitros) set.delete(arb);
}

export function arbitrosLibres(
  estado: Estado,
  fecha: string,
  hora: string,
  pool: string[],
  n = 2,
): string[] | null {
  const usados = estado.arbitrosPorSlot.get(slotKey(fecha, hora)) ?? new Set();
  const libres: string[] = [];
  for (const arb of pool) {
    if (!usados.has(arb)) libres.push(arb);
    if (libres.length === n) return libres;
  }
  return null;
}

/** Recintos candidatos de un partido: {local, visita}, local primero. */
export function candidatos(
  p: PartidoInput,
  recintoPorId: Map<string, RecintoInput>,
): RecintoInput[] {
  const ids =
    p.recintoLocalId === p.recintoVisitaId
      ? [p.recintoLocalId]
      : [p.recintoLocalId, p.recintoVisitaId];
  const out: RecintoInput[] = [];
  for (const id of ids) {
    const r = recintoPorId.get(id);
    if (r && esRecintoElegible(p.genero, r)) out.push(r);
  }
  return out;
}

/** Duras de colocar p en (recinto, slot), sin contar arbitros. */
export function celdaFactible(
  estado: Estado,
  p: PartidoInput,
  recintoId: string,
  s: Slot,
): boolean {
  if (estado.recintoOcupado.has(cellKey(recintoId, s.fecha, s.hora))) return false;
  if (estado.equipoOcupado.has(teamKey(p.localId, s.fecha, s.hora))) return false;
  if (estado.equipoOcupado.has(teamKey(p.visitaId, s.fecha, s.hora))) return false;
  return true;
}
