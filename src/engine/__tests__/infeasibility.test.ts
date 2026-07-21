import { describe, it, expect } from "vitest";
import { solve } from "../index";
import { construirInput } from "./fixtures";

describe("infactibilidad — sin excepciones, con razon", () => {
  it("con pocos arbitros el sobrante queda sin agendar, con razon valida", () => {
    const result = solve(construirInput({ arbitros: 2 }));
    expect(result.sinAsignar.length).toBeGreaterThan(0);
    const validas = new Set([
      "recinto-saturado",
      "recinto-no-admite-genero",
      "equipo-ocupado",
      "sin-arbitros",
      "slot-bloqueado",
      "capacidad-agotada",
    ]);
    for (const s of result.sinAsignar) expect(validas.has(s.razon)).toBe(true);
  });
});
