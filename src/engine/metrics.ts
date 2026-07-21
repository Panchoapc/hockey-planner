import { esRecintoElegible } from "./eligibility";
import { contarHuecos, esIndeseable } from "./scoring";
import type { PartidoInput, ScheduleResult, SolverInput } from "./types";

// Metricas comparables entre motores (naive vs solver). Las DURAS deben dar 0
// en el solver; el naive las viola a proposito -> ese contraste es la demo.

export interface Metricas {
  total: number;
  asignados: number;
  sinAsignar: number;
  duras: {
    choquesRecinto: number;
    choquesEquipo: number;
    choquesArbitro: number;
    partidosSinDosArbitros: number;
    violacionGenero: number;
    recintoAjeno: number; // recinto que no es del local ni de la visita
    enSlotBloqueado: number;
    fueraDeGrilla: number;
  };
  violacionesDurasTotal: number;
  blandas: {
    pctHorasLindas: number;
    equidadSpread: number;
    cesiones: number; // partidos jugados en el recinto de la visita
    huecos: number;
  };
}

function contarDuplicados(claves: string[]): number {
  const vistas = new Set<string>();
  let dups = 0;
  for (const k of claves) {
    if (vistas.has(k)) dups++;
    else vistas.add(k);
  }
  return dups;
}

export function calcularMetricas(
  result: ScheduleResult,
  input: SolverInput,
): Metricas {
  const partidoPorId = new Map<string, PartidoInput>(
    input.partidos.map((p) => [p.id, p]),
  );
  const recintoPorId = new Map(input.recintos.map((r) => [r.id, r]));
  const bloqueados = new Set(input.bloqueos.map((b) => `${b.dia}|${b.hora}`));
  const grilla = new Set(input.slots.map((s) => `${s.dia}|${s.hora}`));
  const a = result.asignaciones;

  const choquesRecinto = contarDuplicados(
    a.map((x) => `${x.recintoId}|${x.dia}|${x.hora}`),
  );

  const equipoClaves: string[] = [];
  for (const x of a) {
    const p = partidoPorId.get(x.partidoId);
    if (!p) continue;
    equipoClaves.push(`${p.localId}|${x.dia}|${x.hora}`);
    equipoClaves.push(`${p.visitaId}|${x.dia}|${x.hora}`);
  }
  const choquesEquipo = contarDuplicados(equipoClaves);

  const arbClaves: string[] = [];
  let partidosSinDosArbitros = 0;
  for (const x of a) {
    if (x.arbitros.length !== 2) partidosSinDosArbitros++;
    for (const arb of x.arbitros) arbClaves.push(`${arb}|${x.dia}|${x.hora}`);
  }
  const choquesArbitro = contarDuplicados(arbClaves);

  let violacionGenero = 0;
  let recintoAjeno = 0;
  let cesiones = 0;
  let enSlotBloqueado = 0;
  let fueraDeGrilla = 0;
  for (const x of a) {
    const p = partidoPorId.get(x.partidoId);
    const r = recintoPorId.get(x.recintoId);
    if (p && r && !esRecintoElegible(p.genero, r)) violacionGenero++;
    if (p && x.recintoId !== p.recintoLocalId && x.recintoId !== p.recintoVisitaId)
      recintoAjeno++;
    if (p && x.recintoId === p.recintoVisitaId && x.recintoId !== p.recintoLocalId)
      cesiones++;
    if (bloqueados.has(`${x.dia}|${x.hora}`)) enSlotBloqueado++;
    if (!grilla.has(`${x.dia}|${x.hora}`)) fueraDeGrilla++;
  }

  const duras = {
    choquesRecinto,
    choquesEquipo,
    choquesArbitro,
    partidosSinDosArbitros,
    violacionGenero,
    recintoAjeno,
    enSlotBloqueado,
    fueraDeGrilla,
  };
  const violacionesDurasTotal = Object.values(duras).reduce((s, n) => s + n, 0);

  const lindas = a.filter((x) => !esIndeseable(x.hora)).length;
  const pctHorasLindas = a.length ? Math.round((lindas / a.length) * 100) : 0;

  const indeseablesPorEquipo = new Map<string, number>();
  for (const p of input.partidos) {
    indeseablesPorEquipo.set(p.localId, 0);
    indeseablesPorEquipo.set(p.visitaId, 0);
  }
  for (const x of a) {
    if (!esIndeseable(x.hora)) continue;
    const p = partidoPorId.get(x.partidoId);
    if (!p) continue;
    for (const eq of [p.localId, p.visitaId])
      indeseablesPorEquipo.set(eq, (indeseablesPorEquipo.get(eq) ?? 0) + 1);
  }
  const conteos = [...indeseablesPorEquipo.values()];
  const equidadSpread = conteos.length
    ? Math.max(...conteos) - Math.min(...conteos)
    : 0;

  return {
    total: input.partidos.length,
    asignados: a.length,
    sinAsignar: result.sinAsignar.length,
    duras,
    violacionesDurasTotal,
    blandas: { pctHorasLindas, equidadSpread, cesiones, huecos: contarHuecos(a) },
  };
}
