"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Metricas {
  total: number;
  asignados: number;
  sinAsignar: number;
  violacionesDurasTotal: number;
  duras: {
    choquesCancha: number;
    choquesEquipo: number;
    choquesArbitro: number;
    partidosSinDosArbitros: number;
    violacionGenero: number;
    enSlotBloqueado: number;
    fueraDeGrilla: number;
  };
  blandas: { pctHorasLindas: number; equidadSpread: number; huecos: number };
}
interface Respuesta {
  motor: string;
  durationMs: number;
  metricas: Metricas;
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
        <button
          onClick={() => correr("solver")}
          disabled={cargando !== null}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {cargando === "solver" ? "Resolviendo..." : "Motor real (solver)"}
        </button>
        <button
          onClick={() => correr("naive")}
          disabled={cargando !== null}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {cargando === "naive" ? "Corriendo..." : "Naif (el antes)"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
      {res && <Panel res={res} />}
    </div>
  );
}

function Panel({ res }: { res: Respuesta }) {
  const m = res.metricas;
  const ok = m.violacionesDurasTotal === 0;
  return (
    <div className="mt-4 rounded-lg border border-gray-200 p-4 text-sm">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            res.motor === "solver"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {res.motor === "solver" ? "SOLVER" : "NAIF"}
        </span>
        <span className="text-gray-500">
          {m.asignados}/{m.total} agendados · {res.durationMs} ms
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
        <Metrica
          etiqueta="Violaciones duras"
          valor={m.violacionesDurasTotal}
          bueno={ok}
          malo={!ok}
        />
        <Metrica etiqueta="% horas lindas" valor={`${m.blandas.pctHorasLindas}%`} />
        <Metrica etiqueta="Equidad (spread)" valor={m.blandas.equidadSpread} />
        <Metrica etiqueta="Huecos de cancha" valor={m.blandas.huecos} />
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-gray-500">
          Desglose de restricciones duras
        </summary>
        <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-gray-600 sm:grid-cols-3">
          <li>Choques de cancha: {m.duras.choquesCancha}</li>
          <li>Equipo 2 veces a la vez: {m.duras.choquesEquipo}</li>
          <li>Arbitro 2 veces a la vez: {m.duras.choquesArbitro}</li>
          <li>Partidos sin 2 arbitros: {m.duras.partidosSinDosArbitros}</li>
          <li>Varones en colegio: {m.duras.violacionGenero}</li>
          <li>En slot bloqueado: {m.duras.enSlotBloqueado}</li>
        </ul>
      </details>

      {res.sinAsignar.length > 0 && (
        <details className="mt-2" open>
          <summary className="cursor-pointer text-xs font-medium text-red-600">
            {res.sinAsignar.length} sin agendar (por que)
          </summary>
          <ul className="mt-2 space-y-0.5 text-xs text-gray-600">
            {res.sinAsignar.slice(0, 10).map((s, i) => (
              <li key={i}>
                {s.partido} — <b>{s.razon}</b>
                {s.detalle ? `: ${s.detalle}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Metrica({
  etiqueta,
  valor,
  bueno,
  malo,
}: {
  etiqueta: string;
  valor: string | number;
  bueno?: boolean;
  malo?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500">{etiqueta}</div>
      <div
        className={`text-lg font-semibold ${
          malo ? "text-red-600" : bueno ? "text-emerald-600" : "text-gray-800"
        }`}
      >
        {valor}
      </div>
    </div>
  );
}
