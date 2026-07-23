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
      <label className="text-sm font-medium text-ink">Fin de semana:</label>
      <select
        value={actual}
        onChange={(e) => router.push(`/?finde=${e.target.value}`)}
        className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink"
      >
        {findes.map((f) => (
          <option key={f.indice} value={f.indice}>
            #{f.indice} — {f.sabado}
          </option>
        ))}
      </select>
      <span className="text-xs text-muted">de {findes.length}</span>
    </div>
  );
}
