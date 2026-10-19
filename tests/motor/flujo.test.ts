import { describe, expect, it } from "vitest";
import umbrales from "../../src/data/umbrales.json" with { type: "json" };
import { DOLORES_CHIP } from "../../src/motor/catalogo.ts";
import {
  detectarDolores,
  doloresTrasAclaracion,
  familiasDe,
  necesitaAclaracion,
} from "../../src/motor/dolores.ts";
import type { EntradaResultado } from "../../src/motor/resultado.ts";
import { resolverResultado } from "../../src/motor/resultado.ts";

function noulBase(extra: Record<string, number> = {}): Record<string, number> {
  const noul: Record<string, number> = { respuesta_vaga: 0.1, datos_incoherentes: 0.05 };
  for (const d of DOLORES_CHIP) {
    noul[d.id] = 0.1;
  }
  return { ...noul, ...extra };
}

const ventas = noulBase({
  bloqueo_comercial: 0.85,
  ventas_por_referidos: 0.85,
  fit_sales_machine: 0.85,
  fit_linkedin_sales: 0.8,
});

function entrada(parcial: Partial<EntradaResultado> = {}): EntradaResultado {
  return {
    respuestas: { noul: ventas, choice: { valor: "Sales_Machine", confianza: 0.7 }, score: null },
    perfil: "founder",
    etapa_nivel: 3,
    edad_hijo: null,
    dolores_confirmados: ["bloqueo_comercial", "ventas_por_referidos"],
    respuestas_seguimiento: null,
    ...parcial,
  };
}

describe("dolores", () => {
  it("detecta los chips y abre solo la familia ventas", () => {
    const dolores = detectarDolores(ventas, umbrales);
    expect(dolores.map((d) => d.etiqueta).sort()).toEqual([
      "Pocas ventas",
      "Vendes solo por referidos",
    ]);
    expect(familiasDe(dolores.map((d) => d.id))).toEqual(["ventas"]);
  });

  it("pide aclaración si es vaga o no se abre ninguna familia", () => {
    expect(necesitaAclaracion(noulBase({ respuesta_vaga: 0.61 }), umbrales)).toBe(true);
    expect(necesitaAclaracion(noulBase(), umbrales)).toBe(true);
    expect(necesitaAclaracion(ventas, umbrales)).toBe(false);
  });

  it("tras la aclaración abre la familia elegida con su primer dolor", () => {
    const dolores = doloresTrasAclaracion(noulBase(), ["capital"], umbrales);
    expect(dolores.map((d) => d.id)).toEqual(["busca_capital"]);
  });
});

describe("resolverResultado", () => {
  it("devuelve el seguimiento de ventas pendiente (una sola pregunta)", () => {
    const salida = resolverResultado(entrada(), umbrales);
    expect(salida.pendiente).toBe(true);
    if (salida.pendiente) {
      expect(salida.seguimientos.map((p) => p.id)).toEqual(["reto_ventas"]);
      expect(salida.seguimientos[0]?.opciones.map((o) => o.id)).toEqual([
        "sin_proceso",
        "referidos",
        "automatizar",
        "redes",
      ]);
    }
  });

  it("con el seguimiento respondido recomienda Sales_Machine sin revisión", () => {
    const salida = resolverResultado(
      entrada({ respuestas_seguimiento: { reto_ventas: "sin_proceso" } }),
      umbrales,
    );
    expect(salida.pendiente).toBe(false);
    if (!salida.pendiente) {
      expect(salida.resultado.programa_top?.id).toBe("Sales_Machine");
      expect(salida.resultado.tipo).toBe("recomendado");
      expect(salida.resultado.requiere_revision).toBe(false);
    }
  });

  it("marca preliminar con confianza baja, Choice distinto o datos incoherentes", () => {
    const seg = { reto_ventas: "sin_proceso" };
    const casos = [
      { choice: { valor: "Sales_Machine", confianza: 0.4 }, extra: {} as Record<string, number> },
      { choice: { valor: "LinkedIn_Sales", confianza: 0.9 }, extra: {} as Record<string, number> },
      { choice: { valor: "Sales_Machine", confianza: 0.9 }, extra: { datos_incoherentes: 0.6 } },
    ];
    for (const caso of casos) {
      const salida = resolverResultado(
        entrada({
          respuestas: { noul: { ...ventas, ...caso.extra }, choice: caso.choice, score: null },
          respuestas_seguimiento: seg,
        }),
        umbrales,
      );
      expect(salida.pendiente).toBe(false);
      if (!salida.pendiente) {
        expect(salida.resultado.requiere_revision).toBe(true);
        expect(salida.resultado.tipo).toBe("preliminar");
        expect(salida.resultado.programa_top?.id).toBe("Sales_Machine");
      }
    }
  });

  it("devuelve conversación si ningún programa llega a 0.40", () => {
    const salida = resolverResultado(
      entrada({
        respuestas: { noul: noulBase(), choice: null, score: null },
        dolores_confirmados: [],
        respuestas_seguimiento: {},
      }),
      umbrales,
    );
    expect(salida.pendiente).toBe(false);
    if (!salida.pendiente) {
      expect(salida.resultado.tipo).toBe("conversacion");
      expect(salida.resultado.programa_top).toBeNull();
    }
  });

  it("regla NEXT: padre o madre con hijo de 15 recibe Next primero", () => {
    const salida = resolverResultado(
      entrada({
        respuestas: {
          noul: noulBase({ fit_next: 0.2 }),
          choice: { valor: "Next", confianza: 0.9 },
          score: null,
        },
        perfil: "padre_madre_next",
        etapa_nivel: null,
        edad_hijo: 15,
        dolores_confirmados: [],
        respuestas_seguimiento: {},
      }),
      umbrales,
    );
    expect(salida.pendiente).toBe(false);
    if (!salida.pendiente) {
      expect(salida.resultado.programa_top?.id).toBe("Next");
      expect(salida.resultado.tipo).toBe("recomendado");
    }
  });

  it("online quita la Inmersión del n.º 1", () => {
    const noul = noulBase({
      fit_inmersion_ejecutiva: 0.9,
      fit_multipliers: 0.5,
      fit_operaciones_con_ai: 0.7,
    });
    const salida = resolverResultado(
      entrada({
        respuestas: { noul, choice: { valor: "Operaciones_con_AI", confianza: 0.8 }, score: null },
        etapa_nivel: 4,
        dolores_confirmados: [],
        respuestas_seguimiento: { formato: "online" },
      }),
      umbrales,
    );
    expect(salida.pendiente).toBe(false);
    if (!salida.pendiente) {
      expect(salida.resultado.programa_top?.id).toBe("Operaciones_con_AI");
    }
  });
});

describe("rutas casi igual de fuertes", () => {
  it("lista los programas a 10 puntos o menos y explica por qué quedó primero el n.º 1", () => {
    const noul = noulBase({
      bloqueo_comercial: 0.85,
      dolor_growth: 0.85,
      fit_growth_rockstar: 0.8,
      fit_sales_machine: 0.75,
      fit_ai_sales: 0.5,
    });
    const salida = resolverResultado(
      entrada({
        respuestas: { noul, choice: { valor: "Growth_Rockstar", confianza: 0.8 }, score: null },
        dolores_confirmados: ["bloqueo_comercial", "dolor_growth"],
        respuestas_seguimiento: {},
      }),
      umbrales,
    );
    expect(salida.pendiente).toBe(false);
    if (!salida.pendiente) {
      const r = salida.resultado;
      expect(r.programa_top?.id).toBe("Growth_Rockstar");
      expect(r.cercanos.map((c) => c.id)).toEqual(["Sales_Machine"]);
      expect(r.cercanos[0]?.razon).toContain("JEV");
      expect(r.motivo_top).toContain("casi igual");
    }
  });

  it("sin rutas cercanas no hay explicación", () => {
    const salida = resolverResultado(
      entrada({ respuestas_seguimiento: { reto_ventas: "sin_proceso" } }),
      umbrales,
    );
    expect(salida.pendiente).toBe(false);
    if (!salida.pendiente) {
      for (const c of salida.resultado.cercanos) {
        expect((salida.resultado.programa_top?.fit ?? 0) - c.fit).toBeLessThanOrEqual(0.1 + 1e-9);
      }
    }
  });
});

describe("empate entre familias distintas", () => {
  const noul = noulBase({
    bloqueo_comercial: 0.85,
    dolor_growth: 0.85,
    fit_sales_machine: 0.85,
    fit_growth_rockstar: 0.85,
  });
  const base = {
    respuestas: { noul, choice: { valor: "Sales_Machine", confianza: 0.8 }, score: null },
    dolores_confirmados: ["bloqueo_comercial", "dolor_growth"] as const,
  };

  it("pregunta qué es lo más urgente con una opción por familia empatada", () => {
    const salida = resolverResultado(
      entrada({ ...base, dolores_confirmados: [...base.dolores_confirmados] }),
      umbrales,
    );
    expect(salida.pendiente).toBe(true);
    if (salida.pendiente) {
      const p = salida.seguimientos[0];
      expect(p?.id).toBe("prioridad");
      expect(p?.opciones.map((o) => o.id)).toEqual(["ventas", "growth"]);
      expect(salida.seguimientos.length).toBeLessThanOrEqual(2);
    }
  });

  it("si elige growth, Growth Rockstar queda primero", () => {
    const salida = resolverResultado(
      entrada({
        ...base,
        dolores_confirmados: [...base.dolores_confirmados],
        respuestas_seguimiento: { prioridad: "growth" },
      }),
      umbrales,
    );
    expect(salida.pendiente).toBe(false);
    if (!salida.pendiente) {
      expect(salida.resultado.programa_top?.id).toBe("Growth_Rockstar");
    }
  });
});

describe("el n.º 1 nunca es mucho menos afín que otro programa", () => {
  it("con Sales Machine en 0.87 sin requisito y Growth en 0.48, el n.º 1 es Sales Machine", () => {
    const noul = noulBase({
      bloqueo_comercial: 0.85,
      dolor_growth: 0.85,
      fit_sales_machine: 0.87,
      fit_growth_rockstar: 0.48,
    });
    const salida = resolverResultado(
      entrada({
        respuestas: { noul, choice: { valor: "Sales_Machine", confianza: 0.8 }, score: null },
        etapa_nivel: 0,
        dolores_confirmados: ["bloqueo_comercial", "dolor_growth"],
        respuestas_seguimiento: { rol_growth: "ejecuto" },
      }),
      umbrales,
    );
    expect(salida.pendiente).toBe(false);
    if (!salida.pendiente) {
      const r = salida.resultado;
      expect(r.programa_top?.id).toBe("Sales_Machine");
      expect(r.programa_top?.cumple_requisito).toBe(false);
      expect(r.programa_top?.condicion_pendiente).toContain("factura");
      expect(r.tipo).toBe("preliminar");
      expect(r.motivo_top).toBe("");
    }
  });

  it("una respuesta de seguimiento desempata pero no salta una brecha grande", () => {
    const noul = noulBase({
      bloqueo_comercial: 0.85,
      dolor_growth: 0.85,
      fit_sales_machine: 0.85,
      fit_growth_rockstar: 0.5,
    });
    const salida = resolverResultado(
      entrada({
        respuestas: { noul, choice: { valor: "Sales_Machine", confianza: 0.8 }, score: null },
        dolores_confirmados: ["bloqueo_comercial", "dolor_growth"],
        respuestas_seguimiento: { rol_growth: "ejecuto" },
      }),
      umbrales,
    );
    expect(salida.pendiente).toBe(false);
    if (!salida.pendiente) {
      expect(salida.resultado.programa_top?.id).toBe("Sales_Machine");
    }
  });
});

describe("siempre hay alternativas", () => {
  it("con un solo tema confirmado muestra al menos 3 rutas y explica las que pesan menos", () => {
    const noul = noulBase({
      quiere_adoptar_ia: 0.9,
      fit_ai_for_executives: 0.91,
      fit_operaciones_con_ai: 0.49,
      fit_inmersion_ejecutiva: 0.42,
      fit_planes_corporativos: 0.29,
      fit_ai_for_developers: 0.18,
    });
    const salida = resolverResultado(
      entrada({
        respuestas: { noul, choice: { valor: "AI_for_Executives", confianza: 0.93 }, score: null },
        etapa_nivel: 1,
        dolores_confirmados: ["quiere_adoptar_ia"],
        respuestas_seguimiento: {},
      }),
      umbrales,
    );
    expect(salida.pendiente).toBe(false);
    if (!salida.pendiente) {
      const r = salida.resultado;
      expect(r.programa_top?.id).toBe("AI_for_Executives");
      expect(r.ranking.length).toBeGreaterThanOrEqual(3);
      expect(r.ranking.map((f) => f.id)).toContain("Operaciones_con_AI");
      const ops = r.ranking.find((f) => f.id === "Operaciones_con_AI");
      expect(ops?.nota).toContain("no lo marcaste");
    }
  });
});

describe("alternativas según el perfil", () => {
  it("a un fundador no le sugiere Next ni Planes Corporativos", () => {
    const noul = noulBase({
      quiere_adoptar_ia: 0.9,
      fit_ai_for_executives: 0.91,
      fit_planes_corporativos: 0.45,
      fit_next: 0.42,
      fit_operaciones_con_ai: 0.49,
    });
    const salida = resolverResultado(
      entrada({
        respuestas: { noul, choice: { valor: "AI_for_Executives", confianza: 0.9 }, score: null },
        dolores_confirmados: ["quiere_adoptar_ia"],
        respuestas_seguimiento: {},
      }),
      umbrales,
    );
    expect(salida.pendiente).toBe(false);
    if (!salida.pendiente) {
      const ids = salida.resultado.ranking.map((f) => f.id);
      expect(ids).not.toContain("Next");
      expect(ids).not.toContain("Planes_Corporativos");
      expect(ids[0]).toBe("Operaciones_con_AI");
    }
  });
});
