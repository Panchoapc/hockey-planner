// Tipos del motor de scheduling. Modulo TS puro: NO importa Next, Prisma ni
// ningun framework. Recibe datos planos y devuelve datos planos.

export type Genero = "VARONES" | "DAMAS";
export type Formato = "ADULTO" | "SUB14" | "SUB12";
export type Rueda = "UNICA" | "DOBLE";

/** Un recinto (sede). El recurso escaso: cada recinto tiene una cancha y por
 *  ende una capacidad de fin de semana (nro de slots). `admiteVarones` se
 *  DERIVA: true sii algun equipo adulto masculino es local ahi. */
export interface RecintoInput {
  id: string;
  nombre: string;
  ciudad: string;
  admiteVarones: boolean;
}

/** Un partido a agendar, ya con su localia resuelta. Los candidatos de recinto
 *  son SOLO {recintoLocalId, recintoVisitaId} (regla dura 2.b). */
export interface PartidoInput {
  id: string;
  categoriaId: string;
  genero: Genero;
  bloqueMin: number;
  localId: string;
  visitaId: string;
  jornada: number;
  recintoLocalId: string;
  recintoVisitaId: string;
}

export interface Slot {
  dia: string; // "sabado" | "domingo"
  hora: string; // "HH:MM" de inicio
}

/** Resultado del scheduler para un partido: recinto + slot + 2 arbitros. */
export interface Asignacion {
  partidoId: string;
  recintoId: string;
  dia: string;
  hora: string;
  arbitros: string[]; // exactamente 2 ids
}

/** Partido pre-asignado por TV/FEHOCH: recinto y slot fijos. */
export interface PreAsignado {
  partidoId: string;
  recintoId: string;
  dia: string;
  hora: string;
}

export type RazonInfactible =
  | "recinto-saturado" // los recintos {local, visita} estan llenos en todo slot
  | "recinto-no-admite-genero" // ningun recinto candidato admite el genero
  | "equipo-ocupado" // el equipo ya juega en cada slot libre
  | "sin-arbitros" // no quedan 2 arbitros libres
  | "slot-bloqueado" // los slots posibles estan bloqueados
  | "capacidad-agotada"; // motor naive

export interface SinAsignar {
  partidoId: string;
  razon: RazonInfactible;
  detalle?: string;
}

export interface ScheduleResult {
  asignaciones: Asignacion[];
  sinAsignar: SinAsignar[];
}

/** Input unico que comparten el motor naive y el solver real. */
export interface SolverInput {
  partidos: PartidoInput[];
  recintos: RecintoInput[];
  slots: Slot[];
  arbitros: string[];
  bloqueos: Slot[];
  preAsignados: PreAsignado[];
}

/** Enfrentamiento crudo del round-robin, con localia ya resuelta (localId es
 *  quien recibe). */
export interface Enfrentamiento {
  id: string;
  localId: string;
  visitaId: string;
  jornada: number;
}
