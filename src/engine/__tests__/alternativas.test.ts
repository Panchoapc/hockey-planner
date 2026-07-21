import { describe, it, expect } from "vitest";
import { solve, proponerAlternativas } from "../index";
import { construirInput } from "./fixtures";

describe("motor de alternativas", () => {
  const input = construirInput();
  const result = solve(input);
  const asig = result.asignaciones[0];
  const partido = input.partidos.find((p) => p.id === asig.partidoId)!;

  it("propone alternativas legales, rankeadas por delta de puntaje", () => {
    const r = proponerAlternativas(asig.partidoId, result.asignaciones, input);
    expect(r.sinAlternativas).toBe(false);
    expect(r.alternativas.length).toBeGreaterThan(0);
    // Toda alternativa respeta la localia (recinto del local o de la visita).
    for (const alt of r.alternativas) {
      expect([partido.recintoLocalId, partido.recintoVisitaId]).toContain(alt.recintoId);
    }
    // Rankeadas de mayor a menor delta.
    const deltas = r.alternativas.map((a) => a.deltaPuntaje);
    expect([...deltas].sort((a, b) => b - a)).toEqual(deltas);
    // Ninguna desplaza a otro partido (solo celdas libres).
    expect(r.alternativas.every((a) => a.desplaza.length === 0)).toBe(true);
  });

  it("aplicar una alternativa no genera choque de recinto", () => {
    const r = proponerAlternativas(asig.partidoId, result.asignaciones, input);
    const alt = r.alternativas[0];
    const ocupadas = new Set(
      result.asignaciones
        .filter((a) => a.partidoId !== asig.partidoId)
        .map((a) => `${a.recintoId}|${a.fecha}|${a.hora}`),
    );
    expect(ocupadas.has(`${alt.recintoId}|${alt.fecha}|${alt.hora}`)).toBe(false);
  });

  it("sin alternativas legales -> resultado EXPLICITO con razon (no lista vacia)", () => {
    // Bloqueo todo el finde del partido salvo su celda actual.
    const finde = input.finesDeSemana.find((f) => f.indice === partido.jornada)!;
    const bloqueos = [];
    for (const fecha of [finde.sabado, finde.domingo])
      for (const hora of input.horas)
        if (!(fecha === asig.fecha && hora === asig.hora))
          bloqueos.push({ fecha, hora });
    const r = proponerAlternativas(asig.partidoId, result.asignaciones, {
      ...input,
      bloqueos,
    });
    expect(r.sinAlternativas).toBe(true);
    expect(r.alternativas.length).toBe(0);
    expect(r.razon).toBeDefined();
    expect(typeof r.detalle).toBe("string");
  });
});
