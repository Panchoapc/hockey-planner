import { canchasElegibles } from "./eligibility";
import { esIndeseable, horaDesirabilidad, puntajeTotal } from "./scoring";
import type {
  Asignacion,
  PartidoInput,
  RazonInfactible,
  ScheduleResult,
  SinAsignar,
  Slot,
  SolverInput,
} from "./types";

// SOLVER real (Dia 1): greedy (most-constrained-first) + busqueda local sobre
// la funcion de puntaje. Garantiza el 100% de las duras y maximiza las blandas.

const slotKey = (dia: string, hora: string) => `${dia}|${hora}`;
const cellKey = (canchaId: string, dia: string, hora: string) =>
  `${canchaId}|${dia}|${hora}`;
const teamKey = (eq: string, dia: string, hora: string) =>
  `${eq}|${dia}|${hora}`;

interface Estado {
  canchaOcupada: Set<string>;
  equipoOcupado: Set<string>;
  arbitrosPorSlot: Map<string, Set<string>>;
  bloqueados: Set<string>;
}

function crearEstado(input: SolverInput): Estado {
  return {
    canchaOcupada: new Set(),
    equipoOcupado: new Set(),
    arbitrosPorSlot: new Map(),
    bloqueados: new Set(input.bloqueos.map((b) => slotKey(b.dia, b.hora))),
  };
}

function ocupar(estado: Estado, a: Asignacion, p: PartidoInput) {
  estado.canchaOcupada.add(cellKey(a.canchaId, a.dia, a.hora));
  estado.equipoOcupado.add(teamKey(p.localId, a.dia, a.hora));
  estado.equipoOcupado.add(teamKey(p.visitaId, a.dia, a.hora));
  const sk = slotKey(a.dia, a.hora);
  const set = estado.arbitrosPorSlot.get(sk) ?? new Set<string>();
  for (const arb of a.arbitros) set.add(arb);
  estado.arbitrosPorSlot.set(sk, set);
}

function liberar(estado: Estado, a: Asignacion, p: PartidoInput) {
  estado.canchaOcupada.delete(cellKey(a.canchaId, a.dia, a.hora));
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

function celdaFactibleSinArbitros(
  estado: Estado,
  p: PartidoInput,
  canchaId: string,
  s: Slot,
): boolean {
  if (estado.bloqueados.has(slotKey(s.dia, s.hora))) return false;
  if (estado.canchaOcupada.has(cellKey(canchaId, s.dia, s.hora))) return false;
  if (estado.equipoOcupado.has(teamKey(p.localId, s.dia, s.hora))) return false;
  if (estado.equipoOcupado.has(teamKey(p.visitaId, s.dia, s.hora))) return false;
  return true;
}

export function solve(input: SolverInput): ScheduleResult {
  const estado = crearEstado(input);
  const partidoPorId = new Map(input.partidos.map((p) => [p.id, p]));
  const asignaciones: Asignacion[] = [];
  const sinAsignar: SinAsignar[] = [];
  const fijos = new Set<string>();

  const indeseablesPorEquipo = new Map<string, number>();
  const canchaDiaUsada = new Set<string>();
  const incIndeseable = (eq: string) =>
    indeseablesPorEquipo.set(eq, (indeseablesPorEquipo.get(eq) ?? 0) + 1);

  const registrar = (a: Asignacion, p: PartidoInput) => {
    ocupar(estado, a, p);
    asignaciones.push(a);
    canchaDiaUsada.add(`${a.canchaId}|${a.dia}`);
    if (esIndeseable(a.hora)) {
      incIndeseable(p.localId);
      incIndeseable(p.visitaId);
    }
  };

  // 1) PRE-ASIGNADOS (TV): fijos, se colocan primero y no se reoptimizan.
  for (const pa of input.preAsignados) {
    const p = partidoPorId.get(pa.partidoId);
    if (!p) continue;
    const refs = arbitrosLibres(estado, pa.dia, pa.hora, input.arbitros, 2);
    const a: Asignacion = {
      partidoId: pa.partidoId,
      canchaId: pa.canchaId,
      dia: pa.dia,
      hora: pa.hora,
      arbitros: refs ?? input.arbitros.slice(0, 2),
    };
    registrar(a, p);
    fijos.add(pa.partidoId);
  }

  // 2) GREEDY most-constrained-first.
  const pendientes = input.partidos
    .filter((p) => !fijos.has(p.id))
    .map((p) => ({
      p,
      elegibles: canchasElegibles(p.genero, input.canchas).length,
    }))
    .sort(
      (a, b) =>
        a.elegibles - b.elegibles ||
        a.p.genero.localeCompare(b.p.genero) ||
        a.p.categoriaId.localeCompare(b.p.categoriaId) ||
        a.p.jornada - b.p.jornada ||
        a.p.id.localeCompare(b.p.id),
    );

  for (const { p } of pendientes) {
    const elegibles = canchasElegibles(p.genero, input.canchas);
    let mejor: { a: Asignacion; score: number } | null = null;

    for (const s of input.slots) {
      for (const c of elegibles) {
        if (!celdaFactibleSinArbitros(estado, p, c.id, s)) continue;
        const refs = arbitrosLibres(estado, s.dia, s.hora, input.arbitros, 2);
        if (!refs) continue;

        let score = horaDesirabilidad(s.hora) * 100;
        if (s.dia === "sabado") score += 5;
        if (esIndeseable(s.hora)) {
          score -=
            20 *
            ((indeseablesPorEquipo.get(p.localId) ?? 0) +
              (indeseablesPorEquipo.get(p.visitaId) ?? 0));
        }
        if (canchaDiaUsada.has(`${c.id}|${s.dia}`)) score += 2;

        if (!mejor || score > mejor.score) {
          mejor = {
            a: {
              partidoId: p.id,
              canchaId: c.id,
              dia: s.dia,
              hora: s.hora,
              arbitros: refs,
            },
            score,
          };
        }
      }
    }

    if (mejor) registrar(mejor.a, p);
    else sinAsignar.push({ partidoId: p.id, ...diagnosticar(estado, p, input) });
  }

  // 3) BUSQUEDA LOCAL.
  busquedaLocal(asignaciones, estado, input, partidoPorId, fijos);

  return { asignaciones, sinAsignar };
}

function diagnosticar(
  estado: Estado,
  p: PartidoInput,
  input: SolverInput,
): { razon: RazonInfactible; detalle: string } {
  const elegibles = canchasElegibles(p.genero, input.canchas);
  if (elegibles.length === 0)
    return {
      razon: "sin-cancha-elegible-libre",
      detalle: `${p.genero} no tiene canchas elegibles`,
    };

  let bloqueado = 0;
  let equipoOcupado = 0;
  let canchaLlena = 0;
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
    const hayCancha = elegibles.some(
      (c) => !estado.canchaOcupada.has(cellKey(c.id, s.dia, s.hora)),
    );
    if (!hayCancha) {
      canchaLlena++;
      continue;
    }
    if (!arbitrosLibres(estado, s.dia, s.hora, input.arbitros, 2)) sinArb++;
  }

  const max = Math.max(bloqueado, equipoOcupado, canchaLlena, sinArb);
  if (max === canchaLlena)
    return {
      razon: "sin-cancha-elegible-libre",
      detalle: "todas las canchas elegibles ocupadas en los slots posibles",
    };
  if (max === equipoOcupado)
    return {
      razon: "equipo-ocupado",
      detalle: "el equipo ya juega en cada slot libre",
    };
  if (max === sinArb)
    return { razon: "sin-arbitros", detalle: "no quedan 2 arbitros libres" };
  return {
    razon: "slot-bloqueado",
    detalle: "los slots posibles estan bloqueados",
  };
}

function busquedaLocal(
  asignaciones: Asignacion[],
  estado: Estado,
  input: SolverInput,
  partidoPorId: Map<string, PartidoInput>,
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

      for (const s of input.slots) {
        for (const c of canchasElegibles(p.genero, input.canchas)) {
          if (!celdaFactibleSinArbitros(estado, p, c.id, s)) continue;
          const refs = arbitrosLibres(estado, s.dia, s.hora, input.arbitros, 2);
          if (!refs) continue;
          a.canchaId = c.id;
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

      a.canchaId = best.canchaId;
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
