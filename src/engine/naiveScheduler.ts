import { slotsDeFinde } from "./calendario";
import type { Asignacion, PartidoInput, ScheduleResult, SinAsignar, SolverInput } from "./types";

/**
 * Scheduler NAIVE — el "antes". Usa el MISMO calendario (jornada -> finde) que
 * el solver, pero DENTRO de cada finde llena celdas (recinto, slot) slot-major
 * ignorando localia, genero, arbitros y bloqueos. Resultado: partidos en
 * recintos ajenos y varones en recintos femeninos. El contraste es la demo.
 */
export function naiveSchedule(input: SolverInput): ScheduleResult {
  const asignaciones: Asignacion[] = [];
  const sinAsignar: SinAsignar[] = [];
  const R = input.arbitros.length;

  const porJornada = new Map<number, PartidoInput[]>();
  for (const p of input.partidos) {
    const arr = porJornada.get(p.jornada) ?? [];
    arr.push(p);
    porJornada.set(p.jornada, arr);
  }
  const findePorIndice = new Map(input.finesDeSemana.map((f) => [f.indice, f]));

  for (const [jornada, partidos] of porJornada) {
    const finde = findePorIndice.get(jornada);
    if (!finde) {
      for (const p of partidos) sinAsignar.push({ partidoId: p.id, razon: "capacidad-agotada" });
      continue;
    }
    const slots = slotsDeFinde(finde, input.horas, input.bloqueos);
    const celdas = slots.flatMap((s) => input.recintos.map((r) => ({ recintoId: r.id, ...s })));
    partidos.forEach((p, i) => {
      const celda = celdas[i];
      if (!celda) {
        sinAsignar.push({ partidoId: p.id, razon: "capacidad-agotada" });
        return;
      }
      const arbitros =
        R >= 2 ? [input.arbitros[(2 * i) % R], input.arbitros[(2 * i + 1) % R]] : input.arbitros.slice(0, 2);
      asignaciones.push({
        partidoId: p.id,
        recintoId: celda.recintoId,
        fecha: celda.fecha,
        hora: celda.hora,
        arbitros,
      });
    });
  }
  return { asignaciones, sinAsignar };
}
