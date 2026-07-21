import { esRecintoElegible } from "./eligibility";
import { esIndeseable, horaDesirabilidad, puntajeTotal } from "./scoring";
import type {
  Asignacion,
  PartidoInput,
  RazonInfactible,
  RecintoInput,
  ScheduleResult,
  SinAsignar,
  Slot,
  SolverInput,
} from "./types";

// SOLVER real (Dia 2): greedy (most-constrained-first) + busqueda local.
// El recurso escaso es la capacidad de fin de semana de cada RECINTO. Cada
// partido solo puede ir al recinto del local (default) o al de la visita
// (cesion, penalizada). Duras al 100%; blandas por puntaje.

const slotKey = (dia: string, hora: string) => `${dia}|${hora}`;
const cellKey = (recintoId: string, dia: string, hora: string) =>
  `${recintoId}|${dia}|${hora}`;
const teamKey = (eq: string, dia: string, hora: string) =>
  `${eq}|${dia}|${hora}`;

interface Estado {
  recintoOcupado: Set<string>;
  equipoOcupado: Set<string>;
  arbitrosPorSlot: Map<string, Set<string>>;
  bloqueados: Set<string>;
}

function crearEstado(input: SolverInput): Estado {
  return {
    recintoOcupado: new Set(),
    equipoOcupado: new Set(),
    arbitrosPorSlot: new Map(),
    bloqueados: new Set(input.bloqueos.map((b) => slotKey(b.dia, b.hora))),
  };
}

function ocupar(estado: Estado, a: Asignacion, p: PartidoInput) {
  estado.recintoOcupado.add(cellKey(a.recintoId, a.dia, a.hora));
  estado.equipoOcupado.add(teamKey(p.localId, a.dia, a.hora));
  estado.equipoOcupado.add(teamKey(p.visitaId, a.dia, a.hora));
  const sk = slotKey(a.dia, a.hora);
  const set = estado.arbitrosPorSlot.get(sk) ?? new Set<string>();
  for (const arb of a.arbitros) set.add(arb);
  estado.arbitrosPorSlot.set(sk, set);
}

function liberar(estado: Estado, a: Asignacion, p: PartidoInput) {
  estado.recintoOcupado.delete(cellKey(a.recintoId, a.dia, a.hora));
  estado.equipoOcupado.delete(teamKey(p.localId, a.dia, a.hora));
  estado.equipoOcupado.delete(teamKey(p.visitaId, a.dia, a.hora));
  const set = estado.arbitrosPorSlot.get(slotKey(a.dia, a.hora));
  if (set) for (const arb of a.arbitros) set.delete(arb);
}

function arbitrosLibres(
  estado: Estado,
  dia: string,
  hora: string,
  pool: string[],
  n = 2,
): string[] | null {
  const usados = estado.arbitrosPorSlot.get(slotKey(dia, hora)) ?? new Set();
  const libres: string[] = [];
  for (const arb of pool) {
    if (!usados.has(arb)) libres.push(arb);
    if (libres.length === n) return libres;
  }
  return null;
}

/** Recintos candidatos de un partido: {local, visita}, local primero. Filtra
 *  por elegibilidad de genero (invariante; por construccion siempre pasa). */
function candidatos(
  p: PartidoInput,
  recintoPorId: Map<string, RecintoInput>,
): RecintoInput[] {
  const ids = p.recintoLocalId === p.recintoVisitaId
    ? [p.recintoLocalId]
    : [p.recintoLocalId, p.recintoVisitaId];
  const out: RecintoInput[] = [];
  for (const id of ids) {
    const r = recintoPorId.get(id);
    if (r && esRecintoElegible(p.genero, r)) out.push(r);
  }
  return out;
}

function celdaFactibleSinArbitros(
  estado: Estado,
  p: PartidoInput,
  recintoId: string,
  s: Slot,
): boolean {
  if (estado.bloqueados.has(slotKey(s.dia, s.hora))) return false;
  if (estado.recintoOcupado.has(cellKey(recintoId, s.dia, s.hora))) return false;
  if (estado.equipoOcupado.has(teamKey(p.localId, s.dia, s.hora))) return false;
  if (estado.equipoOcupado.has(teamKey(p.visitaId, s.dia, s.hora))) return false;
  return true;
}

export function solve(input: SolverInput): ScheduleResult {
  const estado = crearEstado(input);
  const partidoPorId = new Map(input.partidos.map((p) => [p.id, p]));
  const recintoPorId = new Map(input.recintos.map((r) => [r.id, r]));
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
    recintoDiaUsado.add(`${a.recintoId}|${a.dia}`);
    if (esIndeseable(a.hora)) {
      inc(p.localId);
      inc(p.visitaId);
    }
  };

  // 1) PRE-ASIGNADOS (TV): fijos.
  for (const pa of input.preAsignados) {
    const p = partidoPorId.get(pa.partidoId);
    if (!p) continue;
    const refs = arbitrosLibres(estado, pa.dia, pa.hora, input.arbitros, 2);
    registrar(
      {
        partidoId: pa.partidoId,
        recintoId: pa.recintoId,
        dia: pa.dia,
        hora: pa.hora,
        arbitros: refs ?? input.arbitros.slice(0, 2),
      },
      p,
    );
    fijos.add(pa.partidoId);
  }

  // Demanda por recinto (cuantos partidos lo quieren de local) -> los recintos
  // mas disputados se agendan primero.
  const demanda = new Map<string, number>();
  for (const p of input.partidos)
    demanda.set(p.recintoLocalId, (demanda.get(p.recintoLocalId) ?? 0) + 1);

  // 2) GREEDY most-constrained-first: primero los de recinto forzado (local ==
  // visita, no pueden ceder) y los de recintos mas demandados.
  const pendientes = input.partidos
    .filter((p) => !fijos.has(p.id))
    .map((p) => ({ p, cands: candidatos(p, recintoPorId) }))
    .sort(
      (x, y) =>
        x.cands.length - y.cands.length ||
        (demanda.get(y.p.recintoLocalId) ?? 0) -
          (demanda.get(x.p.recintoLocalId) ?? 0) ||
        x.p.categoriaId.localeCompare(y.p.categoriaId) ||
        x.p.jornada - y.p.jornada ||
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
      for (const s of input.slots) {
        if (!celdaFactibleSinArbitros(estado, p, r.id, s)) continue;
        const refs = arbitrosLibres(estado, s.dia, s.hora, input.arbitros, 2);
        if (!refs) continue;
        let score = horaDesirabilidad(s.hora) * 100;
        if (r.id !== p.recintoLocalId) score -= 100000; // cesion = ultimo recurso
        if (s.dia === "sabado") score += 5;
        if (esIndeseable(s.hora)) {
          score -=
            20 *
            ((indeseablesPorEquipo.get(p.localId) ?? 0) +
              (indeseablesPorEquipo.get(p.visitaId) ?? 0));
        }
        if (recintoDiaUsado.has(`${r.id}|${s.dia}`)) score += 2;
        if (!mejor || score > mejor.score) {
          mejor = {
            a: { partidoId: p.id, recintoId: r.id, dia: s.dia, hora: s.hora, arbitros: refs },
            score,
          };
        }
      }
    }
    if (mejor) registrar(mejor.a, p);
    else sinAsignar.push({ partidoId: p.id, ...diagnosticar(estado, p, input, cands) });
  }

  busquedaLocal(asignaciones, estado, input, partidoPorId, recintoPorId, fijos);
  return { asignaciones, sinAsignar };
}

function diagnosticar(
  estado: Estado,
  p: PartidoInput,
  input: SolverInput,
  cands: RecintoInput[],
): { razon: RazonInfactible; detalle: string } {
  let bloqueado = 0;
  let equipoOcupado = 0;
  let recintoLleno = 0;
  let sinArb = 0;
  for (const s of input.slots) {
    if (estado.bloqueados.has(slotKey(s.dia, s.hora))) {
      bloqueado++;
      continue;
    }
    const teamBusy =
      estado.equipoOcupado.has(teamKey(p.localId, s.dia, s.hora)) ||
      estado.equipoOcupado.has(teamKey(p.visitaId, s.dia, s.hora));
    if (teamBusy) {
      equipoOcupado++;
      continue;
    }
    const hayRecinto = cands.some(
      (r) => !estado.recintoOcupado.has(cellKey(r.id, s.dia, s.hora)),
    );
    if (!hayRecinto) {
      recintoLleno++;
      continue;
    }
    if (!arbitrosLibres(estado, s.dia, s.hora, input.arbitros, 2)) sinArb++;
  }
  const nombres = cands.map((r) => r.nombre).join(" / ");
  const max = Math.max(bloqueado, equipoOcupado, recintoLleno, sinArb);
  if (max === recintoLleno)
    return {
      razon: "recinto-saturado",
      detalle: `recinto(s) ${nombres} sin cupo en ningun slot`,
    };
  if (max === equipoOcupado)
    return { razon: "equipo-ocupado", detalle: "el equipo ya juega en cada slot libre" };
  if (max === sinArb)
    return { razon: "sin-arbitros", detalle: "no quedan 2 arbitros libres" };
  return { razon: "slot-bloqueado", detalle: "los slots posibles estan bloqueados" };
}

function busquedaLocal(
  asignaciones: Asignacion[],
  estado: Estado,
  input: SolverInput,
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
        for (const s of input.slots) {
          if (!celdaFactibleSinArbitros(estado, p, r.id, s)) continue;
          const refs = arbitrosLibres(estado, s.dia, s.hora, input.arbitros, 2);
          if (!refs) continue;
          a.recintoId = r.id;
          a.dia = s.dia;
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
      a.dia = best.dia;
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
