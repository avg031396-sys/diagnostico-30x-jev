import { describe, expect, it } from "vitest";
import umbrales from "../../src/data/umbrales.json" with { type: "json" };
import { aplicaReglaInmersion } from "../../src/motor/reglas.ts";
import { resolverResultado } from "../../src/motor/resultado.ts";
import type { Umbrales } from "../../src/motor/tipos.ts";

const U = umbrales as Umbrales;

// Respuestas reales de JEV para «Trabajo 90 horas a la semana, todo pasa por mí…» (limpio-01).
const NOUL = {
  fit_operaciones_con_ai: 0.86,
  fit_inmersion_ejecutiva: 0.55,
  fit_multipliers: 0.37,
  dependencia_fundador: 0.96,
  operacion_desordenada: 0.75,
};

function top(seguimiento: Record<string, string>, perfil: "founder" | "ejecutivo" = "founder") {
  const s = resolverResultado(
    {
      respuestas: {
        noul: NOUL,
        choice: { valor: "Operaciones_con_AI", confianza: 0.54 },
        score: null,
      },
      perfil,
      etapa_nivel: 3,
      edad_hijo: null,
      dolores_confirmados: ["dependencia_fundador", "operacion_desordenada"],
      respuestas_seguimiento: seguimiento,
    },
    U,
  );
  if (s.pendiente) {
    throw new Error("no debería quedar pendiente");
  }
  return s.resultado.programa_top?.id;
}

describe("regla Inmersión", () => {
  it("aplica a founder que factura desde USD 1M con señal de dependencia o expansión", () => {
    const base = { perfil: "founder" as const, etapa_nivel: 3, facturacion: "1M-20M" as const };
    expect(aplicaReglaInmersion({ ...base, noul: { dependencia_fundador: 0.9 } })).toBe(true);
    expect(aplicaReglaInmersion({ ...base, noul: { busca_expansion: 0.9 } })).toBe(true);
    expect(aplicaReglaInmersion({ ...base, noul: { dependencia_fundador: 0.7 } })).toBe(false);
  });

  it("no aplica sin facturación respondida, con menos de USD 1M, a ejecutivos ni en etapa temprana", () => {
    const noul = { dependencia_fundador: 0.95 };
    expect(
      aplicaReglaInmersion({ perfil: "founder", etapa_nivel: 3, facturacion: null, noul }),
    ).toBe(false);
    expect(
      aplicaReglaInmersion({ perfil: "founder", etapa_nivel: 3, facturacion: "100k-1M", noul }),
    ).toBe(false);
    expect(
      aplicaReglaInmersion({ perfil: "ejecutivo", etapa_nivel: 3, facturacion: ">20M", noul }),
    ).toBe(false);
    expect(
      aplicaReglaInmersion({ perfil: "founder", etapa_nivel: 2, facturacion: ">20M", noul }),
    ).toBe(false);
  });

  it("con facturación de USD 1M o más el n.º 1 pasa a ser la Inmersión", () => {
    expect(top({ facturacion: "1M-20M" })).toBe("Inmersion_Ejecutiva");
  });

  it("con menos de USD 1M sigue siendo Operaciones con AI", () => {
    expect(top({ facturacion: "100k-1M" })).toBe("Operaciones_con_AI");
  });

  it("si la persona quiere online, la Inmersión (presencial) no queda como n.º 1", () => {
    expect(top({ facturacion: "1M-20M", formato: "online" })).not.toBe("Inmersion_Ejecutiva");
  });

  it("un ejecutivo con el mismo reto no recibe la regla", () => {
    expect(top({ facturacion: "1M-20M" }, "ejecutivo")).toBe("Operaciones_con_AI");
  });
});
