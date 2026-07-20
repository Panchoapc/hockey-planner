import type {
  Asignacion,
  CanchaInput,
  PartidoInput,
  ScheduleResult,
  Slot,
} from "./types";

/**
 * Scheduler NAIVE — Dia 0.
 *
 * Deliberadamente tonto: asigna cada partido a una celda (cancha, slot)
 * respetando UNICAMENTE el no-solapamiento de cancha (una celda = un partido).
 *
 * Lo que a proposito IGNORA (y que resuelve el solver real del Dia 1):
 *   - que un equipo no juegue dos partidos a la vez / buffer entre los suyos
 *   - disponibilidad y no-solapamiento de arbitros
 *   - restricciones blandas (horas lindas, equidad, agrupar por club...)
 *   - fechas bloqueadas, partidos pre-asignados por TV, etc.
 *
 * Estrategia de llenado: slot-major (recorre todas las canchas de un slot
 * antes de pasar al siguiente), para concentrar la grilla arriba-izquierda.
 *
 * Funcion pura: sin efectos, sin dependencias de framework.
 */
export function naiveSchedule(
  partidos: PartidoInput[],
  canchas: CanchaInput[],
  slots: Slot[],
): ScheduleResult {
  const asignaciones: Asignacion[] = [];
  const sinAsignar: string[] = [];

  // Celdas disponibles en orden slot-major.
  const celdas: { canchaId: string; dia: string; hora: string }[] = [];
  for (const slot of slots) {
    for (const cancha of canchas) {
      celdas.push({ canchaId: cancha.id, dia: slot.dia, hora: slot.hora });
    }
  }

  partidos.forEach((partido, i) => {
    const celda = celdas[i];
    if (!celda) {
      // No hay mas celdas libres: capacidad (canchas x slots) agotada.
      sinAsignar.push(partido.id);
      return;
    }
    asignaciones.push({
      partidoId: partido.id,
      canchaId: celda.canchaId,
      dia: celda.dia,
      hora: celda.hora,
    });
  });

  return { asignaciones, sinAsignar };
}
