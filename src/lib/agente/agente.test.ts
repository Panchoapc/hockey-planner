import { describe, it, expect } from "vitest";
import { parsearPreferencia, explicarAsignacion, explicarAlternativas } from "./index";
import type { Asignacion, ResultadoAlternativas } from "../../engine";

describe("parser NL -> restricciones", () => {
  it("'no podemos antes de las 11 el sabado'", () => {
    expect(parsearPreferencia("No podemos antes de las 11 el sábado")).toEqual([
      { tipo: "no-antes", dia: "sabado", hora: "11:00" },
    ]);
  });
  it("'preferimos jugar el domingo'", () => {
    expect(parsearPreferencia("Preferimos jugar el domingo")).toEqual([
      { tipo: "prefiere-dia", dia: "domingo" },
    ]);
  });
  it("'no el sabado por la mañana' -> evita-dia", () => {
    expect(parsearPreferencia("No el sábado por la mañana")).toEqual([
      { tipo: "evita-dia", dia: "sabado" },
    ]);
  });
  it("texto que no entiende -> no-entiendo (no inventa)", () => {
    expect(parsearPreferencia("xyz abc")[0].tipo).toBe("no-entiendo");
  });
});

describe("explicador (sobre datos reales, no inventa)", () => {
  const ctx = {
    local: "S. Frances 1",
    visita: "U. Catolica",
    recintoNombre: "Sport Frances",
    recintoLocalId: "Sport Frances",
  };
  it("explica una asignacion usando sus datos reales", () => {
    const a: Asignacion = {
      partidoId: "x",
      recintoId: "Sport Frances",
      fecha: "2026-08-01",
      hora: "13:00",
      arbitros: ["a1", "a2"],
    };
    const s = explicarAsignacion(a, ctx);
    expect(s).toContain("S. Frances 1");
    expect(s).toContain("2026-08-01");
    expect(s).toContain("13:00");
    expect(s).toContain("localia");
    expect(s).toContain("mediodia");
  });
  it("marca la cesion de localia cuando corresponde", () => {
    const a: Asignacion = {
      partidoId: "x",
      recintoId: "U. Catolica",
      fecha: "2026-08-02",
      hora: "10:00",
      arbitros: ["a1", "a2"],
    };
    expect(explicarAsignacion(a, ctx)).toContain("cediendo localia");
  });
  it("sin alternativas -> menciona recuperacion (el problema del martes)", () => {
    const r: ResultadoAlternativas = {
      partidoId: "x",
      actual: null,
      alternativas: [],
      sinAlternativas: true,
      razon: "recinto-saturado",
      detalle: "recinto sin cupo",
    };
    expect(explicarAlternativas(r, ctx)).toContain("recuperacion");
  });
});
