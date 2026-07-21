import type { Asignacion, ScheduleResult, SinAsignar, SolverInput } from "./types";

/**
 * Scheduler NAIVE — el "antes" de la demo. Deliberadamente tonto: llena celdas
 * (cancha, slot) en orden slot-major e IGNORA casi todo:
 *   - acceso por genero (mete varones en canchas de colegio)
 *   - que un equipo no juegue dos veces a la vez
 *   - arbitros (los cicla del pool -> mismos arbitros en partidos simultaneos)
 *   - fechas bloqueadas y pre-asignados
 * Comparte el MISMO SolverInput que el solver real para poder contrastarlos.
 * Resultado esperado: grilla rota (equipos citados varias veces a la vez, todo
 * el sabado, domingo vacio, choques de arbitro y de genero).
 */
export function naiveSchedule(input: SolverInput): ScheduleResult {
  const celdas: { canchaId: string; dia: string; hora: string }[] = [];
  for (const s of input.slots) {
    for (const c of input.canchas) {
      celdas.push({ canchaId: c.id, dia: s.dia, hora: s.hora });
    }
  }

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
      canchaId: celda.canchaId,
      dia: celda.dia,
      hora: celda.hora,
      arbitros,
    });
  });

  return { asignaciones, sinAsignar };
}
