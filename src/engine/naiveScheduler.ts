import type { Asignacion, ScheduleResult, SinAsignar, SolverInput } from "./types";

/**
 * Scheduler NAIVE — el "antes" de la demo. Llena celdas (recinto, slot) en
 * orden slot-major e IGNORA todo: localia (mete partidos en recintos ajenos),
 * acceso por genero, doble-booking de equipo y de arbitros, bloqueos y
 * pre-asignados. Comparte el mismo SolverInput que el solver real.
 */
export function naiveSchedule(input: SolverInput): ScheduleResult {
  const celdas: { recintoId: string; dia: string; hora: string }[] = [];
  for (const s of input.slots)
    for (const r of input.recintos)
      celdas.push({ recintoId: r.id, dia: s.dia, hora: s.hora });

  const asignaciones: Asignacion[] = [];
  const sinAsignar: SinAsignar[] = [];
  const R = input.arbitros.length;

  input.partidos.forEach((p, i) => {
    const celda = celdas[i];
    if (!celda) {
      sinAsignar.push({ partidoId: p.id, razon: "capacidad-agotada" });
      return;
    }
    const arbitros =
      R >= 2
        ? [input.arbitros[(2 * i) % R], input.arbitros[(2 * i + 1) % R]]
        : input.arbitros.slice(0, 2);
    asignaciones.push({
      partidoId: p.id,
      recintoId: celda.recintoId,
      dia: celda.dia,
      hora: celda.hora,
      arbitros,
    });
  });

  return { asignaciones, sinAsignar };
}
