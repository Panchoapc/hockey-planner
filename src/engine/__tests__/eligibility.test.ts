import { describe, it, expect } from "vitest";
import { canchasElegibles } from "../index";
import { construirCanchas } from "./fixtures";

describe("acceso por genero", () => {
  const canchas = construirCanchas();

  it("varones: solo canchas CLUB", () => {
    const e = canchasElegibles("VARONES", canchas);
    expect(e.length).toBe(7);
    expect(e.every((c) => c.pool === "CLUB")).toBe(true);
  });

  it("damas: todas las canchas", () => {
    const e = canchasElegibles("DAMAS", canchas);
    expect(e.length).toBe(14);
  });
});
