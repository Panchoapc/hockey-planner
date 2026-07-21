import { describe, it, expect } from "vitest";
import { solve, generarSlots } from "../index";
import { construirInput } from "./fixtures";

describe("infactibilidad — reporta que no entro y por que (sin excepciones)", () => {
  it("capacidad insuficiente -> sinAsignar con razon, sin tirar excepcion", () => {
    // 92 partidos, 1 sola cancha CLUB, 2 arbitros -> no caben.
    const input = construirInput({ arbitros: 2 });
    input.canchas = [{ id: "club-1", nombre: "Club 1", pool: "CLUB" }];
    input.slots = generarSlots(90, ["sabado", "domingo"], "08:00", "19:00");

    const result = solve(input);
    expect(result.sinAsignar.length).toBeGreaterThan(0);
    const razonesValidas = new Set([
      "sin-cancha-elegible-libre",
      "equipo-ocupado",
      "sin-arbitros",
      "slot-bloqueado",
      "capacidad-agotada",
    ]);
    for (const s of result.sinAsignar) {
      expect(razonesValidas.has(s.razon)).toBe(true);
    }
  });
});
