import { describe, expect, it } from "vitest";
import { calificar } from "../../src/worker/leads.ts";
import type { FilaLeadVentas } from "../../src/worker/repositorio.ts";

const base: FilaLeadVentas = {
  created_at: "2026-10-18T00:00:00.000Z",
  nombre: "N",
  email: "n@example.com",
  whatsapp: "+57 300 000 0000",
  empresa: null,
  perfil: "founder",
  etapa: "creciendo",
  estado: "completo",
  programa_top: "Sales_Machine",
  fit_top: 0.8,
  confianza_choice: 0.9,
  requiere_revision: 0,
  quiere_asesor: 0,
};

describe("calificar", () => {
  it("pedir asesor siempre es caliente", () => {
    expect(calificar({ ...base, estado: "error", quiere_asesor: 1 })).toBe("caliente");
  });
  it("programa de alto valor completo es caliente", () => {
    expect(calificar({ ...base, programa_top: "Inmersion_Ejecutiva" })).toBe("caliente");
  });
  it("recomendado completo es tibio; preliminar o sin terminar es frío", () => {
    expect(calificar(base)).toBe("tibio");
    expect(calificar({ ...base, requiere_revision: 1 })).toBe("frio");
    expect(calificar({ ...base, estado: "en_curso" })).toBe("frio");
  });
});
