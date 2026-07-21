// Seed Dia 2: recintos + localia. Carga Varones A + B + Damas Primera A en
// DOBLE rueda (formato oficial). admiteVarones se DERIVA.
import {
  PrismaClient,
  type Genero,
  type Formato,
} from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  clubDeEquipo,
  recintoDeEquipo,
  recintosQueAdmitenVarones,
} from "../src/lib/localia";

const prisma = new PrismaClient();

interface SeedFile {
  formatosPartido: Record<string, { bloqueMin: number }>;
  categorias: {
    id: string;
    genero: string;
    nombre: string;
    formato: string;
    equipos: string[];
  }[];
}
interface Catalogo {
  recintos: { nombre: string; ciudad: string }[];
  clubARecinto: Record<string, string>;
}

const CATEGORIAS = ["varones-primera-a", "varones-primera-b", "damas-primera-a"];

function leer<T>(rel: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), rel), "utf-8"));
}

function mapFormato(f: string): Formato {
  if (f === "sub14") return "SUB14";
  if (f === "sub12") return "SUB12";
  return "ADULTO";
}

async function main() {
  const data = leer<SeedFile>("seed/torneo.seed.json");
  const cat = leer<Catalogo>("seed/recintos.seed.json");
  const cats = CATEGORIAS.map((slug) => {
    const c = data.categorias.find((x) => x.id === slug);
    if (!c) throw new Error(`No se encontro ${slug}`);
    return c;
  });

  // 1) Limpieza.
  await prisma.partido.deleteMany();
  await prisma.equipo.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.club.deleteMany();
  await prisma.recinto.deleteMany();

  // 2) Recintos con admiteVarones DERIVADO.
  const todosEquipos = cats.flatMap((c) =>
    c.equipos.map((nombre) => ({
      nombre,
      genero: c.genero.toUpperCase() as Genero,
    })),
  );
  const admiten = recintosQueAdmitenVarones(todosEquipos, cat.clubARecinto);
  const recintoIdPorNombre = new Map<string, string>();
  for (const r of cat.recintos) {
    const rec = await prisma.recinto.create({
      data: { nombre: r.nombre, ciudad: r.ciudad, admiteVarones: admiten.has(r.nombre) },
    });
    recintoIdPorNombre.set(r.nombre, rec.id);
  }

  // 3) Clubs (dedupe).
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

  // 4) Categorias (DOBLE rueda) + equipos con localia.
  let totalEquipos = 0;
  for (const c of cats) {
    const bloqueMin = data.formatosPartido[c.formato].bloqueMin;
    const categoria = await prisma.categoria.create({
      data: {
        slug: c.id,
        nombre: c.nombre,
        genero: c.genero.toUpperCase() as Genero,
        formato: mapFormato(c.formato),
        rueda: "DOBLE", // TODO: bloque A juvenil seria UNICA (14 equipos).
        bloqueMin,
      },
    });
    for (const nombreEquipo of c.equipos) {
      const recintoNombre = recintoDeEquipo(nombreEquipo, cat.clubARecinto);
      const recintoId = recintoIdPorNombre.get(recintoNombre)!;
      const clubId = await asegurarClub(clubDeEquipo(nombreEquipo));
      await prisma.equipo.create({
        data: { nombre: nombreEquipo, categoriaId: categoria.id, clubId, recintoLocalId: recintoId },
      });
    }
    totalEquipos += c.equipos.length;
  }

  console.log(
    `Seed OK: ${cats.length} categorias (DOBLE), ${totalEquipos} equipos, ` +
      `${cat.recintos.length} recintos (${admiten.size} admiten varones).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
