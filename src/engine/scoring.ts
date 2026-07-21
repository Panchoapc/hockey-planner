import type { Asignacion, PartidoInput } from "./types";

// Restricciones BLANDAS -> funcion de puntaje (mayor = mejor). Prioridad
// (PLAN §5 + 2.b): 1) horas lindas (13:00)  2) equidad  3) NO ceder localia
// 4) sabado + intercalar generos  5) huecos de cancha.
const W_NICE = 1000;
const W_EQUIDAD = 500;
const W_CESION = 6000; // cesion de localia: casi prohibitiva (excepcion)
const W_SABADO = 100;
const W_INTERCALADO = 300;
const W_HUECOS = 10;

/** Slots indeseables en la grilla 08:30..17:30: 08:30 (temprano) y 17:30 (tarde). */
export function esIndeseable(hora: string): boolean {
  return hora === "08:30" || aMin(hora) >= aMin("17:30");
}

/** Desirabilidad de una hora (soft-1). 13:00 es la "hora facil de recordar". */
export function horaDesirabilidad(hora: string): number {
  const redonda = hora.endsWith(":00") || hora.endsWith(":30");
  if (!redonda) return 0; // horas cuarto (:15/:45): peores.
  switch (hora) {
    case "13:00":
      return 6;
    case "11:30":
    case "14:30":
      return 4;
    case "10:00":
    case "16:00":
      return 3;
    default:
      return esIndeseable(hora) ? 1 : 2;
  }
}

export function puntajeTotal(
  asignaciones: Asignacion[],
  partidoPorId: Map<string, PartidoInput>,
): number {
  if (asignaciones.length === 0) return 0;

  // soft-1: horas lindas.
  const nice = asignaciones.reduce((s, a) => s + horaDesirabilidad(a.hora), 0);

  // soft-2: equidad -> repartir slots indeseables entre equipos.
  const indeseablesPorEquipo = new Map<string, number>();
  for (const a of asignaciones) {
    if (!esIndeseable(a.hora)) continue;
    const p = partidoPorId.get(a.partidoId);
    if (!p) continue;
    for (const eq of [p.localId, p.visitaId])
      indeseablesPorEquipo.set(eq, (indeseablesPorEquipo.get(eq) ?? 0) + 1);
  }
  let equidadSq = 0;
  for (const n of indeseablesPorEquipo.values()) equidadSq += n * n;

  // soft-3: no ceder localia (jugar en recinto de la visita es la excepcion).
  let cesiones = 0;
  for (const a of asignaciones) {
    const p = partidoPorId.get(a.partidoId);
    if (p && a.recintoId !== p.recintoLocalId) cesiones++;
  }

  // soft-4: preferir sabado, intercalando generos.
  const satBonus = asignaciones.filter((a) => a.dia === "sabado").length;
  const fracSab = (genero: "VARONES" | "DAMAS") => {
    const del = asignaciones.filter(
      (a) => partidoPorId.get(a.partidoId)?.genero === genero,
    );
    if (del.length === 0) return 0;
    return del.filter((a) => a.dia === "sabado").length / del.length;
  };
  const intercalado = Math.abs(fracSab("VARONES") - fracSab("DAMAS"));

  // soft-5: minimizar huecos muertos de cancha.
  const huecos = contarHuecos(asignaciones);

  return (
    W_NICE * nice -
    W_EQUIDAD * equidadSq -
    W_CESION * cesiones +
    W_SABADO * satBonus -
    W_INTERCALADO * intercalado * asignaciones.length -
    W_HUECOS * huecos
  );
}

/** Huecos = slots vacios entre el primer y ultimo partido de cada (recinto,dia). */
export function contarHuecos(asignaciones: Asignacion[]): number {
  const porRecintoDia = new Map<string, number[]>();
  for (const a of asignaciones) {
    const k = `${a.recintoId}|${a.dia}`;
    const arr = porRecintoDia.get(k) ?? [];
    arr.push(aMin(a.hora));
    porRecintoDia.set(k, arr);
  }
  let huecos = 0;
  for (const mins of porRecintoDia.values()) {
    if (mins.length < 2) continue;
    const ord = [...mins].sort((x, y) => x - y);
    let paso = Infinity;
    for (let i = 1; i < ord.length; i++) paso = Math.min(paso, ord[i] - ord[i - 1]);
    if (!isFinite(paso) || paso === 0) continue;
    const span = (ord[ord.length - 1] - ord[0]) / paso + 1;
    huecos += span - ord.length;
  }
  return huecos;
}

function aMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
