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

/** Un enfrentamiento a agendar. Lleva el contexto de su categoria porque el
 *  solver agenda varias categorias sobre el mismo pool de canchas y arbitros. */
export interface PartidoInput {
  id: string;
  categoriaId: string;
  genero: Genero;
  bloqueMin: number;
  localId: string;
  visitaId: string;
  jornada: number;
}

/** Una franja de tiempo asignable dentro de la ventana del fin de semana. */
export interface Slot {
  dia: string; // "sabado" | "domingo"
  hora: string; // "HH:MM" de inicio
}

/** Resultado del scheduler para un partido: cancha + slot + 2 arbitros. */
export interface Asignacion {
  partidoId: string;
  canchaId: string;
  dia: string;
  hora: string;
  arbitros: string[]; // exactamente 2 ids
}

/** Partido pre-asignado por TV/FEHOCH: cancha y slot fijos, no reoptimizables.
 *  Los arbitros los completa el solver si no vienen dados. */
export interface PreAsignado {
  partidoId: string;
  canchaId: string;
  dia: string;
  hora: string;
}

export type RazonInfactible =
  | "sin-cancha-elegible-libre" // ninguna cancha elegible libre en ningun slot
  | "equipo-ocupado" // el equipo ya juega en todos los slots posibles
  | "sin-arbitros" // no quedan 2 arbitros libres en ningun slot factible
  | "slot-bloqueado" // los unicos slots posibles estan bloqueados
  | "capacidad-agotada"; // no quedan celdas libres (motor naive)

export interface SinAsignar {
  partidoId: string;
  razon: RazonInfactible;
  detalle?: string;
}

export interface ScheduleResult {
  asignaciones: Asignacion[];
  sinAsignar: SinAsignar[];
}

/** Input unico que comparten el motor naive y el solver real, para poder
 *  correr ambos sobre exactamente los mismos datos y comparar. */
export interface SolverInput {
  partidos: PartidoInput[];
  canchas: CanchaInput[];
  slots: Slot[];
  arbitros: string[]; // pool de ids de arbitros disponibles
  bloqueos: Slot[]; // (dia,hora) no disponibles para nadie
  preAsignados: PreAsignado[]; // TV: fijos
}

/** Enfrentamiento crudo del round-robin, antes de enriquecer con categoria. */
export interface Enfrentamiento {
  id: string;
  localId: string;
  visitaId: string;
  jornada: number;
}
