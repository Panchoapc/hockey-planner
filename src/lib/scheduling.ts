// Construccion del SolverInput desde la DB (compartido por API y UI).
import { prisma } from "@/lib/prisma";
import { fixtureCategoria, type PartidoInput, type RecintoInput, type SolverInput } from "@/engine";
import { construirCalendario, N_ARBITROS } from "@/lib/torneoConfig";

export interface InputBundle {
  input: SolverInput;
  partidoPorId: Map<string, PartidoInput>;
  nombrePorEquipo: Map<string, string>;
  recintoNombre: Map<string, string>;
}

/** Reconstruye el engine-id de un partido a partir de sus campos (mismo formato
 *  que fixtureCategoria: `${categoriaId}__${localId}__vs__${visitaId}__j${j}`). */
export function engineId(p: {
  categoriaId: string;
  localId: string;
  visitaId: string;
  jornada: number;
}): string {
  return `${p.categoriaId}__${p.localId}__vs__${p.visitaId}__j${p.jornada}`;
}

export async function construirInputDesdeDB(): Promise<InputBundle> {
  const categorias = await prisma.categoria.findMany({
    include: { equipos: { orderBy: { nombre: "asc" } } },
    orderBy: { slug: "asc" },
  });
  const recintosDb = await prisma.recinto.findMany({ orderBy: { nombre: "asc" } });
  const recintos: RecintoInput[] = recintosDb.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    ciudad: r.ciudad,
    admiteVarones: r.admiteVarones,
  }));
  const { finesDeSemana, horas, bloqueos } = construirCalendario();

  const partidos: PartidoInput[] = categorias.flatMap((cat) => {
    const recintoPorEquipo: Record<string, string> = {};
    for (const e of cat.equipos) recintoPorEquipo[e.id] = e.recintoLocalId;
    return fixtureCategoria(
      { id: cat.id, genero: cat.genero, bloqueMin: cat.bloqueMin, rueda: cat.rueda },
      cat.equipos.map((e) => e.id),
      recintoPorEquipo,
    );
  });

  const arbitros = Array.from({ length: N_ARBITROS }, (_, i) => `arb-${i + 1}`);
  const input: SolverInput = { partidos, recintos, finesDeSemana, horas, arbitros, bloqueos, preAsignados: [] };

  return {
    input,
    partidoPorId: new Map(partidos.map((p) => [p.id, p])),
    nombrePorEquipo: new Map(categorias.flatMap((c) => c.equipos).map((e) => [e.id, e.nombre])),
    recintoNombre: new Map(recintosDb.map((r) => [r.id, r.nombre])),
  };
}
