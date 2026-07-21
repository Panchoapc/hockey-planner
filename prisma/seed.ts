// Seed Dia 1: carga varias categorias reales (Varones A + Varones B + Damas
// Primera A) desde seed/torneo.seed.json. Con una sola categoria la mayoria de
// las restricciones son vacuas; con varias el solver tiene algo que resolver.
import {
  PrismaClient,
  type Genero,
  type Formato,
  type PoolCancha,
} from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

interface SeedFile {
  formatosPartido: Record<string, { bloqueMin: number }>;
  categorias: {
    id: string;
    genero: string;
    nombre: string;
    formato: string;
    poolCancha: string;
    equipos: string[];
  }[];
  canchasAcceso: {
    poolClubMixto: { canchas: number };
    poolColegioFemenino: { canchas: number };
  };
}

// Categorias que cargamos en el Dia 1 (todas formato adulto => bloque 90).
const CATEGORIAS = [
  "varones-primera-a",
  "varones-primera-b",
  "damas-primera-a",
];

/** Deriva el club quitando sufijo numerico o de una sola letra.
 *  "CCC 1" -> "CCC", "PWCC A" -> "PWCC", "U. Catolica" -> igual. */
function clubDeEquipo(nombreEquipo: string): string {
  return nombreEquipo.replace(/\s+([0-9]+|[A-Z])$/, "").trim();
}

function mapFormato(f: string): Formato {
  if (f === "sub14") return "SUB14";
  if (f === "sub12") return "SUB12";
  return "ADULTO";
}

async function main() {
  const data: SeedFile = JSON.parse(
    readFileSync(join(process.cwd(), "seed", "torneo.seed.json"), "utf-8"),
  );

  // 1) Limpieza (orden por dependencias).
  await prisma.partido.deleteMany();
  await prisma.equipo.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.club.deleteMany();
  await prisma.cancha.deleteMany();

  // 2) Canchas. TODO(PLAN §9): cantidades sin confirmar. Supuesto: 7 club + 7 colegio.
  const nClub = data.canchasAcceso.poolClubMixto.canchas;
  const nColegio = data.canchasAcceso.poolColegioFemenino.canchas;
  const canchas: { nombre: string; pool: PoolCancha }[] = [];
  for (let i = 1; i <= nClub; i++)
    canchas.push({ nombre: `Club ${i}`, pool: "CLUB" });
  for (let i = 1; i <= nColegio; i++)
    canchas.push({ nombre: `Colegio ${i}`, pool: "COLEGIO" });
  await prisma.cancha.createMany({ data: canchas });

  // 3) Clubs globales (dedupe entre categorias).
  const clubIdPorNombre = new Map<string, string>();
  const asegurarClub = async (nombre: string) => {
    if (clubIdPorNombre.has(nombre)) return clubIdPorNombre.get(nombre)!;
    const club = await prisma.club.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    clubIdPorNombre.set(nombre, club.id);
    return club.id;
  };

  // 4) Categorias + equipos.
  let totalEquipos = 0;
  for (const slug of CATEGORIAS) {
    const cat = data.categorias.find((c) => c.id === slug);
    if (!cat) throw new Error(`No se encontro la categoria ${slug}`);
    const bloqueMin = data.formatosPartido[cat.formato].bloqueMin;
    const categoria = await prisma.categoria.create({
      data: {
        slug: cat.id,
        nombre: cat.nombre,
        genero: cat.genero.toUpperCase() as Genero,
        formato: mapFormato(cat.formato),
        bloqueMin,
      },
    });
    for (const nombreEquipo of cat.equipos) {
      const clubId = await asegurarClub(clubDeEquipo(nombreEquipo));
      await prisma.equipo.create({
        data: { nombre: nombreEquipo, categoriaId: categoria.id, clubId },
      });
    }
    totalEquipos += cat.equipos.length;
  }

  console.log(
    `Seed OK: ${CATEGORIAS.length} categorias, ${totalEquipos} equipos, ` +
      `${clubIdPorNombre.size} clubs, ${canchas.length} canchas.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
