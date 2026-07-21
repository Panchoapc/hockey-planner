import type { Enfrentamiento, Genero, PartidoInput, Rueda } from "./types";

interface Par {
  a: string;
  b: string;
  jornada: number;
}

/** Pares del round-robin (metodo del circulo), sin orientar localia. */
function pares(equipoIds: string[]): Par[] {
  const ids = [...equipoIds];
  if (ids.length < 2) return [];
  const bye = "__BYE__";
  if (ids.length % 2 !== 0) ids.push(bye);

  const n = ids.length;
  const mitad = n / 2;
  const out: Par[] = [];
  let ronda = [...ids];
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < mitad; i++) {
      const a = ronda[i];
      const b = ronda[n - 1 - i];
      if (a !== bye && b !== bye) out.push({ a, b, jornada: j + 1 });
    }
    ronda = [ronda[0], ronda[n - 1], ...ronda.slice(1, n - 1)];
  }
  return out;
}

const ef = (localId: string, visitaId: string, jornada: number): Enfrentamiento => ({
  id: `${localId}__vs__${visitaId}__j${jornada}`,
  localId,
  visitaId,
  jornada,
});

/**
 * Orienta la localia de una rueda unica para cumplir |local - visita| <= 1
 * por equipo. Greedy por diferencial (recibe quien va mas "debiendo" localia)
 * + repair por hill-climbing sobre la suma de desvios^2 respecto del ideal.
 * (Corrige la alternancia j%2, que dejaba desbalances de hasta 3.)
 */
function orientarUnica(ps: Par[], equipoIds: string[]): Enfrentamiento[] {
  const homes = new Map<string, number>();
  const aways = new Map<string, number>();
  const h = (t: string) => homes.get(t) ?? 0;
  const w = (t: string) => aways.get(t) ?? 0;

  const orient = ps.map((p) => {
    const local = h(p.a) - w(p.a) <= h(p.b) - w(p.b) ? p.a : p.b;
    const visita = local === p.a ? p.b : p.a;
    homes.set(local, h(local) + 1);
    aways.set(visita, w(visita) + 1);
    return { local, visita, jornada: p.jornada };
  });

  const ideal = (equipoIds.length - 1) / 2;
  const costo = () => {
    let c = 0;
    for (const t of equipoIds) c += (h(t) - ideal) ** 2;
    return c;
  };
  const flip = (i: number) => {
    const m = orient[i];
    homes.set(m.local, h(m.local) - 1);
    aways.set(m.visita, w(m.visita) - 1);
    homes.set(m.visita, h(m.visita) + 1);
    aways.set(m.local, w(m.local) + 1);
    orient[i] = { local: m.visita, visita: m.local, jornada: m.jornada };
  };

  for (let iter = 0; iter < 1000; iter++) {
    let mejorI = -1;
    let mejorCosto = costo();
    for (let i = 0; i < orient.length; i++) {
      flip(i);
      const c = costo();
      flip(i); // revertir siempre; el mejor se aplica al final del barrido
      if (c < mejorCosto - 1e-9) {
        mejorCosto = c;
        mejorI = i;
      }
    }
    if (mejorI < 0) break;
    flip(mejorI);
  }

  return orient.map((m) => ef(m.local, m.visita, m.jornada));
}

/**
 * Genera el fixture con localia resuelta (localId = quien recibe).
 * DOBLE rueda: localia espejada (ida y vuelta invertidas) -> balance 7/7.
 * UNICA rueda: localia balanceada (|local - visita| <= 1).
 */
export function generarFixture(
  equipoIds: string[],
  modo: Rueda = "UNICA",
): Enfrentamiento[] {
  const ps = pares(equipoIds);
  if (ps.length === 0) return [];

  if (modo === "DOBLE") {
    const jornadasIda = new Set(ps.map((p) => p.jornada)).size;
    return ps.flatMap((p) => [
      ef(p.a, p.b, p.jornada),
      ef(p.b, p.a, p.jornada + jornadasIda),
    ]);
  }

  return orientarUnica(ps, equipoIds);
}

export interface CategoriaCtx {
  id: string;
  genero: Genero;
  bloqueMin: number;
  rueda: Rueda;
}

/** Fixture de una categoria enriquecido con localia (recinto de cada equipo). */
export function fixtureCategoria(
  cat: CategoriaCtx,
  equipoIds: string[],
  recintoPorEquipo: Record<string, string>,
): PartidoInput[] {
  return generarFixture(equipoIds, cat.rueda).map((e) => ({
    id: `${cat.id}__${e.id}`,
    categoriaId: cat.id,
    genero: cat.genero,
    bloqueMin: cat.bloqueMin,
    localId: e.localId,
    visitaId: e.visitaId,
    jornada: e.jornada,
    recintoLocalId: recintoPorEquipo[e.localId],
    recintoVisitaId: recintoPorEquipo[e.visitaId],
  }));
}
