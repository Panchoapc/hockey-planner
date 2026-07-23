import { prisma } from "@/lib/prisma";
import { proponerAlternativas, type Asignacion } from "@/engine";
import { construirInputDesdeDB, engineId } from "@/lib/scheduling";
import { explicarAsignacion, explicarAlternativas } from "@/lib/agente";
import { Controles } from "./Controles";
import { SelectorFinde } from "./SelectorFinde";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ finde?: string; partido?: string }>;
}) {
  const sp = await searchParams;
  const findeSel = Math.max(1, parseInt(sp.finde ?? "1", 10) || 1);

  let bundle, recintos, dbPartidos;
  try {
    bundle = await construirInputDesdeDB();
    recintos = await prisma.recinto.findMany({ orderBy: [{ ciudad: "asc" }, { nombre: "asc" }] });
    dbPartidos = await prisma.partido.findMany({ include: { local: true, visita: true, categoria: true } });
  } catch {
    return (
      <Aviso titulo="Base de datos no lista">
        No se pudo conectar a Postgres. Corre <code>npm run db:push</code> y{" "}
        <code>npm run db:seed</code>, luego <b>Generar calendario</b>.
      </Aviso>
    );
  }

  const { input, nombrePorEquipo, recintoNombre } = bundle;
  const finde = input.finesDeSemana.find((f) => f.indice === findeSel) ?? input.finesDeSemana[0];

  const asignaciones: Asignacion[] = dbPartidos
    .filter((p) => p.recintoId && p.fecha && p.hora)
    .map((p) => ({
      partidoId: engineId(p),
      recintoId: p.recintoId!,
      fecha: p.fecha!,
      hora: p.hora!,
      arbitros: p.arbitros,
    }));

  const horas = input.horas;
  const porCelda = new Map(
    dbPartidos
      .filter((p) => p.recintoId && p.fecha && p.hora)
      .map((p) => [`${p.recintoId}|${p.fecha}|${p.hora}`, p]),
  );
  const asignados = dbPartidos.filter((p) => p.recintoId).length;

  let panelAlt: React.ReactNode = null;
  if (sp.partido) {
    const p = bundle.partidoPorId.get(sp.partido);
    const a = asignaciones.find((x) => x.partidoId === sp.partido);
    if (p && a) {
      const ctx = {
        local: nombrePorEquipo.get(p.localId) ?? p.localId,
        visita: nombrePorEquipo.get(p.visitaId) ?? p.visitaId,
        recintoNombre: recintoNombre.get(a.recintoId) ?? a.recintoId,
        recintoLocalId: p.recintoLocalId,
      };
      const r = proponerAlternativas(sp.partido, asignaciones, input);
      panelAlt = (
        <div className="mb-6 rounded-lg border border-brand/30 bg-tint/60 p-4 text-sm">
          <p className="font-semibold text-brand">{ctx.local} vs {ctx.visita}</p>
          <p className="mt-1 text-ink">{explicarAsignacion(a, ctx)}</p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-ink">
            {explicarAlternativas(r, ctx)}
          </pre>
        </div>
      );
    }
  }

  return (
    <main className="mx-auto max-w-[1500px] px-6 py-8">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">
          Scheduler FEHOCH · calendario del semestre
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Calendario por fin de semana</h1>
        <p className="mt-1 text-sm text-muted">
          {dbPartidos.length} partidos · {asignados} agendados · {input.finesDeSemana.length} fines de semana
        </p>
        <div className="mt-4">
          <Controles />
        </div>
      </header>

      {dbPartidos.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-soft p-6 text-sm text-muted">
          Todavia no hay calendario. Toca <b>Motor real (solver)</b> o <b>Naif</b>.
        </p>
      ) : (
        <>
          <SelectorFinde
            findes={input.finesDeSemana.map((f) => ({ indice: f.indice, sabado: f.sabado }))}
            actual={findeSel}
          />
          {panelAlt}
          {finde &&
            [finde.sabado, finde.domingo].map((fecha) => (
              <Grilla key={fecha} fecha={fecha} horas={horas} recintos={recintos} porCelda={porCelda} finde={findeSel} />
            ))}
        </>
      )}
    </main>
  );
}

function Grilla({
  fecha,
  horas,
  recintos,
  porCelda,
  finde,
}: {
  fecha: string;
  horas: string[];
  recintos: { id: string; nombre: string; ciudad: string }[];
  porCelda: Map<string, { recintoId: string | null; jornada: number; categoriaId: string; localId: string; visitaId: string; local: { nombre: string; recintoLocalId: string }; visita: { nombre: string }; categoria: { genero: string; nombre: string } }>;
  finde: number;
}) {
  const dia = new Date(fecha + "T00:00:00Z").getUTCDay() === 6 ? "sabado" : "domingo";
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-sm font-semibold text-ink">
        <span className="capitalize">{dia}</span> <span className="text-muted">{fecha}</span>
      </h2>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-tint">
              <th className="sticky left-0 z-10 border-b border-r border-line bg-tint px-3 py-2 text-left font-semibold text-ink">Recinto</th>
              {horas.map((h) => (
                <th key={h} className="border-b border-l border-line px-2 py-2 text-center font-medium text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recintos.map((r) => (
              <tr key={r.id} className="even:bg-tint/40">
                <td className="sticky left-0 z-10 border-r border-line bg-surface px-3 py-1.5 whitespace-nowrap text-ink">
                  <span className="font-medium">{r.nombre}</span>
                  <span className="ml-1 text-[10px] text-muted">{r.ciudad}</span>
                </td>
                {horas.map((h) => {
                  const p = porCelda.get(`${r.id}|${fecha}|${h}`);
                  const cesion = p ? p.recintoId !== p.local.recintoLocalId : false;
                  const eid = p ? `${p.categoriaId}__${p.localId}__vs__${p.visitaId}__j${p.jornada}` : "";
                  return (
                    <td key={h} className="border-l border-t border-line/60 px-1.5 py-1 text-center align-middle">
                      {p ? (
                        <a
                          href={`/?finde=${finde}&partido=${encodeURIComponent(eid)}`}
                          title={`${p.categoria.nombre}${cesion ? " · cesion" : ""} — ver alternativas`}
                          className={`inline-block rounded px-1.5 py-0.5 font-medium hover:underline ${p.categoria.genero === "VARONES" ? "bg-varones text-varones-ink" : "bg-damas text-damas-ink"} ${cesion ? "ring-1 ring-warm" : ""}`}
                        >
                          {p.local.nombre}<span className="opacity-50"> v </span>{p.visita.nombre}
                          {cesion && <span className="text-warm"> ⇄</span>}
                        </a>
                      ) : (
                        <span className="text-line-soft">·</span>
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
      <h1 className="text-xl font-bold text-ink">{titulo}</h1>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </main>
  );
}
