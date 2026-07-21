import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fixtureCategoria,
  generarSlots,
  naiveSchedule,
  solve,
  calcularMetricas,
  type RecintoInput,
  type PartidoInput,
  type PreAsignado,
} from "@/engine";
import { DIAS, DESDE, HASTA, N_ARBITROS, BLOQUEOS } from "@/lib/torneoConfig";

/**
 * POST /api/schedule?motor=solver|naive
 * Arma el fixture de todas las categorias con LOCALIA resuelta y corre el motor
 * elegido. La regla de genero se cumple por construccion (localia); el engine
 * la valida. La route solo orquesta Prisma <-> engine (TS puro).
 */
export async function POST(req: NextRequest) {
  const motor =
    req.nextUrl.searchParams.get("motor") === "naive" ? "naive" : "solver";

  const categorias = await prisma.categoria.findMany({
    include: { equipos: { orderBy: { nombre: "asc" } } },
    orderBy: { slug: "asc" },
  });
  if (categorias.length === 0) {
    return NextResponse.json(
      { error: "No hay categorias. Corriste el seed?" },
      { status: 404 },
    );
  }

  const recintosDb = await prisma.recinto.findMany({ orderBy: { nombre: "asc" } });
  const recintos: RecintoInput[] = recintosDb.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    ciudad: r.ciudad,
    admiteVarones: r.admiteVarones,
  }));

  const bloqueMin = Math.max(...categorias.map((c) => c.bloqueMin));
  const slots = generarSlots(bloqueMin, DIAS, DESDE, HASTA);

  // Fixture con localia: cada equipo aporta su recinto local.
  const partidos: PartidoInput[] = categorias.flatMap((cat) => {
    const recintoPorEquipo: Record<string, string> = {};
    for (const e of cat.equipos) recintoPorEquipo[e.id] = e.recintoLocalId;
    return fixtureCategoria(
      { id: cat.id, genero: cat.genero, bloqueMin: cat.bloqueMin, rueda: cat.rueda },
      cat.equipos.map((e) => e.id),
      recintoPorEquipo,
    );
  });
  const partidoPorId = new Map(partidos.map((p) => [p.id, p]));
  const nombrePorEquipo = new Map(
    categorias.flatMap((c) => c.equipos).map((e) => [e.id, e.nombre]),
  );

  // TODO: demo de pin TV. Primer partido de varones a su recinto local, sabado 13:00.
  const primerVarones = partidos.find((p) => p.genero === "VARONES");
  const preAsignados: PreAsignado[] = primerVarones
    ? [
        {
          partidoId: primerVarones.id,
          recintoId: primerVarones.recintoLocalId,
          dia: "sabado",
          hora: "13:00",
        },
      ]
    : [];

  const arbitros = Array.from({ length: N_ARBITROS }, (_, i) => `arb-${i + 1}`);
  const input = { partidos, recintos, slots, arbitros, bloqueos: BLOQUEOS, preAsignados };

  const t0 = Date.now();
  const resultado = motor === "naive" ? naiveSchedule(input) : solve(input);
  const durationMs = Date.now() - t0;
  const metricas = calcularMetricas(resultado, input);

  // Persistencia.
  const asigPorId = new Map(resultado.asignaciones.map((a) => [a.partidoId, a]));
  await prisma.partido.deleteMany();
  await prisma.partido.createMany({
    data: partidos.map((p) => {
      const a = asigPorId.get(p.id);
      return {
        categoriaId: p.categoriaId,
        localId: p.localId,
        visitaId: p.visitaId,
        jornada: p.jornada,
        recintoId: a?.recintoId ?? null,
        dia: a?.dia ?? null,
        hora: a?.hora ?? null,
        arbitros: a?.arbitros ?? [],
      };
    }),
  });

  // Resumen de saturacion por recinto (para el hallazgo del dominio).
  const cargaPorRecinto = new Map<string, number>();
  for (const a of resultado.asignaciones)
    cargaPorRecinto.set(a.recintoId, (cargaPorRecinto.get(a.recintoId) ?? 0) + 1);
  const nombreRecinto = new Map(recintosDb.map((r) => [r.id, r.nombre]));

  return NextResponse.json({
    motor,
    durationMs,
    metricas,
    saturacion: [...cargaPorRecinto.entries()]
      .map(([id, n]) => ({ recinto: nombreRecinto.get(id), partidos: n }))
      .sort((a, b) => b.partidos - a.partidos),
    sinAsignar: resultado.sinAsignar.map((s) => {
      const p = partidoPorId.get(s.partidoId);
      return {
        partido: p
          ? `${nombrePorEquipo.get(p.localId)} vs ${nombrePorEquipo.get(p.visitaId)}`
          : s.partidoId,
        razon: s.razon,
        detalle: s.detalle,
      };
    }),
  });
}
