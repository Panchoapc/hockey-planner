import { describe, it, expect } from "vitest";
import { esRecintoElegible, recintosElegibles } from "../index";
import { construirRecintos } from "./fixtures";

describe("acceso por genero (invariante)", () => {
  const recintos = construirRecintos();

  it("hay 7 recintos de club (varones) + colegios femeninos separados", () => {
    expect(recintos.filter((r) => r.admiteVarones).length).toBe(7);
    expect(recintos.filter((r) => !r.admiteVarones).length).toBeGreaterThanOrEqual(4);
  });

  it("varones: solo recintos que admiten varones (los 7 de club)", () => {
    const e = recintosElegibles("VARONES", recintos);
    expect(e.length).toBe(7);
    expect(e.every((r) => r.admiteVarones)).toBe(true);
  });

  it("damas: todos los recintos", () => {
    expect(recintosElegibles("DAMAS", recintos).length).toBe(recintos.length);
  });

  it("manquehue admite varones; un colegio femenino no", () => {
    const man = recintos.find((r) => r.id === "manquehue")!;
    const col = recintos.find((r) => !r.admiteVarones)!;
    expect(esRecintoElegible("VARONES", man)).toBe(true);
    expect(esRecintoElegible("VARONES", col)).toBe(false);
  });
});
