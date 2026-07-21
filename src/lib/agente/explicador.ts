// Explicador: traduce la salida del solver a lenguaje, SOBRE datos reales de la
// asignacion (nunca inventa). No decide nada; solo redacta.
import { esSabado, esIndeseable, horaDesirabilidad } from "../../engine";
import type { Asignacion, ResultadoAlternativas } from "../../engine";

export interface CtxPartido {
  local: string;
  visita: string;
  recintoNombre: string;
  recintoLocalId: string;
}

function comentarioHora(hora: string): string {
  if (hora === "13:00") return "un horario de mediodia, facil de recordar";
  if (esIndeseable(hora)) return "un horario poco deseable (muy temprano o muy tarde)";
  if (horaDesirabilidad(hora) >= 3) return "un buen horario de medio dia";
  return "un horario razonable";
}

export function explicarAsignacion(a: Asignacion, ctx: CtxPartido): string {
  const dia = esSabado(a.fecha) ? "sabado" : "domingo";
  const cesion = a.recintoId !== ctx.recintoLocalId;
  const local = cesion
    ? `en ${ctx.recintoNombre} (cediendo localia)`
    : `en ${ctx.recintoNombre} (su localia)`;
  return (
    `${ctx.local} vs ${ctx.visita} quedo el ${dia} ${a.fecha} a las ${a.hora} ${local}. ` +
    `Es ${comentarioHora(a.hora)}.`
  );
}

export function explicarAlternativas(r: ResultadoAlternativas, ctx: CtxPartido): string {
  if (r.sinAlternativas) {
    return (
      `No hay alternativas legales para mover ${ctx.local} vs ${ctx.visita} en ese ` +
      `fin de semana (${r.detalle ?? r.razon}). El siguiente paso seria buscar un ` +
      `fin de semana de recuperacion.`
    );
  }
  const top = r.alternativas.slice(0, 3).map((alt) => {
    const dia = esSabado(alt.fecha) ? "sabado" : "domingo";
    const signo = alt.deltaPuntaje >= 0 ? "mejora" : "empeora";
    const ces = alt.cesion ? ", cediendo localia" : "";
    return `- ${dia} ${alt.fecha} ${alt.hora} en ${alt.recintoNombre}${ces} (${signo} el puntaje)`;
  });
  return `Alternativas para ${ctx.local} vs ${ctx.visita}:\n${top.join("\n")}`;
}
