"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Metricas {
  total: number;
  asignados: number;
  sinAsignar: number;
  violacionesDurasTotal: number;
  duras: {
    choquesRecinto: number;
    choquesEquipo: number;
    choquesArbitro: number;
    partidosSinDosArbitros: number;
    violacionGenero: number;
    recintoAjeno: number;
    enSlotBloqueado: number;
    fueraDeGrilla: number;
  };
  blandas: { pctHorasLindas: number; equidadSpread: number; cesiones: number; huecos: number; pctSabado: number };
}
interface Respuesta {
  motor: string;
  durationMs: number;
  metricas: Metricas;
  findes: { indice: number; ms: number | null; cargaPorRecinto: Record<string, number> }[];
  sinAsignar: { partido: string; razon: string; detalle?: string }[];
}

export function Controles() {
  const router = useRouter();
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<Respuesta | null>(null);

  async function correr(motor: "solver" | "naive") {
    setCargando(motor);
    setError(null);
    try {
      const r = await fetch(`/api/schedule?motor=${motor}`, { method: "POST" });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        throw new Error(b.error ?? `HTTP ${r.status}`);
      }
      setRes(await r.json());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => correr("solver")} disabled={cargando !== null}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
          {cargando === "solver" ? "Resolviendo..." : "Motor real (solver)"}
        </button>
        <button onClick={() => correr("naive")} disabled={cargando !== null}
          className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-tint disabled:opacity-50">
          {cargando === "naive" ? "Corriendo..." : "Naif (el antes)"}
        </button>
        {error && <span className="text-sm text-warm">{error}</span>}
      </div>
      {res && <Panel res={res} />}
    </div>
  );
}

function Panel({ res }: { res: Respuesta }) {
  const m = res.metricas;
  const ok = m.violacionesDurasTotal === 0;
  const peorCarga = res.findes.length ? Math.max(...res.findes.flatMap((f) => Object.values(f.cargaPorRecinto))) : 0;
  const peorMs = res.findes.length ? Math.max(...res.findes.map((f) => f.ms ?? 0)) : null;
  return (
    <div className="mt-4 rounded-lg border border-line bg-surface p-4 text-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${res.motor === "solver" ? "bg-tint text-brand" : "bg-damas text-damas-ink"}`}>
          {res.motor === "solver" ? "SOLVER" : "NAIF"}
        </span>
        <span className="text-muted">
          {m.asignados}/{m.total} agendados · {m.sinAsignar} sin cupo · {res.findes.length} findes · {res.durationMs} ms
          {peorMs !== null && ` (peor finde ${peorMs} ms)`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-5">
        <Metrica etiqueta="Violaciones duras" valor={m.violacionesDurasTotal} bueno={ok} malo={!ok} />
        <Metrica etiqueta="% horas lindas" valor={`${m.blandas.pctHorasLindas}%`} />
        <Metrica etiqueta="Cesiones" valor={m.blandas.cesiones} />
        <Metrica etiqueta="% sabado" valor={`${m.blandas.pctSabado}%`} />
        <Metrica etiqueta="Peor carga/finde" valor={peorCarga} />
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted">Desglose de restricciones duras</summary>
        <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-muted sm:grid-cols-3">
          <li>Choques de recinto: {m.duras.choquesRecinto}</li>
          <li>Equipo 2 veces a la vez: {m.duras.choquesEquipo}</li>
          <li>Arbitro 2 veces a la vez: {m.duras.choquesArbitro}</li>
          <li>Recinto ajeno: {m.duras.recintoAjeno}</li>
          <li>Varones en recinto no apto: {m.duras.violacionGenero}</li>
          <li>En slot bloqueado: {m.duras.enSlotBloqueado}</li>
        </ul>
      </details>

      {res.sinAsignar.length > 0 && (
        <details className="mt-2" open>
          <summary className="cursor-pointer text-xs font-medium text-warm">{res.sinAsignar.length} sin cupo (por que)</summary>
          <ul className="mt-2 space-y-0.5 text-xs text-muted">
            {res.sinAsignar.slice(0, 12).map((s, i) => (
              <li key={i}>{s.partido} — <b className="text-ink">{s.razon}</b>{s.detalle ? `: ${s.detalle}` : ""}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Metrica({ etiqueta, valor, bueno, malo }: { etiqueta: string; valor: string | number; bueno?: boolean; malo?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted">{etiqueta}</div>
      <div className={`text-lg font-semibold ${malo ? "text-warm" : bueno ? "text-brand" : "text-ink"}`}>{valor}</div>
    </div>
  );
}
