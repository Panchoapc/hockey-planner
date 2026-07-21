import { slotsDeFinde } from "./calendario";
import { puntajeTotal } from "./scoring";
import {
  arbitrosLibres,
  candidatos,
  celdaFactible,
  cellKey,
  crearEstado,
  ocupar,
  teamKey,
} from "./restricciones";
import type {
  Alternativa,
  Asignacion,
  RazonInfactible,
  ResultadoAlternativas,
  SolverInput,
} from "./types";

/**
 * Motor de ALTERNATIVAS (Tarea 2): dado un partido ya agendado, devuelve los
 * movimientos legales DENTRO de su mismo fin de semana, rankeados por el
 * puntaje blando, cada uno con su costo explicado. Es trabajo del solver (CSP),
 * no del LLM: toda alternativa respeta el 100% de las restricciones duras.
 *
 * Si no hay ninguna alternativa legal en el finde, devuelve un resultado
 * EXPLICITO (sinAlternativas + razon) — no una lista vacia. Ese es justo el
 * caso del "martes por la noche": el siguiente paso seria proponer un fin de
 * semana de recuperacion (limitacion conocida, fuera del alcance de hoy).
 */
export function proponerAlternativas(
  partidoId: string,
  asignaciones: Asignacion[],
  input: SolverInput,
  maxAlternativas = 8,
): ResultadoAlternativas {
  const partidoPorId = new Map(input.partidos.map((p) => [p.id, p]));
  const recintoPorId = new Map(input.recintos.map((r) => [r.id, r]));
  const p = partidoPorId.get(partidoId);
  if (!p) {
    return {
      partidoId,
      actual: null,
      alternativas: [],
      sinAlternativas: true,
      razon: "capacidad-agotada",
      detalle: "partido inexistente",
    };
  }

  const finde = input.finesDeSemana.find((f) => f.indice === p.jornada);
  if (!finde) {
    return {
      partidoId,
      actual: asignaciones.find((a) => a.partidoId === partidoId) ?? null,
      alternativas: [],
      sinAlternativas: true,
      razon: "capacidad-agotada",
      detalle: `no hay fin de semana para la jornada ${p.jornada}`,
    };
  }
  const slots = slotsDeFinde(finde, input.horas, input.bloqueos);

  // Asignaciones de ESTE finde (mismos partidos de la jornada).
  const delFinde = asignaciones.filter(
    (a) => partidoPorId.get(a.partidoId)?.jornada === p.jornada,
  );
  const actual = delFinde.find((a) => a.partidoId === partidoId) ?? null;

  // Estado con todo el finde MENOS el partido objetivo.
  const estado = crearEstado();
  for (const a of delFinde) {
    if (a.partidoId === partidoId) continue;
    const pp = partidoPorId.get(a.partidoId);
    if (pp) ocupar(estado, a, pp);
  }

  const base = puntajeTotal(delFinde, partidoPorId);
  const cands = candidatos(p, recintoPorId);
  const alternativas: Alternativa[] = [];

  for (const r of cands) {
    for (const s of slots) {
      // Saltar la celda actual (no es un "movimiento").
      if (actual && r.id === actual.recintoId && s.fecha === actual.fecha && s.hora === actual.hora)
        continue;
      if (!celdaFactible(estado, p, r.id, s)) continue;
      const refs = arbitrosLibres(estado, s.fecha, s.hora, input.arbitros, 2);
      if (!refs) continue;

      const nueva: Asignacion = {
        partidoId,
        recintoId: r.id,
        fecha: s.fecha,
        hora: s.hora,
        arbitros: refs,
      };
      const nuevoFinde = delFinde.map((a) => (a.partidoId === partidoId ? nueva : a));
      if (!actual) nuevoFinde.push(nueva);
      const delta = puntajeTotal(nuevoFinde, partidoPorId) - base;

      alternativas.push({
        fecha: s.fecha,
        hora: s.hora,
        recintoId: r.id,
        recintoNombre: r.nombre,
        cesion: r.id !== p.recintoLocalId,
        desplaza: [], // solo proponemos celdas libres: no desplaza a nadie.
        deltaPuntaje: delta,
      });
    }
  }

  alternativas.sort((a, b) => b.deltaPuntaje - a.deltaPuntaje);

  if (alternativas.length === 0) {
    return {
      partidoId,
      actual,
      alternativas: [],
      sinAlternativas: true,
      ...diagnosticarFinde(p, estado, slots, input, cands, recintoPorId),
    };
  }

  return {
    partidoId,
    actual,
    alternativas: alternativas.slice(0, maxAlternativas),
    sinAlternativas: false,
  };
}

function diagnosticarFinde(
  p: { localId: string; visitaId: string; genero: string },
  estado: ReturnType<typeof crearEstado>,
  slots: { fecha: string; hora: string }[],
  input: SolverInput,
  cands: { id: string; nombre: string }[],
  _recintoPorId: unknown,
): { razon: RazonInfactible; detalle: string } {
  const nombres = cands.map((r) => r.nombre).join(" / ");
  const libresEquipo = slots.filter(
    (s) =>
      !estado.equipoOcupado.has(teamKey(p.localId, s.fecha, s.hora)) &&
      !estado.equipoOcupado.has(teamKey(p.visitaId, s.fecha, s.hora)),
  );
  if (libresEquipo.length === 0)
    return {
      razon: "equipo-ocupado",
      detalle: "sin alternativas: el equipo ya ocupa todos los slots libres del finde",
    };
  const conRecinto = libresEquipo.filter((s) =>
    cands.some((r) => !estado.recintoOcupado.has(cellKey(r.id, s.fecha, s.hora))),
  );
  if (conRecinto.length === 0)
    return {
      razon: "recinto-saturado",
      detalle: `sin alternativas: recinto(s) ${nombres} sin cupo en el finde`,
    };
  return {
    razon: "sin-arbitros",
    detalle: "sin alternativas: no quedan 2 arbitros libres",
  };
}
