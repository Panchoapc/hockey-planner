"use client";

import { useRouter } from "next/navigation";

export function SelectorFinde({
  findes,
  actual,
}: {
  findes: { indice: number; sabado: string }[];
  actual: number;
}) {
  const router = useRouter();
  return (
    <div className="mb-5 flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700">Fin de semana:</label>
      <select
        value={actual}
        onChange={(e) => router.push(`/?finde=${e.target.value}`)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
      >
        {findes.map((f) => (
          <option key={f.indice} value={f.indice}>
            #{f.indice} — {f.sabado}
          </option>
        ))}
      </select>
      <span className="text-xs text-gray-400">de {findes.length}</span>
    </div>
  );
}
