import { describe, it, expect } from "vitest";
import { solve, solveDetallado, naiveSchedule, calcularMetricas, generarFixture } from "../index";
import { construirInput } from "./fixtures";

describe("solver de temporada a ESCALA (3 adulto + bloque A de damas)", () => {
  const base = construirInput();
  const varones = base.partidos.find((p) => p.genero === "VARONES")!;
  const finde = base.finesDeSemana.find((f) => f.indice === varones.jornada)!;
  const input = construirInput({
    preAsignados: [
      { partidoId: varones.id, recintoId: varones.recintoLocalId, fecha: finde.sabado, hora: "13:00" },
    ],
  });
  const { result, findes } = solveDetallado(input);
  const m = calcularMetricas(result, input);

  it("520 partidos (2 varones doble + damas A + 4 bloque A, todos unica)", () => {
    expect(input.partidos.length).toBe(520);
  });

  it("factibilidad: todos asignados, 0 violaciones duras", () => {
    expect(result.sinAsignar.length).toBe(0);
    expect(m.violacionesDurasTotal).toBe(0);
  });

  it("ningun recinto excede su capacidad en ningun finde", () => {
    const cap = 2 * input.horas.length;
    for (const f of findes)
      for (const n of Object.values(f.cargaPorRecinto)) expect(n).toBeLessThanOrEqual(cap);
  });

  it("respeta el pre-asignado (TV)", () => {
    const pin = result.asignaciones.find((a) => a.partidoId === varones.id)!;
    expect(pin.fecha).toBe(finde.sabado);
    expect(pin.hora).toBe("13:00");
  });
});

describe("Tarea 1 — Primera Damas A juega rueda UNICA con localia balanceada", () => {
  const input = construirInput({ categorias: ["damas-primera-a"] });

  it("8 equipos rueda unica -> 28 partidos", () => {
    expect(input.partidos.length).toBe(28);
  });

  it("|local - visita| <= 1 para todo equipo", () => {
    const local = new Map<string, number>();
    const total = new Map<string, number>();
    for (const p of input.partidos) {
      local.set(p.localId, (local.get(p.localId) ?? 0) + 1);
      total.set(p.localId, (total.get(p.localId) ?? 0) + 1);
      total.set(p.visitaId, (total.get(p.visitaId) ?? 0) + 1);
    }
    for (const [t, tot] of total) {
      const loc = local.get(t) ?? 0;
      expect(Math.abs(loc - (tot - loc))).toBeLessThanOrEqual(1);
    }
  });
});

describe("solver vs naive — contraste de la demo", () => {
  const input = construirInput();
  const solverM = calcularMetricas(solve(input), input);
  const naiveM = calcularMetricas(naiveSchedule(input), input);
  it("el naive viola duras (recinto ajeno / genero)", () => {
    expect(naiveM.violacionesDurasTotal).toBeGreaterThan(0);
  });
  it("el solver no viola ninguna", () => {
    expect(solverM.violacionesDurasTotal).toBe(0);
  });
});
