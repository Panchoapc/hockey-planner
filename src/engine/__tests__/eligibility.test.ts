import { describe, it, expect } from "vitest";
import { esRecintoElegible, recintosElegibles } from "../index";
import { construirRecintos } from "./fixtures";

describe("acceso por genero (invariante)", () => {
  const recintos = construirRecintos();

  it("varones: solo recintos que admiten varones", () => {
    const e = recintosElegibles("VARONES", recintos);
    expect(e.length).toBeGreaterThan(0);
    expect(e.every((r) => r.admiteVarones)).toBe(true);
  });

  it("damas: todos los recintos", () => {
    expect(recintosElegibles("DAMAS", recintos).length).toBe(recintos.length);
  });

  it("Manquehue admite varones; COGS (colegio) no", () => {
    const man = recintos.find((r) => r.nombre === "Manquehue")!;
    const cogs = recintos.find((r) => r.nombre === "COGS")!;
    expect(esRecintoElegible("VARONES", man)).toBe(true);
    expect(esRecintoElegible("VARONES", cogs)).toBe(false);
  });
});
