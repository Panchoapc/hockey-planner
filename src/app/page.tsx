import { prisma } from "@/lib/prisma";
import { generarSlots } from "@/engine";
import { DIAS, DESDE, HASTA, BLOQUEOS } from "@/lib/torneoConfig";
import { Controles } from "./Controles";

export const dynamic = "force-dynamic";

type PartidoCelda = {
  local: { nombre: string };
  visita: { nombre: string };
  categoria: { genero: string; nombre: string };
};

export default async function Home() {
  let canchas, partidos, categorias, bloqueMin;
  try {
    [canchas, categorias] = await Promise.all([
      prisma.cancha.findMany({ orderBy: { nombre: "asc" } }),
      prisma.categoria.findMany(),
    ]);
    partidos = await prisma.partido.findMany({
      include: { local: true, visita: true, categoria: true },
    });
    bloqueMin = Math.max(90, ...categorias.map((c) => c.bloqueMin));
  } catch {
    return (
      <Aviso titulo="Base de datos no lista">
        No se pudo conectar a Postgres. Corre <code>npm run db:push</code> y{" "}
        <code>npm run db:seed</code>.
      </Aviso>
    );
  }

  if (categorias.length === 0) {
    return (
      <Aviso titulo="Sin datos">
        Corre <code>npm run db:seed</code> y recarga.
      </Aviso>
    );
  }

  const slots = generarSlots(bloqueMin, DIAS, DESDE, HASTA);
  const horas = [...new Set(slots.map((s) => s.hora))];
  const bloqueados = new Set(BLOQUEOS.map((b) => `${b.dia}|${b.hora}`));

  const porCelda = new Map<string, PartidoCelda>(
    partidos
      .filter((p) => p.canchaId && p.dia && p.hora)
      .map((p) => [`${p.canchaId}|${p.dia}|${p.hora}`, p]),
  );
  const asignados = partidos.filter((p) => p.canchaId).length;

  return (
    <main className="mx-auto max-w-[1500px] px-6 py-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
          Scheduler FEHOCH · Dia 1 (solver real)
        </p>
        <h1 className="mt-1 text-2xl font-bold">Calendario del semestre</h1>
        <p className="mt-1 text-sm text-gray-600">
          {categorias.length} categorias · {partidos.length} partidos ·{" "}
          {asignados} agendados · {canchas.length} canchas
        </p>
        <div className="mt-4">
          <Controles />
        </div>
      </header>

      {partidos.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-500">
          Todavia no hay calendario. Toca <b>Motor real (solver)</b> o{" "}
          <b>Naif</b> para comparar.
        </p>
      ) : (
        DIAS.map((dia) => (
          <Grilla
            key={dia}
            dia={dia}
            horas={horas}
            canchas={canchas}
            porCelda={porCelda}
            bloqueados={bloqueados}
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
  bloqueados,
}: {
  dia: string;
  horas: string[];
  canchas: { id: string; nombre: string }[];
  porCelda: Map<string, PartidoCelda>;
  bloqueados: Set<string>;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-sm font-semibold capitalize text-gray-700">
        {dia}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 border-b border-r border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold">
                Cancha
              </th>
              {horas.map((h) => (
                <th
                  key={h}
                  className={`border-b border-l border-gray-200 px-2 py-2 text-center font-medium ${
                    bloqueados.has(`${dia}|${h}`)
                      ? "bg-gray-200 text-gray-400 line-through"
                      : "text-gray-600"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {canchas.map((c) => (
              <tr key={c.id} className="even:bg-gray-50/40">
                <td className="sticky left-0 z-10 border-r border-gray-200 bg-white px-3 py-1.5 font-medium whitespace-nowrap">
                  {c.nombre}
                </td>
                {horas.map((h) => {
                  const bloq = bloqueados.has(`${dia}|${h}`);
                  const p = porCelda.get(`${c.id}|${dia}|${h}`);
                  return (
                    <td
                      key={h}
                      className={`border-l border-t border-gray-100 px-1.5 py-1 text-center align-middle ${
                        bloq ? "bg-gray-100" : ""
                      }`}
                    >
                      {p ? (
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 font-medium ${
                            p.categoria.genero === "VARONES"
                              ? "bg-sky-100 text-sky-900"
                              : "bg-fuchsia-100 text-fuchsia-900"
                          }`}
                          title={p.categoria.nombre}
                        >
                          {p.local.nombre}
                          <span className="opacity-50"> v </span>
                          {p.visita.nombre}
                        </span>
                      ) : (
                        <span className="text-gray-300">{bloq ? "" : "·"}</span>
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

function Aviso({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-xl font-bold">{titulo}</h1>
      <p className="mt-2 text-sm text-gray-600">{children}</p>
    </main>
  );
}
