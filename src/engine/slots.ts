import type { Slot } from "./types";

/**
 * Genera las franjas horarias asignables dentro de la ventana del fin de
 * semana, en pasos del tamano del bloque de la categoria.
 *
 * Ej: bloque 90min, 08:00-19:00, sab+dom -> 7 slots/dia (08:00..17:00) x2.
 * El ultimo slot debe TERMINAR dentro de la ventana (inicio + bloque <= fin).
 */
export function generarSlots(
  bloqueMin: number,
  dias: string[],
  desde: string,
  hasta: string,
): Slot[] {
  const inicioMin = aMinutos(desde);
  const finMin = aMinutos(hasta);
  const slots: Slot[] = [];

  for (const dia of dias) {
    for (let t = inicioMin; t + bloqueMin <= finMin; t += bloqueMin) {
      slots.push({ dia, hora: aHHMM(t) });
    }
  }
  return slots;
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function aHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
