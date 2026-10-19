import { describe, expect, it } from "vitest";
import umbrales from "../../src/data/umbrales.json" with { type: "json" };
import { DOLORES_CHIP } from "../../src/motor/catalogo.ts";
import type { EntradaResultado } from "../../src/motor/resultado.ts";
import { resolverResultado } from "../../src/motor/resultado.ts";
import { efectosDeSeguimiento } from "../../src/motor/seguimientos.ts";

function noulBase(extra: Record<string, number> = {}): Record<string, number> {
  const noul: Record<string, number> = { respuesta_vaga: 0.1, datos_incoherentes: 0.05 };
  for (const d of DOLORES_CHIP) {
    noul[d.id] = 0.1;
  }
  return { ...noul, ...extra };
}

// Tres programas de ventas a menos de delta_hermanos: el seguimiento decide.
const ventasParejas = noulBase({
  bloqueo_comercial: 0.85,
  ventas_por_referidos: 0.85,
  fit_sales_machine: 0.82,
  fit_linkedin_sales: 0.8,
  fit_ai_sales: 0.78,
});

function entrada(parcial: Partial<EntradaResultado> = {}): EntradaResultado {
  return {
    respuestas: {
      noul: ventasParejas,
      choice: { valor: "Sales_Machine", confianza: 0.7 },
      score: null,
    },
    perfil: "founder",
    etapa_nivel: 3,
    edad_hijo: null,
    dolores_confirmados: ["bloqueo_comercial", "ventas_por_referidos"],
    respuestas_seguimiento: null,
    ...parcial,
  };
}

describe("reto de ventas", () => {
  it.each([
    ["sin_proceso", "Sales_Machine"],
    ["referidos", "LinkedIn_Sales"],
    ["automatizar", "AI_Sales"],
    ["redes", "Instagram_TikTok"],
  ])("%s suma 2 a %s y a nadie más", (opcion, programa) => {
    const e = efectosDeSeguimiento({ reto_ventas: opcion }, {}, 3, umbrales);
    expect(e.prioridades).toEqual({ [programa]: 2 });
  });

  it("referidos baja Instagram y redes baja los tres programas B2B", () => {
    expect(efectosDeSeguimiento({ reto_ventas: "referidos" }, {}, 3, umbrales).degradados).toEqual([
      "Instagram_TikTok",
    ]);
    expect(efectosDeSeguimiento({ reto_ventas: "redes" }, {}, 3, umbrales).degradados).toEqual([
      "Sales_Machine",
      "LinkedIn_Sales",
      "AI_Sales",
    ]);
    expect(
      efectosDeSeguimiento({ reto_ventas: "sin_proceso" }, {}, 3, umbrales).degradados,
    ).toEqual([]);
  });

  it("una opción desconocida no suma nada", () => {
    const e = efectosDeSeguimiento({ reto_ventas: "otra" }, {}, 3, umbrales);
    expect(e.prioridades).toEqual({});
    expect(e.degradados).toEqual([]);
  });

  it.each([
    ["sin_proceso", "Sales_Machine"],
    ["referidos", "LinkedIn_Sales"],
    ["automatizar", "AI_Sales"],
  ])("con tres programas parejos, %s deja a %s de n.º 1", (opcion, programa) => {
    const pendiente = resolverResultado(entrada(), umbrales);
    expect(pendiente.pendiente).toBe(true);
    if (pendiente.pendiente) {
      expect(pendiente.seguimientos.map((p) => p.id)).toContain("reto_ventas");
    }
    const salida = resolverResultado(
      entrada({ respuestas_seguimiento: { reto_ventas: opcion } }),
      umbrales,
    );
    expect(salida.pendiente).toBe(false);
    if (!salida.pendiente) {
      expect(salida.resultado.programa_top?.id).toBe(programa);
    }
  });
});

describe("uso de IA para vender", () => {
  it("suma 1 a AI Sales", () => {
    const e = efectosDeSeguimiento({ uso_ia: "ventas" }, {}, 3, umbrales);
    expect(e.prioridades).toEqual({ AI_Sales: 1 });
  });
});
