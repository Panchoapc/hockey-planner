import type { FinDeSemana, Slot } from "./types";

// Utilidades de calendario (modulo puro). Fechas ISO YYYY-MM-DD en UTC para
// evitar lios de zona horaria.

function aDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}
function aISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function sumarDias(iso: string, n: number): string {
  const d = aDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return aISO(d);
}
/** 0=domingo .. 6=sabado (getUTCDay). */
export function diaSemana(iso: string): number {
  return aDate(iso).getUTCDay();
}
export function esSabado(iso: string): boolean {
  return diaSemana(iso) === 6;
}

/**
 * Genera los fines de semana disponibles del semestre a partir de un sabado
 * inicial, saltando los findes excluidos (feriados que se caen enteros).
 * La jornada N se juega en el finde de indice N.
 */
export function generarFinesDeSemana(
  inicioSabado: string,
  cantidad: number,
  findesExcluidos: string[] = [],
): FinDeSemana[] {
  if (!esSabado(inicioSabado))
    throw new Error(`inicioSabado ${inicioSabado} no es sabado`);
  const excluidos = new Set(findesExcluidos);
  const out: FinDeSemana[] = [];
  let sabado = inicioSabado;
  while (out.length < cantidad) {
    if (!excluidos.has(sabado)) {
      out.push({
        indice: out.length + 1,
        sabado,
        domingo: sumarDias(sabado, 1),
      });
    }
    sabado = sumarDias(sabado, 7);
  }
  return out;
}

/** Horas del dia asignables, en pasos del bloque, dentro de [desde, hasta]. */
export function generarHoras(
  bloqueMin: number,
  desde: string,
  hasta: string,
): string[] {
  const ini = aMin(desde);
  const fin = aMin(hasta);
  const horas: string[] = [];
  for (let t = ini; t + bloqueMin <= fin; t += bloqueMin) horas.push(aHHMM(t));
  return horas;
}

/** Slots concretos de un fin de semana (sabado + domingo) menos los bloqueados. */
export function slotsDeFinde(
  finde: FinDeSemana,
  horas: string[],
  bloqueos: Slot[],
): Slot[] {
  const bloq = new Set(bloqueos.map((b) => `${b.fecha}|${b.hora}`));
  const out: Slot[] = [];
  for (const fecha of [finde.sabado, finde.domingo]) {
    for (const hora of horas) {
      if (!bloq.has(`${fecha}|${hora}`)) out.push({ fecha, hora });
    }
  }
  return out;
}

function aMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function aHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
