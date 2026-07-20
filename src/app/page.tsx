import { prisma } from "@/lib/prisma";
import { generarSlots } from "@/engine";
import { GenerarButton } from "./GenerarButton";

const CATEGORIA_SLUG = "varones-primera-a";
const DIAS = ["sabado", "domingo"];
const DESDE = "08:00";
const HASTA = "19:00";

export const dynamic = "force-dynamic"; // siempre lee estado fresco de la DB

export default async function Home() {
  let categoria;
  try {
    categoria = await prisma.categoria.findUnique({
      where: { slug: CATEGORIA_SLUG },
      include: { equipos: true },
    });
  } catch {
    return (
      <Aviso titulo="Base de datos no lista">
        No se pudo conectar a Postgres. Falta correr la migracion / el seed
        (o rotar la password de Supabase). Ver el <code>.env</code> y el README.
      </Aviso>
    );
  }

  if (!categoria) {
    return (
      <Aviso titulo="Sin datos">
        La categoria <b>{CATEGORIA_SLUG}</b> no existe todavia. Corre{" "}
        <code>npm run db:seed</code> y recarga.
      </Aviso>
    );
  }

  const poolsPermitidos =
    categoria.genero === "VARONES" ? ["CLUB"] : ["CLUB", "COLEGIO"];
  const canchas = await prisma.cancha.findMany({
    where: { pool: { in: poolsPermitidos as ("CLUB" | "COLEGIO")[] } },
    orderBy: { nombre: "asc" },
  });

  const partidos = await prisma.partido.findMany({
    where: { categoriaId: categoria.id },
    include: { local: true, visita: true },
  });

  const slots = generarSlots(categoria.bloqueMin, DIAS, DESDE, HASTA);
  const horas = [...new Set(slots.map((s) => s.hora))];

  // Lookup: `${canchaId}|${dia}|${hora}` -> partido.
  const porCelda = new Map(
    partidos
      .filter((p) => p.canchaId && p.dia && p.hora)
      .map((p) => [`${p.canchaId}|${p.dia}|${p.hora}`, p]),
  );

  const asignados = partidos.filter((p) => p.canchaId).length;

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
          Scheduler FEHOCH · Dia 0 (naive)
        </p>
        <h1 className="mt-1 text-2xl font-bold">{categoria.nombre}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {categoria.equipos.length} equipos · {partidos.length} partidos ·{" "}
          {asignados} agendados · {canchas.length} canchas · bloque{" "}
          {categoria.bloqueMin} min
        </p>
        <div className="mt-4">
          <GenerarButton />
        </div>
      </header>

      {partidos.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-500">
          Todavia no hay calendario. Toca <b>Generar calendario</b>.
        </p>
      ) : (
        DIAS.map((dia) => (
          <Grilla
            key={dia}
            dia={dia}
            horas={horas}
            canchas={canchas}
            porCelda={porCelda}
          />
        ))
      )}
    </main>
  );
}

function Grilla({
  dia,
  horas,
  canchas,
  porCelda,
}: {
  dia: string;
  horas: string[];
  canchas: { id: string; nombre: string }[];
  porCelda: Map<string, { local: { nombre: string }; visita: { nombre: string } }>;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-sm font-semibold capitalize text-gray-700">
        {dia}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 border-b border-r border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold">
                Cancha
              </th>
              {horas.map((h) => (
                <th
                  key={h}
                  className="border-b border-l border-gray-200 px-3 py-2 text-center font-medium text-gray-600"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {canchas.map((c) => (
              <tr key={c.id} className="even:bg-gray-50/40">
                <td className="sticky left-0 z-10 border-r border-gray-200 bg-white px-3 py-2 font-medium whitespace-nowrap">
                  {c.nombre}
                </td>
                {horas.map((h) => {
                  const p = porCelda.get(`${c.id}|${dia}|${h}`);
                  return (
                    <td
                      key={h}
                      className="border-l border-t border-gray-100 px-2 py-1.5 text-center align-middle"
                    >
                      {p ? (
                        <span className="inline-block rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-900">
                          {p.local.nombre}
                          <span className="text-emerald-500"> vs </span>
                          {p.visita.nombre}
                        </span>
                      ) : (
                        <span className="text-gray-300">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-xl font-bold">{titulo}</h1>
      <p className="mt-2 text-sm text-gray-600">{children}</p>
    </main>
  );
}
