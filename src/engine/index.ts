// Barrel del motor de scheduling (modulo TS puro, portable).
export * from "./types";
export { generarFixture, fixtureCategoria, type CategoriaCtx } from "./roundRobin";
export {
  generarHoras,
  generarFinesDeSemana,
  slotsDeFinde,
  esSabado,
  diaSemana,
  sumarDias,
} from "./calendario";
export { esRecintoElegible, recintosElegibles } from "./eligibility";
export {
  esIndeseable,
  horaDesirabilidad,
  puntajeTotal,
  contarHuecos,
} from "./scoring";
export { naiveSchedule } from "./naiveScheduler";
export { solve, solveDetallado, type StatFinde } from "./solver";
export { proponerAlternativas } from "./alternativas";
export { calcularMetricas, type Metricas } from "./metrics";
