// Tipos del motor de scheduling. Modulo TS puro: NO importa Next, Prisma ni
// ningun framework. Recibe datos planos y devuelve datos planos.

export type Genero = "VARONES" | "DAMAS";
export type Formato = "ADULTO" | "SUB14" | "SUB12";
export type Rueda = "UNICA" | "DOBLE";

export interface RecintoInput {
  id: string;
  nombre: string;
  ciudad: string;
  admiteVarones: boolean;
}

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

/** Un slot concreto: FECHA (ISO YYYY-MM-DD) + hora. El dia de la semana se
 *  deriva de la fecha; no se guarda. */
export interface Slot {
  fecha: string;
  hora: string;
}

/** Un fin de semana disponible del semestre (dos fechas concretas). */
export interface FinDeSemana {
  indice: number; // 1-based; la jornada N se juega en el finde N.
  sabado: string;
  domingo: string;
}

/** Resultado del scheduler para un partido: recinto + slot + 2 arbitros. */
export interface Asignacion {
  partidoId: string;
  recintoId: string;
  fecha: string;
  hora: string;
  arbitros: string[];
}

export interface PreAsignado {
  partidoId: string;
  recintoId: string;
  fecha: string;
  hora: string;
}

export type RazonInfactible =
  | "recinto-saturado"
  | "recinto-no-admite-genero"
  | "equipo-ocupado"
  | "sin-arbitros"
  | "slot-bloqueado"
  | "capacidad-agotada";

export interface SinAsignar {
  partidoId: string;
  razon: RazonInfactible;
  detalle?: string;
}

export interface ScheduleResult {
  asignaciones: Asignacion[];
  sinAsignar: SinAsignar[];
}

/** Input del solver de temporada. El calendario (finesDeSemana) decide EN QUE
 *  finde va cada jornada; el solver optimiza DENTRO de cada finde. */
export interface SolverInput {
  partidos: PartidoInput[];
  recintos: RecintoInput[];
  finesDeSemana: FinDeSemana[];
  horas: string[]; // horas del dia (08:30..17:30)
  arbitros: string[];
  bloqueos: Slot[]; // {fecha, hora} concretos (feriado, evento)
  preAsignados: PreAsignado[];
}

export interface Enfrentamiento {
  id: string;
  localId: string;
  visitaId: string;
  jornada: number;
}

// --- Motor de alternativas (Tarea 2) ---

export interface Alternativa {
  fecha: string;
  hora: string;
  recintoId: string;
  recintoNombre: string;
  cesion: boolean; // se juega en el recinto de la visita
  desplaza: string[]; // otros partidos que habria que mover (ideal: ninguno)
  deltaPuntaje: number; // vs la asignacion actual (mayor = mejor)
}

export interface ResultadoAlternativas {
  partidoId: string;
  actual: Asignacion | null;
  alternativas: Alternativa[];
  sinAlternativas: boolean;
  razon?: RazonInfactible;
  detalle?: string;
}
