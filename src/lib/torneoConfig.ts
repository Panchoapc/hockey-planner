// Parametros del torneo compartidos por la API y la UI (una sola fuente).
// TODO(2.b / §9): valores sin confirmar con Francisco.
import type { Slot } from "@/engine";

export const DIAS = ["sabado", "domingo"];
export const DESDE = "08:30"; // arranca 08:30 para que la grilla contenga 13:00.
export const HASTA = "19:00";

// Pool alto a proposito: el cuello de botella de la demo debe ser el RECINTO
// (Manquehue/Vina), no el arbitro. Arbitros regionales delgados sin modelar.
export const N_ARBITROS = 30;
export const BLOQUEOS: Slot[] = [{ dia: "domingo", hora: "08:30" }]; // ej. evento.
