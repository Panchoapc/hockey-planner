import { describe, it, expect } from "vitest";
import { generarFixture } from "../index";

const eq = (n: number) =>
  Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));

describe("round-robin — rueda unica", () => {
  const fixture = generarFixture(eq(8), "UNICA");

  it("8 equipos -> 28 partidos, 7 jornadas, sin pares repetidos", () => {
    expect(fixture.length).toBe(28);
    expect(new Set(fixture.map((p) => p.jornada)).size).toBe(7);
    expect(
      new Set(fixture.map((p) => [p.localId, p.visitaId].sort().join("|"))).size,
    ).toBe(28);
  });

  it("cada jornada cubre los 8 equipos una vez", () => {
    for (let j = 1; j <= 7; j++) {
      const eqs = fixture
        .filter((p) => p.jornada === j)
        .flatMap((p) => [p.localId, p.visitaId]);
      expect(new Set(eqs).size).toBe(8);
    }
  });

  it("localia balanceada: |local - visita| <= 1 para todo equipo (bug j%2)", () => {
    for (const n of [8, 9, 14]) {
      const f = generarFixture(eq(n), "UNICA");
      const local = new Map<string, number>();
      const total = new Map<string, number>();
      for (const p of f) {
        local.set(p.localId, (local.get(p.localId) ?? 0) + 1);
        total.set(p.localId, (total.get(p.localId) ?? 0) + 1);
        total.set(p.visitaId, (total.get(p.visitaId) ?? 0) + 1);
      }
      for (const [team, tot] of total) {
        const loc = local.get(team) ?? 0;
        const vis = tot - loc;
        expect(Math.abs(loc - vis)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("round-robin — doble rueda", () => {
  it("localia espejada: cada equipo de un par es local exactamente una vez", () => {
    const f = generarFixture(eq(8), "DOBLE");
    expect(f.length).toBe(56); // 8*7
    const localCount = new Map<string, number>();
    for (const p of f) {
      const par = [p.localId, p.visitaId].sort().join("|");
      localCount.set(`${par}#${p.localId}`, (localCount.get(`${par}#${p.localId}`) ?? 0) + 1);
    }
    for (const c of localCount.values()) expect(c).toBe(1);
  });

  it("cada equipo: 7 de local y 7 de visita (balance estructural)", () => {
    const f = generarFixture(eq(8), "DOBLE");
    const local = new Map<string, number>();
    const visita = new Map<string, number>();
    for (const p of f) {
      local.set(p.localId, (local.get(p.localId) ?? 0) + 1);
      visita.set(p.visitaId, (visita.get(p.visitaId) ?? 0) + 1);
    }
    for (const t of eq(8)) {
      expect(local.get(t)).toBe(7);
      expect(visita.get(t)).toBe(7);
    }
  });
});
