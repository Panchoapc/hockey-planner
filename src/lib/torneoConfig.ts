// Parametros del torneo compartidos por la API y la UI (una sola fuente).
// TODO(PLAN §9): valores sin confirmar con Francisco.
import type { Slot } from "@/engine";

export const DIAS = ["sabado", "domingo"];
export const DESDE = "08:00";
export const HASTA = "19:00";

export const N_ARBITROS = 18; // supuesto de trabajo.
export const BLOQUEOS: Slot[] = [{ dia: "domingo", hora: "08:00" }]; // ej. evento masivo.
