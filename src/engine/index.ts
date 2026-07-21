// Barrel del motor de scheduling (modulo TS puro, portable).
export * from "./types";
export {
  generarFixture,
  fixtureCategoria,
  type CategoriaCtx,
} from "./roundRobin";
export { generarSlots } from "./slots";
export { esRecintoElegible, recintosElegibles } from "./eligibility";
export {
  esIndeseable,
  horaDesirabilidad,
  puntajeTotal,
  contarHuecos,
} from "./scoring";
export { naiveSchedule } from "./naiveScheduler";
export { solve } from "./solver";
export { calcularMetricas, type Metricas } from "./metrics";
