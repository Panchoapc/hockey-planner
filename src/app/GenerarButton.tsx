"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerarButton() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/schedule", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={generar}
        disabled={cargando}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {cargando ? "Generando..." : "Generar calendario"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
