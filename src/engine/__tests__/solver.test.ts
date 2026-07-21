import { describe, it, expect } from "vitest";
import { solve, naiveSchedule, calcularMetricas } from "../index";
import { construirInput } from "./fixtures";

describe("solver — invariantes duras sobre los partidos ASIGNADOS", () => {
  const varones = construirInput().partidos.find((p) => p.genero === "VARONES")!;
  const input = construirInput({
    bloqueos: [{ dia: "domingo", hora: "08:30" }],
    preAsignados: [
      {
        partidoId: varones.id,
        recintoId: varones.recintoLocalId,
        dia: "sabado",
        hora: "13:00",
      },
    ],
  });
  const result = solve(input);
  const m = calcularMetricas(result, input);

  it("184 partidos (56 + 72 + 56, doble rueda)", () => {
    expect(input.partidos.length).toBe(184);
  });

  it("CERO violaciones duras entre lo asignado", () => {
    expect(m.violacionesDurasTotal).toBe(0);
  });

  it("nunca dos partidos en el mismo recinto/slot", () => {
    expect(m.duras.choquesRecinto).toBe(0);
  });

  it("ningun equipo ni arbitro en dos partidos a la vez; 2 arbitros c/u", () => {
    expect(m.duras.choquesEquipo).toBe(0);
    expect(m.duras.choquesArbitro).toBe(0);
    expect(m.duras.partidosSinDosArbitros).toBe(0);
    expect(result.asignaciones.every((a) => a.arbitros.length === 2)).toBe(true);
  });

  it("todo partido en el recinto del local o de la visita, nunca un tercero", () => {
    expect(m.duras.recintoAjeno).toBe(0);
  });

  it("ningun partido de varones en recinto que no admite varones", () => {
    expect(m.duras.violacionGenero).toBe(0);
  });

  it("ningun partido en slot bloqueado; todo dentro de la grilla", () => {
    expect(m.duras.enSlotBloqueado).toBe(0);
    expect(m.duras.fueraDeGrilla).toBe(0);
  });

  it("respeta el pre-asignado (TV)", () => {
    const pin = result.asignaciones.find((a) => a.partidoId === varones.id)!;
    expect(pin.recintoId).toBe(varones.recintoLocalId);
    expect(pin.dia).toBe("sabado");
    expect(pin.hora).toBe("13:00");
  });

  it("la grilla contiene las 13:00 (regresion Tarea 0)", () => {
    expect(input.slots.some((s) => s.hora === "13:00")).toBe(true);
  });

  it("saturacion real: un recinto llega a capacidad y todo sinAsignar tiene razon", () => {
    // La doble rueda no cabe en un fin de semana: los recintos masculinos
    // saturan. Prueba del hallazgo del dominio: al menos un recinto llega a su
    // capacidad (slots no bloqueados) => saturacion real, no fallo del solver.
    expect(result.sinAsignar.length).toBeGreaterThan(0);
    const carga = new Map<string, number>();
    for (const a of result.asignaciones)
      carga.set(a.recintoId, (carga.get(a.recintoId) ?? 0) + 1);
    const capacidad = input.slots.length - input.bloqueos.length;
    expect(Math.max(...carga.values())).toBe(capacidad);
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

describe("solver vs naive — contraste de la demo", () => {
  const input = construirInput();
  const solverM = calcularMetricas(solve(input), input);
  const naiveM = calcularMetricas(naiveSchedule(input), input);

  it("el naive viola restricciones duras (recinto ajeno, genero, choques)", () => {
    expect(naiveM.violacionesDurasTotal).toBeGreaterThan(0);
  });

  it("el solver no viola ninguna", () => {
    expect(solverM.violacionesDurasTotal).toBe(0);
  });
});
