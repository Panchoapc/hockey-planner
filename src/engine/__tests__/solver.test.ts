import { describe, it, expect } from "vitest";
import { solve, naiveSchedule, calcularMetricas } from "../index";
import { construirInput } from "./fixtures";

describe("solver — invariantes duras (garantizadas al 100%)", () => {
  // Input realista: 3 categorias (92 partidos), 1 slot bloqueado, 1 pin TV.
  const base = construirInput();
  const preAsignados = [
    {
      partidoId: base.partidos[0].id,
      canchaId: "club-1",
      dia: "sabado",
      hora: "12:30",
    },
  ];
  const input = construirInput({
    bloqueos: [{ dia: "domingo", hora: "08:00" }],
    preAsignados,
  });
  const result = solve(input);
  const m = calcularMetricas(result, input);

  it("92 partidos (28 + 36 + 28)", () => {
    expect(input.partidos.length).toBe(92);
  });

  it("todos los partidos quedan asignados", () => {
    expect(result.sinAsignar.length).toBe(0);
    expect(result.asignaciones.length).toBe(92);
  });

  it("CERO violaciones duras", () => {
    expect(m.violacionesDurasTotal).toBe(0);
  });

  it("nunca dos partidos en la misma cancha/slot", () => {
    expect(m.duras.choquesCancha).toBe(0);
  });

  it("ningun equipo en dos partidos simultaneos", () => {
    expect(m.duras.choquesEquipo).toBe(0);
  });

  it("ningun arbitro en dos partidos simultaneos; todos con 2 arbitros", () => {
    expect(m.duras.choquesArbitro).toBe(0);
    expect(m.duras.partidosSinDosArbitros).toBe(0);
    expect(result.asignaciones.every((a) => a.arbitros.length === 2)).toBe(true);
  });

  it("ningun partido de varones en cancha COLEGIO", () => {
    expect(m.duras.violacionGenero).toBe(0);
  });

  it("ningun partido en fecha/hora bloqueada", () => {
    expect(m.duras.enSlotBloqueado).toBe(0);
  });

  it("todo partido cae dentro de la grilla (ventana + bloque)", () => {
    expect(m.duras.fueraDeGrilla).toBe(0);
  });

  it("respeta el partido pre-asignado (TV): no lo mueve", () => {
    const pin = result.asignaciones.find(
      (a) => a.partidoId === preAsignados[0].partidoId,
    );
    expect(pin).toBeDefined();
    expect(pin!.canchaId).toBe("club-1");
    expect(pin!.dia).toBe("sabado");
    expect(pin!.hora).toBe("12:30");
  });
});

describe("solver vs naive — el contraste de la demo", () => {
  const input = construirInput();
  const solverM = calcularMetricas(solve(input), input);
  const naiveM = calcularMetricas(naiveSchedule(input), input);

  it("el naive SI viola restricciones duras (las metricas lo detectan)", () => {
    expect(naiveM.violacionesDurasTotal).toBeGreaterThan(0);
  });

  it("el solver no viola ninguna", () => {
    expect(solverM.violacionesDurasTotal).toBe(0);
  });

  it("el solver pone mas partidos en horas lindas que el naive", () => {
    expect(solverM.blandas.pctHorasLindas).toBeGreaterThanOrEqual(
      naiveM.blandas.pctHorasLindas,
    );
  });
});
