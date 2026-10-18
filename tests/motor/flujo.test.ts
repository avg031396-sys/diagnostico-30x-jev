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
  it("devuelve seguimientos pendientes (cliente y reuniones, máx. 2)", () => {
    const salida = resolverResultado(entrada(), umbrales);
    expect(salida.pendiente).toBe(true);
    if (salida.pendiente) {
      expect(salida.seguimientos.map((p) => p.id)).toEqual(["cliente", "reuniones"]);
      expect(salida.seguimientos[1]?.solo_si).toEqual({ cliente: "b2b" });
    }
  });

  it("con el seguimiento respondido recomienda Sales_Machine sin revisión", () => {
    const salida = resolverResultado(
      entrada({ respuestas_seguimiento: { cliente: "b2b", reuniones: "menos_20" } }),
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
    const seg = { cliente: "b2b", reuniones: "menos_20" };
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
      entrada({ respuestas_seguimiento: { cliente: "b2b", reuniones: "menos_20" } }),
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
