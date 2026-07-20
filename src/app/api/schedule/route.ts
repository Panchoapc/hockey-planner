import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generarFixture,
  generarSlots,
  naiveSchedule,
  type CanchaInput,
} from "@/engine";

// Categoria objetivo del Dia 0.
const CATEGORIA_SLUG = "varones-primera-a";

// Ventana del fin de semana (seed.meta.ventanaFinDeSemana).
const DIAS = ["sabado", "domingo"];
const DESDE = "08:00";
const HASTA = "19:00";

/**
 * POST /api/schedule
 * Genera el fixture (una rueda) de la categoria y lo agenda con el scheduler
 * naive, luego persiste el resultado. El engine hace el trabajo; esta route
 * solo orquesta IO (Prisma) <-> engine (TS puro).
 */
export async function POST() {
  const categoria = await prisma.categoria.findUnique({
    where: { slug: CATEGORIA_SLUG },
    include: { equipos: { orderBy: { nombre: "asc" } } },
  });

  if (!categoria) {
    return NextResponse.json(
      { error: `Categoria ${CATEGORIA_SLUG} no encontrada. Corriste el seed?` },
      { status: 404 },
    );
  }

  // Canchas accesibles segun genero: varones solo CLUB; damas CLUB + COLEGIO.
  const poolsPermitidos =
    categoria.genero === "VARONES" ? ["CLUB"] : ["CLUB", "COLEGIO"];
  const canchasDb = await prisma.cancha.findMany({
    where: { pool: { in: poolsPermitidos as ("CLUB" | "COLEGIO")[] } },
    orderBy: { nombre: "asc" },
  });
  const canchas: CanchaInput[] = canchasDb.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    pool: c.pool,
  }));

  // Engine puro: fixture -> slots -> schedule.
  const fixture = generarFixture(categoria.equipos.map((e) => e.id));
  const slots = generarSlots(categoria.bloqueMin, DIAS, DESDE, HASTA);
  const resultado = naiveSchedule(fixture, canchas, slots);

  const asignacionPorPartido = new Map(
    resultado.asignaciones.map((a) => [a.partidoId, a]),
  );

  // Persistencia: reemplaza los partidos de la categoria.
  await prisma.partido.deleteMany({ where: { categoriaId: categoria.id } });
  await prisma.partido.createMany({
    data: fixture.map((p) => {
      const a = asignacionPorPartido.get(p.id);
      return {
        categoriaId: categoria.id,
        localId: p.localId,
        visitaId: p.visitaId,
        jornada: p.jornada,
        canchaId: a?.canchaId ?? null,
        dia: a?.dia ?? null,
        hora: a?.hora ?? null,
      };
    }),
  });

  return NextResponse.json({
    categoria: categoria.nombre,
    totalPartidos: fixture.length,
    asignados: resultado.asignaciones.length,
    sinAsignar: resultado.sinAsignar.length,
    canchas: canchas.length,
    slots: slots.length,
  });
}
