// Seed Dia 4: escala real. 3 adulto + bloque A de damas (Sub19/16/14/12-AB).
// Rueda oficial: Primera Varones A/B = DOBLE; Damas Primera + bloque A = UNICA.
// Recintos autoritativos desde torneo.seed.json (admiteVarones explicito).
// Idempotente: limpia y recarga -> mismo estado siempre.
import { PrismaClient, type Genero, type Formato, type Rueda } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { recintoDeEquipo, type MapaLocalia } from "../src/lib/localia";

const prisma = new PrismaClient();

interface Seed {
  formatosPartido: Record<string, { bloqueMin: number }>;
  categorias: { id: string; genero: string; nombre: string; formato: string; equipos: string[] }[];
  recintos: { id: string; nombre: string; ciudad: string; admiteVarones: boolean }[];
}

const CATEGORIAS = [
  "varones-primera-a",
  "varones-primera-b",
  "damas-primera-a",
  "damas-sub19-a",
  "damas-sub16-a",
  "damas-sub14-a",
  "damas-sub12-ab",
];
const DOBLE = new Set(["varones-primera-a", "varones-primera-b"]);

function leer<T>(rel: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), rel), "utf-8"));
}
function mapFormato(f: string): Formato {
  if (f === "sub14") return "SUB14";
  if (f === "sub12") return "SUB12";
  return "ADULTO";
}

async function main() {
  const data = leer<Seed>("seed/torneo.seed.json");
  const mapa = leer<MapaLocalia>("seed/recintos.seed.json");
  const cats = CATEGORIAS.map((slug) => {
    const c = data.categorias.find((x) => x.id === slug);
    if (!c) throw new Error(`No se encontro ${slug}`);
    return c;
  });

  // 1) Limpieza (orden por dependencias) -> idempotente.
  await prisma.partido.deleteMany();
  await prisma.equipo.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.club.deleteMany();
  await prisma.recinto.deleteMany();

  // 2) Recintos (fuente autoritativa: torneo.seed.json).
  const recintoIdPorSlug = new Map<string, string>();
  for (const r of data.recintos) {
    const rec = await prisma.recinto.create({
      data: { nombre: r.nombre, ciudad: r.ciudad, admiteVarones: r.admiteVarones },
    });
    recintoIdPorSlug.set(r.id, rec.id);
  }

  // 3) Clubs (dedupe) — meramente informativo.
  const clubIdPorNombre = new Map<string, string>();
  const asegurarClub = async (nombre: string) => {
    if (clubIdPorNombre.has(nombre)) return clubIdPorNombre.get(nombre)!;
    const club = await prisma.club.upsert({ where: { nombre }, update: {}, create: { nombre } });
    clubIdPorNombre.set(nombre, club.id);
    return club.id;
  };

  // 4) Categorias + equipos con localia.
  let totalEquipos = 0;
  for (const c of cats) {
    const bloqueMin = data.formatosPartido[c.formato].bloqueMin;
    const categoria = await prisma.categoria.create({
      data: {
        slug: c.id,
        nombre: c.nombre,
        genero: c.genero.toUpperCase() as Genero,
        formato: mapFormato(c.formato),
        rueda: (DOBLE.has(c.id) ? "DOBLE" : "UNICA") as Rueda,
        bloqueMin, // TODO: Sub14/Sub12 (75/70) corren en grilla uniforme de 90.
      },
    });
    for (const nombreEquipo of c.equipos) {
      const recintoSlug = recintoDeEquipo(nombreEquipo, mapa);
      const recintoLocalId = recintoIdPorSlug.get(recintoSlug)!;
      const clubId = await asegurarClub(recintoSlug); // agrupacion simple por recinto
      await prisma.equipo.create({
        data: { nombre: nombreEquipo, categoriaId: categoria.id, clubId, recintoLocalId },
      });
    }
    totalEquipos += c.equipos.length;
  }

  console.log(`Seed OK: ${cats.length} categorias, ${totalEquipos} equipos, ${data.recintos.length} recintos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
