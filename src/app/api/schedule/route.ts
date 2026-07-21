import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fixtureCategoria,
  naiveSchedule,
  solveDetallado,
  calcularMetricas,
  type RecintoInput,
  type PartidoInput,
  type PreAsignado,
  type ScheduleResult,
} from "@/engine";
import { construirCalendario, N_ARBITROS } from "@/lib/torneoConfig";

/**
 * POST /api/schedule?motor=solver|naive
 * El calendario asigna cada jornada a un fin de semana; el solver optimiza
 * dentro de cada finde. La regla de genero se cumple por construccion (localia).
 */
export async function POST(req: NextRequest) {
  const motor = req.nextUrl.searchParams.get("motor") === "naive" ? "naive" : "solver";

  const categorias = await prisma.categoria.findMany({
    include: { equipos: { orderBy: { nombre: "asc" } } },
    orderBy: { slug: "asc" },
  });
  if (categorias.length === 0)
    return NextResponse.json({ error: "No hay categorias. Corriste el seed?" }, { status: 404 });

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
  const nombrePorEquipo = new Map(categorias.flatMap((c) => c.equipos).map((e) => [e.id, e.nombre]));
  const partidoPorId = new Map(partidos.map((p) => [p.id, p]));

  // TODO: pin TV de ejemplo (primer varones, su finde, 13:00).
  const primerVarones = partidos.find((p) => p.genero === "VARONES");
  const findePin = primerVarones && finesDeSemana.find((f) => f.indice === primerVarones.jornada);
  const preAsignados: PreAsignado[] =
    primerVarones && findePin
      ? [{ partidoId: primerVarones.id, recintoId: primerVarones.recintoLocalId, fecha: findePin.sabado, hora: "13:00" }]
      : [];

  const arbitros = Array.from({ length: N_ARBITROS }, (_, i) => `arb-${i + 1}`);
  const input = { partidos, recintos, finesDeSemana, horas, arbitros, bloqueos, preAsignados };

  const t0 = Date.now();
  let resultado: ScheduleResult;
  let findesStats: { indice: number; sabado: string; ms: number }[] = [];
  if (motor === "naive") {
    resultado = naiveSchedule(input);
  } else {
    const det = solveDetallado(input);
    resultado = det.result;
    findesStats = det.findes.map((f) => ({ indice: f.indice, sabado: f.sabado, ms: f.ms }));
  }
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
        fecha: a?.fecha ?? null,
        hora: a?.hora ?? null,
        arbitros: a?.arbitros ?? [],
      };
    }),
  });

  // Carga por recinto por finde (para el reporte del dominio).
  const nombreRecinto = new Map(recintosDb.map((r) => [r.id, r.nombre]));
  const findeIndice = new Map(finesDeSemana.flatMap((f) => [[f.sabado, f.indice], [f.domingo, f.indice]]));
  const cargaFinde = new Map<number, Map<string, number>>();
  for (const a of resultado.asignaciones) {
    const idx = findeIndice.get(a.fecha);
    if (idx === undefined) continue;
    const m = cargaFinde.get(idx) ?? new Map();
    const nom = nombreRecinto.get(a.recintoId) ?? a.recintoId;
    m.set(nom, (m.get(nom) ?? 0) + 1);
    cargaFinde.set(idx, m);
  }
  const findes = [...cargaFinde.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([indice, m]) => ({
      indice,
      ms: findesStats.find((s) => s.indice === indice)?.ms ?? null,
      cargaPorRecinto: Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1])),
    }));

  return NextResponse.json({
    motor,
    durationMs,
    metricas,
    findes,
    sinAsignar: resultado.sinAsignar.map((s) => {
      const p = partidoPorId.get(s.partidoId);
      return {
        partido: p ? `${nombrePorEquipo.get(p.localId)} vs ${nombrePorEquipo.get(p.visitaId)}` : s.partidoId,
        razon: s.razon,
        detalle: s.detalle,
      };
    }),
  });
}
