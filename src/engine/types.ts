// Tipos del motor de scheduling. Modulo TS puro: NO importa Next, Prisma ni
// ningun framework. Recibe datos planos y devuelve datos planos.

export type Genero = "VARONES" | "DAMAS";
export type Formato = "ADULTO" | "SUB14" | "SUB12";
export type PoolCancha = "CLUB" | "COLEGIO";

export interface CanchaInput {
  id: string;
  nombre: string;
  pool: PoolCancha;
}

/** Un enfrentamiento generado por el fixture, aun sin cancha ni horario. */
export interface PartidoInput {
  id: string;
  localId: string;
  visitaId: string;
  jornada: number;
}

/** Una franja de tiempo asignable dentro de la ventana del fin de semana. */
export interface Slot {
  dia: string; // "sabado" | "domingo"
  hora: string; // "HH:MM" de inicio
}

/** Resultado del scheduler para un partido: cancha + slot. */
export interface Asignacion {
  partidoId: string;
  canchaId: string;
  dia: string;
  hora: string;
}

export interface ScheduleResult {
  asignaciones: Asignacion[];
  /** Ids de partidos que no cupieron (capacidad insuficiente). */
  sinAsignar: string[];
}
