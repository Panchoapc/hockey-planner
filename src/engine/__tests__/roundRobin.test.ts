import { describe, it, expect } from "vitest";
import { generarFixture } from "../index";

describe("round-robin", () => {
  const equipos = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const fixture = generarFixture(equipos);

  it("8 equipos -> 28 partidos en 7 jornadas", () => {
    expect(fixture.length).toBe(28);
    expect(new Set(fixture.map((p) => p.jornada)).size).toBe(7);
  });

  it("sin pares repetidos (cada enfrentamiento una vez)", () => {
    const pares = new Set(
      fixture.map((p) => [p.localId, p.visitaId].sort().join("|")),
    );
    expect(pares.size).toBe(28);
  });

  it("cada equipo juega 7 partidos", () => {
    const cuenta: Record<string, number> = {};
    for (const p of fixture) {
      cuenta[p.localId] = (cuenta[p.localId] ?? 0) + 1;
      cuenta[p.visitaId] = (cuenta[p.visitaId] ?? 0) + 1;
    }
    for (const e of equipos) expect(cuenta[e]).toBe(7);
  });

  it("cada jornada cubre los 8 equipos exactamente una vez", () => {
    for (let j = 1; j <= 7; j++) {
      const delJornada = fixture.filter((p) => p.jornada === j);
      const equiposJ = delJornada.flatMap((p) => [p.localId, p.visitaId]);
      expect(equiposJ.length).toBe(8);
      expect(new Set(equiposJ).size).toBe(8);
    }
  });
});
