import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fixtureCategoria,
  generarSlots,
  naiveSchedule,
  solve,
  calcularMetricas,
  type CanchaInput,
  type PartidoInput,
  type PreAsignado,
} from "@/engine";
import { DIAS, DESDE, HASTA, N_ARBITROS, BLOQUEOS } from "@/lib/torneoConfig";

/**
 * POST /api/schedule?motor=solver|naive
 * Arma el fixture de TODAS las categorias, corre el motor elegido sobre el
 * mismo input y persiste el resultado. La regla de acceso por genero ya NO
 * vive aca: es responsabilidad del engine (unica fuente de verdad).
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

  const canchasDb = await prisma.cancha.findMany({ orderBy: { nombre: "asc" } });
  const canchas: CanchaInput[] = canchasDb.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    pool: c.pool,
  }));

  // Todas las categorias de hoy son adulto (bloque uniforme). TODO: duraciones
  // mixtas (Sub14/Sub12) requieren varias grillas; fuera de alcance del Dia 1.
  const bloqueMin = Math.max(...categorias.map((c) => c.bloqueMin));
  const slots = generarSlots(bloqueMin, DIAS, DESDE, HASTA);

  const partidos: PartidoInput[] = categorias.flatMap((cat) =>
    fixtureCategoria(
      { id: cat.id, genero: cat.genero, bloqueMin: cat.bloqueMin },
      cat.equipos.map((e) => e.id),
    ),
  );
  const partidoPorId = new Map(partidos.map((p) => [p.id, p]));
  const nombrePorEquipo = new Map(
    categorias.flatMap((c) => c.equipos).map((e) => [e.id, e.nombre]),
  );

  // TODO: demo de pre-asignado por TV. Pin del primer partido de varones a una
  // cancha de club, sabado 12:30. En prod vendria del input real de FEHOCH.
  const canchaClub = canchasDb.find((c) => c.pool === "CLUB");
  const primerVarones = partidos.find((p) => p.genero === "VARONES");
  const preAsignados: PreAsignado[] =
    canchaClub && primerVarones
      ? [
          {
            partidoId: primerVarones.id,
            canchaId: canchaClub.id,
            dia: "sabado",
            hora: "12:30",
          },
        ]
      : [];

  const arbitros = Array.from({ length: N_ARBITROS }, (_, i) => `arb-${i + 1}`);
  const input = { partidos, canchas, slots, arbitros, bloqueos: BLOQUEOS, preAsignados };

  const t0 = Date.now();
  const resultado = motor === "naive" ? naiveSchedule(input) : solve(input);
  const durationMs = Date.now() - t0;
  const metricas = calcularMetricas(resultado, input);

  // Persistencia: reemplaza todos los partidos con el resultado.
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
        canchaId: a?.canchaId ?? null,
        dia: a?.dia ?? null,
        hora: a?.hora ?? null,
        arbitros: a?.arbitros ?? [],
      };
    }),
  });

  return NextResponse.json({
    motor,
    durationMs,
    metricas,
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
