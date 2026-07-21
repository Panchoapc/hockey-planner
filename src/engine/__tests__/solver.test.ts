import { describe, it, expect } from "vitest";
import { solve, solveDetallado, naiveSchedule, calcularMetricas } from "../index";
import { construirInput } from "./fixtures";

describe("solver de temporada — el calendario restaura la factibilidad", () => {
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

  it("184 partidos (doble rueda)", () => {
    expect(input.partidos.length).toBe(184);
  });

  it("con calendario, TODOS los partidos entran (no era saturacion, era artefacto)", () => {
    expect(result.sinAsignar.length).toBe(0);
    expect(result.asignaciones.length).toBe(184);
  });

  it("CERO violaciones duras", () => {
    expect(m.violacionesDurasTotal).toBe(0);
  });

  it("cada recinto en cada finde respeta su capacidad (<= slots del finde)", () => {
    for (const f of findes) {
      const cap = 2 * input.horas.length; // sabado + domingo
      for (const n of Object.values(f.cargaPorRecinto)) expect(n).toBeLessThanOrEqual(cap);
    }
  });

  it("la peor carga de un recinto en un finde es baja (no satura)", () => {
    const peor = Math.max(...findes.flatMap((f) => Object.values(f.cargaPorRecinto)));
    expect(peor).toBeLessThanOrEqual(6);
  });

  it("respeta el pre-asignado (TV) con su fecha", () => {
    const pin = result.asignaciones.find((a) => a.partidoId === varones.id)!;
    expect(pin.recintoId).toBe(varones.recintoLocalId);
    expect(pin.fecha).toBe(finde.sabado);
    expect(pin.hora).toBe("13:00");
  });

  it("la grilla contiene las 13:00", () => {
    expect(input.horas).toContain("13:00");
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
