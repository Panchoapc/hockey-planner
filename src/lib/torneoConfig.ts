// Calendario y parametros del torneo (una sola fuente para API y UI).
// TODO(sin confirmar con Francisco): fecha de inicio del semestre, findes
// excluidos y bloqueos exactos. Se reportan como INCERTIDUMBRE: los valores
// de abajo son supuestos de trabajo, no confirmados.
import { generarFinesDeSemana, generarHoras, type Slot, type FinDeSemana } from "@/engine";

export const BLOQUE_MIN = 90; // categorias adulto
export const DESDE = "08:30"; // arranca 08:30 => la grilla contiene 13:00
export const HASTA = "19:00";

// Clausura 2026 (~ago-dic). 2026-08-01 es sabado (verificado).
export const INICIO_SABADO = "2026-08-01";
// Max jornadas = 18 (Varones B, 9 equipos doble rueda). Margen para excluidos.
export const N_FINES_DE_SEMANA = 20;
// Fiestas Patrias: finde del 2026-09-19 (sabado) se cae entero. TODO: confirmar.
export const FINDES_EXCLUIDOS = ["2026-09-19"];
// Ejemplo de bloqueo puntual (evento masivo) en una fecha/hora concreta. TODO.
export const BLOQUEOS: Slot[] = [{ fecha: "2026-09-13", hora: "08:30" }];

// Numero NEUTRAL de arbitros (no elegido para forzar un cuello de botella).
// La factibilidad es insensible a este valor en un rango amplio (se reporta).
export const N_ARBITROS = 20;

export function construirCalendario(): {
  finesDeSemana: FinDeSemana[];
  horas: string[];
  bloqueos: Slot[];
} {
  return {
    finesDeSemana: generarFinesDeSemana(INICIO_SABADO, N_FINES_DE_SEMANA, FINDES_EXCLUIDOS),
    horas: generarHoras(BLOQUE_MIN, DESDE, HASTA),
    bloqueos: BLOQUEOS,
  };
}
