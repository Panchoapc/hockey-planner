import { describe, it, expect } from "vitest";
import { esRecintoElegible, recintosElegibles } from "../index";
import { construirRecintos } from "./fixtures";

describe("acceso por genero (invariante)", () => {
  const recintos = construirRecintos();

  it("varones: solo recintos que admiten varones (los 7 de club)", () => {
    const e = recintosElegibles("VARONES", recintos);
    expect(e.length).toBe(7);
    expect(e.every((r) => r.admiteVarones)).toBe(true);
  });

  it("damas: todos los recintos (incluye colegios-stgo)", () => {
    expect(recintosElegibles("DAMAS", recintos).length).toBe(recintos.length);
  });

  it("manquehue admite varones; colegios-stgo (femenino) no", () => {
    const man = recintos.find((r) => r.id === "manquehue")!;
    const col = recintos.find((r) => r.id === "colegios-stgo")!;
    expect(esRecintoElegible("VARONES", man)).toBe(true);
    expect(esRecintoElegible("VARONES", col)).toBe(false);
  });
});
