import { describe, it, expect } from "vitest";
import { solve } from "../index";
import { construirInput } from "./fixtures";

describe("infactibilidad — sin excepciones, con razon", () => {
  it("con 1 solo arbitro nada se agenda (cada partido necesita 2), con razon", () => {
    const result = solve(construirInput({ arbitros: 1 }));
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
