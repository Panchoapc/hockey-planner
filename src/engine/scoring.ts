import type { Asignacion, PartidoInput } from "./types";

// ---------------------------------------------------------------------------
// Restricciones BLANDAS -> funcion de puntaje (mayor = mejor).
// Prioridad (PLAN §5): 1) horas lindas  2) equidad  3) sabado+intercalar
// generos  4) minimizar huecos de cancha. Los pesos codifican ese orden
// (lexicografico-ish): primero se maximizan las horas lindas, y entre opciones
// equivalentes se rompe el empate por equidad, luego intercalado, luego huecos.
// TODO: pesos tuneables; los valores exactos no son datos del dominio.
// ---------------------------------------------------------------------------

const W_NICE = 1000;
const W_EQUIDAD = 500;
const W_SABADO = 100;
const W_INTERCALADO = 300;
const W_HUECOS = 10;

/** Slots indeseables: 08:00 (temprano) y >=17:00 (tarde).
 *  TODO(PLAN §5 menciona 18-19h): en la grilla de 90min desde 08:00 el ultimo
 *  slot es 17:00; no existe 18-19h. Indeseable = 08:00 o >=17:00. */
export function esIndeseable(hora: string): boolean {
  return hora === "08:00" || aMin(hora) >= aMin("17:00");
}

/** Desirabilidad de una hora (soft-1). Prime (mediodia) > hombro > indeseable.
 *  Regla :00/:30 > :15/:45: en esta grilla todo cae en :00/:30 (siempre ok). */
export function horaDesirabilidad(hora: string): number {
  const redonda = hora.endsWith(":00") || hora.endsWith(":30");
  if (!redonda) return 0; // horas cuarto (:15/:45): peores. No ocurren hoy.
  if (esIndeseable(hora)) return 1;
  const t = aMin(hora);
  const prime = t >= aMin("11:00") && t <= aMin("15:30");
  return prime ? 4 : 2;
}

/** Puntaje blando total de un conjunto de asignaciones. */
export function puntajeTotal(
  asignaciones: Asignacion[],
  partidoPorId: Map<string, PartidoInput>,
): number {
  if (asignaciones.length === 0) return 0;

  // soft-1: horas lindas.
  const nice = asignaciones.reduce((s, a) => s + horaDesirabilidad(a.hora), 0);

  // soft-2: equidad -> repartir slots indeseables entre equipos (min sum of
  // squares de "slots indeseables por equipo" => convexo, los distribuye).
  const indeseablesPorEquipo = new Map<string, number>();
  for (const a of asignaciones) {
    if (!esIndeseable(a.hora)) continue;
    const p = partidoPorId.get(a.partidoId);
    if (!p) continue;
    for (const eq of [p.localId, p.visitaId]) {
      indeseablesPorEquipo.set(eq, (indeseablesPorEquipo.get(eq) ?? 0) + 1);
    }
  }
  let equidadSq = 0;
  for (const n of indeseablesPorEquipo.values()) equidadSq += n * n;

  // soft-3: preferir sabado, pero INTERCALANDO generos (no todos-varones-sabado
  // / todas-damas-domingo). satBonus premia sabado; intercalado penaliza que un
  // genero quede segregado en un dia.
  const satBonus = asignaciones.filter((a) => a.dia === "sabado").length;
  const fracSab = (genero: "VARONES" | "DAMAS") => {
    const del = asignaciones.filter(
      (a) => partidoPorId.get(a.partidoId)?.genero === genero,
    );
    if (del.length === 0) return 0;
    return del.filter((a) => a.dia === "sabado").length / del.length;
  };
  const intercalado = Math.abs(fracSab("VARONES") - fracSab("DAMAS")); // 0..1

  // soft-4: minimizar huecos muertos de cancha (slots vacios entre el primero
  // y el ultimo partido de una cancha en un dia).
  const huecos = contarHuecos(asignaciones);

  return (
    W_NICE * nice -
    W_EQUIDAD * equidadSq +
    W_SABADO * satBonus -
    W_INTERCALADO * intercalado * asignaciones.length -
    W_HUECOS * huecos
  );
}

/** Huecos = slots vacios entre el primer y ultimo partido de cada (cancha,dia). */
export function contarHuecos(asignaciones: Asignacion[]): number {
  const porCanchaDia = new Map<string, number[]>();
  for (const a of asignaciones) {
    const k = `${a.canchaId}|${a.dia}`;
    const arr = porCanchaDia.get(k) ?? [];
    arr.push(aMin(a.hora));
    porCanchaDia.set(k, arr);
  }
  let huecos = 0;
  for (const mins of porCanchaDia.values()) {
    if (mins.length < 2) continue;
    const ord = [...mins].sort((x, y) => x - y);
    // Paso minimo entre slots consecutivos observados (tamano de bloque).
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
