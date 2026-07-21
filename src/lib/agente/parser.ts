// Parser NL -> restricciones estructuradas. Deterministico y offline (reglas).
// El LLM real es un drop-in opcional (misma firma); el sistema NO depende de el.
// El parser SOLO interpreta la entrada: no asigna partidos ni decide nada.

export type Dia = "sabado" | "domingo";

export type RestriccionNL =
  | { tipo: "no-antes"; dia?: Dia; hora: string }
  | { tipo: "no-despues"; dia?: Dia; hora: string }
  | { tipo: "prefiere-dia"; dia: Dia }
  | { tipo: "evita-dia"; dia: Dia }
  | { tipo: "no-entiendo"; texto: string };

function normalizar(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function detectarDia(t: string): Dia | undefined {
  if (/\bsabado\b/.test(t)) return "sabado";
  if (/\bdomingo\b/.test(t)) return "domingo";
  return undefined;
}

function detectarHora(t: string): string | undefined {
  const m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(hs|h|horas|am|pm)?/);
  if (!m) return undefined;
  let h = parseInt(m[1], 10);
  const min = m[2] ?? "00";
  if (m[3] === "pm" && h < 12) h += 12;
  if (h < 0 || h > 23) return undefined;
  return `${String(h).padStart(2, "0")}:${min}`;
}

/** Interpreta una frase de preferencia en restricciones estructuradas. */
export function parsearPreferencia(texto: string): RestriccionNL[] {
  const t = normalizar(texto);
  const dia = detectarDia(t);
  const hora = detectarHora(t);

  if (/\bantes de\b/.test(t) && hora) return [{ tipo: "no-antes", dia, hora }];
  if (/\b(despues de|luego de)\b/.test(t) && hora)
    return [{ tipo: "no-despues", dia, hora }];

  // Lema (sin \b de cierre) para tomar "preferimos", "preferir", etc.
  if (dia && /\b(prefer|queremos|nos gustaria|ojala|mejor)/.test(t))
    return [{ tipo: "prefiere-dia", dia }];
  if (dia && /\bno\b/.test(t)) return [{ tipo: "evita-dia", dia }];

  return [{ tipo: "no-entiendo", texto }];
}

/** Interfaz de agente: permite enchufar un LLM real con la misma firma. */
export interface Agente {
  parsear(texto: string): Promise<RestriccionNL[]>;
}

/** Agente por defecto: reglas, sincrono, sin red. */
export const agenteReglas: Agente = {
  async parsear(texto: string) {
    return parsearPreferencia(texto);
  },
};
