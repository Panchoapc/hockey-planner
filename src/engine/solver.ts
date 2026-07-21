import { esSabado, slotsDeFinde } from "./calendario";
import { esIndeseable, horaDesirabilidad, puntajeTotal } from "./scoring";
import {
  arbitrosLibres,
  candidatos,
  celdaFactible,
  crearEstado,
  liberar,
  ocupar,
  cellKey,
  teamKey,
  type Estado,
} from "./restricciones";
import type {
  Asignacion,
  PartidoInput,
  PreAsignado,
  RazonInfactible,
  RecintoInput,
  ScheduleResult,
  SinAsignar,
  Slot,
  SolverInput,
} from "./types";

// SOLVER de temporada (Dia 3). El CALENDARIO asigna cada jornada a un fin de
// semana; el solver resuelve DENTRO de cada finde (greedy + busqueda local).
// El problema se parte en subproblemas chicos e independientes por finde.

/** Resuelve UN fin de semana: coloca sus partidos en (recinto, slot, arbitros). */
export function resolverFinde(
  partidos: PartidoInput[],
  recintos: RecintoInput[],
  slots: Slot[],
  arbitros: string[],
  preAsignados: PreAsignado[],
): ScheduleResult {
  const estado = crearEstado();
  const partidoPorId = new Map(partidos.map((p) => [p.id, p]));
  const recintoPorId = new Map(recintos.map((r) => [r.id, r]));
  const asignaciones: Asignacion[] = [];
  const sinAsignar: SinAsignar[] = [];
  const fijos = new Set<string>();

  const indeseablesPorEquipo = new Map<string, number>();
  const recintoDiaUsado = new Set<string>();
  const inc = (eq: string) =>
    indeseablesPorEquipo.set(eq, (indeseablesPorEquipo.get(eq) ?? 0) + 1);
  const registrar = (a: Asignacion, p: PartidoInput) => {
    ocupar(estado, a, p);
    asignaciones.push(a);
    recintoDiaUsado.add(`${a.recintoId}|${a.fecha}`);
    if (esIndeseable(a.hora)) {
      inc(p.localId);
      inc(p.visitaId);
    }
  };

  // Pre-asignados de este finde.
  for (const pa of preAsignados) {
    const p = partidoPorId.get(pa.partidoId);
    if (!p) continue;
    const refs = arbitrosLibres(estado, pa.fecha, pa.hora, arbitros, 2);
    registrar(
      {
        partidoId: pa.partidoId,
        recintoId: pa.recintoId,
        fecha: pa.fecha,
        hora: pa.hora,
        arbitros: refs ?? arbitros.slice(0, 2),
      },
      p,
    );
    fijos.add(pa.partidoId);
  }

  const pendientes = partidos
    .filter((p) => !fijos.has(p.id))
    .map((p) => ({ p, cands: candidatos(p, recintoPorId) }))
    .sort(
      (x, y) =>
        x.cands.length - y.cands.length ||
        x.p.categoriaId.localeCompare(y.p.categoriaId) ||
        x.p.id.localeCompare(y.p.id),
    );

  for (const { p, cands } of pendientes) {
    if (cands.length === 0) {
      sinAsignar.push({
        partidoId: p.id,
        razon: "recinto-no-admite-genero",
        detalle: `${p.genero} sin recinto candidato valido`,
      });
      continue;
    }
    let mejor: { a: Asignacion; score: number } | null = null;
    for (const r of cands) {
      for (const s of slots) {
        if (!celdaFactible(estado, p, r.id, s)) continue;
        const refs = arbitrosLibres(estado, s.fecha, s.hora, arbitros, 2);
        if (!refs) continue;
        let score = horaDesirabilidad(s.hora) * 100;
        if (r.id !== p.recintoLocalId) score -= 100000;
        if (esSabado(s.fecha)) score += 5;
        if (esIndeseable(s.hora)) {
          score -=
            20 *
            ((indeseablesPorEquipo.get(p.localId) ?? 0) +
              (indeseablesPorEquipo.get(p.visitaId) ?? 0));
        }
        if (recintoDiaUsado.has(`${r.id}|${s.fecha}`)) score += 2;
        if (!mejor || score > mejor.score) {
          mejor = {
            a: {
              partidoId: p.id,
              recintoId: r.id,
              fecha: s.fecha,
              hora: s.hora,
              arbitros: refs,
            },
            score,
          };
        }
      }
    }
    if (mejor) registrar(mejor.a, p);
    else
      sinAsignar.push({
        partidoId: p.id,
        ...diagnosticar(estado, p, slots, arbitros, cands),
      });
  }

  busquedaLocal(asignaciones, estado, slots, arbitros, partidoPorId, recintoPorId, fijos);
  return { asignaciones, sinAsignar };
}

function diagnosticar(
  estado: Estado,
  p: PartidoInput,
  slots: Slot[],
  arbitros: string[],
  cands: RecintoInput[],
): { razon: RazonInfactible; detalle: string } {
  const nombres = cands.map((r) => r.nombre).join(" / ");
  const libresEquipo = slots.filter(
    (s) =>
      !estado.equipoOcupado.has(teamKey(p.localId, s.fecha, s.hora)) &&
      !estado.equipoOcupado.has(teamKey(p.visitaId, s.fecha, s.hora)),
  );
  if (libresEquipo.length === 0)
    return { razon: "equipo-ocupado", detalle: "el equipo ya juega en cada slot libre" };
  const conRecinto = libresEquipo.filter((s) =>
    cands.some((r) => !estado.recintoOcupado.has(cellKey(r.id, s.fecha, s.hora))),
  );
  if (conRecinto.length === 0)
    return { razon: "recinto-saturado", detalle: `recinto(s) ${nombres} sin cupo` };
  const hayArb = conRecinto.some((s) =>
    arbitrosLibres(estado, s.fecha, s.hora, arbitros, 2),
  );
  if (!hayArb) return { razon: "sin-arbitros", detalle: "no quedan 2 arbitros libres" };
  return { razon: "recinto-saturado", detalle: `recinto(s) ${nombres} sin cupo` };
}

function busquedaLocal(
  asignaciones: Asignacion[],
  estado: Estado,
  slots: Slot[],
  arbitros: string[],
  partidoPorId: Map<string, PartidoInput>,
  recintoPorId: Map<string, RecintoInput>,
  fijos: Set<string>,
) {
  const MAX_PASADAS = 3;
  let mejorGlobal = puntajeTotal(asignaciones, partidoPorId);
  for (let pasada = 0; pasada < MAX_PASADAS; pasada++) {
    let mejoro = false;
    for (const a of asignaciones) {
      if (fijos.has(a.partidoId)) continue;
      const p = partidoPorId.get(a.partidoId);
      if (!p) continue;
      const original: Asignacion = { ...a, arbitros: [...a.arbitros] };
      liberar(estado, a, p);
      let bestScore = -Infinity;
      let best: Asignacion = original;
      for (const r of candidatos(p, recintoPorId)) {
        for (const s of slots) {
          if (!celdaFactible(estado, p, r.id, s)) continue;
          const refs = arbitrosLibres(estado, s.fecha, s.hora, arbitros, 2);
          if (!refs) continue;
          a.recintoId = r.id;
          a.fecha = s.fecha;
          a.hora = s.hora;
          a.arbitros = refs;
          const sc = puntajeTotal(asignaciones, partidoPorId);
          if (sc > bestScore) {
            bestScore = sc;
            best = { ...a, arbitros: [...refs] };
          }
        }
      }
      a.recintoId = best.recintoId;
      a.fecha = best.fecha;
      a.hora = best.hora;
      a.arbitros = best.arbitros;
      ocupar(estado, a, p);
      if (bestScore > mejorGlobal + 1e-9) {
        mejorGlobal = bestScore;
        mejoro = true;
      }
    }
    if (!mejoro) break;
  }
}

export interface StatFinde {
  indice: number;
  sabado: string;
  domingo: string;
  partidos: number;
  asignados: number;
  ms: number;
  cargaPorRecinto: Record<string, number>;
}

/** Solver de temporada con estadisticas por fin de semana (para el reporte). */
export function solveDetallado(input: SolverInput): {
  result: ScheduleResult;
  findes: StatFinde[];
} {
  const porJornada = new Map<number, PartidoInput[]>();
  for (const p of input.partidos) {
    const arr = porJornada.get(p.jornada) ?? [];
    arr.push(p);
    porJornada.set(p.jornada, arr);
  }
  const findePorIndice = new Map(input.finesDeSemana.map((f) => [f.indice, f]));

  const asignaciones: Asignacion[] = [];
  const sinAsignar: SinAsignar[] = [];
  const findes: StatFinde[] = [];

  for (const [jornada, partidos] of [...porJornada.entries()].sort((a, b) => a[0] - b[0])) {
    const finde = findePorIndice.get(jornada);
    if (!finde) {
      for (const p of partidos)
        sinAsignar.push({
          partidoId: p.id,
          razon: "capacidad-agotada",
          detalle: `no hay fin de semana para la jornada ${jornada}`,
        });
      continue;
    }
    const slots = slotsDeFinde(finde, input.horas, input.bloqueos);
    const pre = input.preAsignados.filter(
      (pa) => pa.fecha === finde.sabado || pa.fecha === finde.domingo,
    );
    const t0 = Date.now();
    const r = resolverFinde(partidos, input.recintos, slots, input.arbitros, pre);
    const ms = Date.now() - t0;

    const carga: Record<string, number> = {};
    for (const a of r.asignaciones) carga[a.recintoId] = (carga[a.recintoId] ?? 0) + 1;
    findes.push({
      indice: finde.indice,
      sabado: finde.sabado,
      domingo: finde.domingo,
      partidos: partidos.length,
      asignados: r.asignaciones.length,
      ms,
      cargaPorRecinto: carga,
    });
    asignaciones.push(...r.asignaciones);
    sinAsignar.push(...r.sinAsignar);
  }

  return { result: { asignaciones, sinAsignar }, findes };
}

/** Solver de temporada (interfaz estandar). */
export function solve(input: SolverInput): ScheduleResult {
  return solveDetallado(input).result;
}
