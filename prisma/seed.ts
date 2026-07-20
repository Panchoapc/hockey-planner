// Seed Dia 0: carga UNA categoria real (Primera Varones A, 8 equipos) desde
// seed/torneo.seed.json. Idempotente: limpia y recarga.
import { PrismaClient, type Genero, type Formato, type PoolCancha } from "@prisma/client";
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

// La categoria que cargamos en el Dia 0.
const CATEGORIA_SLUG = "varones-primera-a";

/** Deriva el club a partir del nombre de equipo quitando el sufijo numerico.
 *  "CCC 1" -> "CCC", "Manquehue 0" -> "Manquehue", "U. Catolica" -> igual. */
function clubDeEquipo(nombreEquipo: string): string {
  return nombreEquipo.replace(/\s+\d+$/, "").trim();
}

function mapFormato(f: string): Formato {
  if (f === "sub14") return "SUB14";
  if (f === "sub12") return "SUB12";
  return "ADULTO";
}

async function main() {
  const raw = readFileSync(
    join(process.cwd(), "seed", "torneo.seed.json"),
    "utf-8",
  );
  const data: SeedFile = JSON.parse(raw);

  const cat = data.categorias.find((c) => c.id === CATEGORIA_SLUG);
  if (!cat) throw new Error(`No se encontro la categoria ${CATEGORIA_SLUG}`);

  // 1) Limpieza (orden por dependencias).
  await prisma.partido.deleteMany();
  await prisma.equipo.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.club.deleteMany();
  await prisma.cancha.deleteMany();

  // 2) Canchas. TODO(§9 PLAN): cantidades sin confirmar con Francisco.
  //    Supuesto de trabajo: 7 club (mixtas) + 7 colegio (femeninas).
  const nClub = data.canchasAcceso.poolClubMixto.canchas;
  const nColegio = data.canchasAcceso.poolColegioFemenino.canchas;
  const canchas: { nombre: string; pool: PoolCancha }[] = [];
  for (let i = 1; i <= nClub; i++) canchas.push({ nombre: `Club ${i}`, pool: "CLUB" });
  for (let i = 1; i <= nColegio; i++) canchas.push({ nombre: `Colegio ${i}`, pool: "COLEGIO" });
  await prisma.cancha.createMany({ data: canchas });

  // 3) Categoria.
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

  // 4) Clubs (derivados) + Equipos.
  const clubesUnicos = [...new Set(cat.equipos.map(clubDeEquipo))];
  const clubIdPorNombre = new Map<string, string>();
  for (const nombre of clubesUnicos) {
    const club = await prisma.club.create({ data: { nombre } });
    clubIdPorNombre.set(nombre, club.id);
  }

  for (const nombreEquipo of cat.equipos) {
    await prisma.equipo.create({
      data: {
        nombre: nombreEquipo,
        categoriaId: categoria.id,
        clubId: clubIdPorNombre.get(clubDeEquipo(nombreEquipo)) ?? null,
      },
    });
  }

  console.log(
    `Seed OK: ${cat.nombre} — ${cat.equipos.length} equipos, ` +
      `${clubesUnicos.length} clubs, ${canchas.length} canchas ` +
      `(${nClub} club + ${nColegio} colegio). bloque=${bloqueMin}min`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
