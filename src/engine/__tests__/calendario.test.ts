import { describe, it, expect } from "vitest";
import { generarFinesDeSemana, generarHoras, slotsDeFinde, esSabado } from "../index";

describe("calendario", () => {
  it("genera fines de semana (sabados) e indexa jornada N -> finde N", () => {
    const f = generarFinesDeSemana("2026-08-01", 5);
    expect(f.length).toBe(5);
    expect(f.map((x) => x.indice)).toEqual([1, 2, 3, 4, 5]);
    for (const x of f) {
      expect(esSabado(x.sabado)).toBe(true);
      expect(new Date(x.domingo + "T00:00:00Z").getUTCDay()).toBe(0); // domingo
    }
  });

  it("excluye findes bloqueados (feriado que se cae entero)", () => {
    const f = generarFinesDeSemana("2026-08-01", 4, ["2026-08-08"]);
    expect(f.map((x) => x.sabado)).toEqual([
      "2026-08-01",
      "2026-08-15",
      "2026-08-22",
      "2026-08-29",
    ]);
  });

  it("la grilla de horas contiene 13:00", () => {
    expect(generarHoras(90, "08:30", "19:00")).toContain("13:00");
  });

  it("el bloqueo es por FECHA concreta, no por dia de semana", () => {
    const finde = { indice: 1, sabado: "2026-08-01", domingo: "2026-08-02" };
    const horas = generarHoras(90, "08:30", "19:00");
    const slots = slotsDeFinde(finde, horas, [{ fecha: "2026-08-01", hora: "08:30" }]);
    // El sabado 08:30 quedo bloqueado; el domingo 08:30 NO.
    expect(slots.some((s) => s.fecha === "2026-08-01" && s.hora === "08:30")).toBe(false);
    expect(slots.some((s) => s.fecha === "2026-08-02" && s.hora === "08:30")).toBe(true);
  });
});
