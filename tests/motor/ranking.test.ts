import { describe, expect, it } from "vitest";
import umbrales from "../../src/data/umbrales.json" with { type: "json" };
import type { IdPrograma } from "../../src/motor/catalogo.ts";
import { PROGRAMAS } from "../../src/motor/catalogo.ts";
import {
  aFilaVisible,
  calcularRanking,
  primerRecomendable,
  visibles,
} from "../../src/motor/ranking.ts";
import { evaluarRequisito } from "../../src/motor/requisitos.ts";
import type { ContextoRequisitos } from "../../src/motor/tipos.ts";

const base: ContextoRequisitos = {
  perfil: "founder",
  etapa_nivel: 3,
  edad_hijo: null,
  facturacion: null,
};

function fitsDe(parcial: Partial<Record<IdPrograma, number>>): Record<IdPrograma, number> {
  const fits = {} as Record<IdPrograma, number>;
  for (const p of PROGRAMAS) {
    fits[p.id] = parcial[p.id] ?? 0;
  }
  return fits;
}

const sinOpciones = {
  familiasConfirmadas: [],
  prioridades: {},
  degradados: [],
  bloqueadosComoTop: [],
};

describe("requisitos", () => {
  it("etapa arrancando cumple Sales_Machine y no Operaciones_con_AI", () => {
    const ctx = { ...base, etapa_nivel: 2 };
    expect(evaluarRequisito("Sales_Machine", ctx).cumple).toBe(true);
    expect(evaluarRequisito("Operaciones_con_AI", ctx)).toEqual({
      cumple: false,
      condicion: "tener un negocio en etapa Creciendo o Consolidada",
    });
  });

  it("facturación 100k-1M bloquea Inmersión y Multipliers aunque sea consolidada", () => {
    const ctx = { ...base, etapa_nivel: 4, facturacion: "100k-1M" as const };
    expect(evaluarRequisito("Inmersion_Ejecutiva", ctx).cumple).toBe(false);
    expect(evaluarRequisito("Multipliers", ctx).cumple).toBe(false);
  });

  it("Next exige perfil y edad de 13 a 18", () => {
    const ctx = { ...base, perfil: "padre_madre_next" as const, etapa_nivel: null };
    expect(evaluarRequisito("Next", { ...ctx, edad_hijo: 15 }).cumple).toBe(true);
    expect(evaluarRequisito("Next", { ...ctx, edad_hijo: 12 }).cumple).toBe(false);
  });

  it("sin etapa, los requisitos de etapa no se cumplen", () => {
    expect(evaluarRequisito("Sales_Machine", { ...base, etapa_nivel: null }).cumple).toBe(false);
  });
});

describe("ranking", () => {
  it("ordena, etiqueta y oculta lo que no llega a 0.40", () => {
    const filas = calcularRanking(
      fitsDe({ Sales_Machine: 0.85, LinkedIn_Sales: 0.8, AI_Sales: 0.45, Instagram_TikTok: 0.15 }),
      { ctx: base, ...sinOpciones },
      umbrales,
    );
    const vis = visibles(filas, umbrales).map(aFilaVisible);
    expect(vis.map((f) => f.id)).toEqual(["Sales_Machine", "LinkedIn_Sales", "AI_Sales"]);
    expect(vis.map((f) => f.etiqueta)).toEqual([
      "Muy recomendado",
      "Muy recomendado",
      "Podría servirte",
    ]);
  });

  it("deja visible al de mayor fit con su condición pendiente y elige otro como recomendable", () => {
    const filas = calcularRanking(
      fitsDe({ Sales_Machine: 0.85, Fundraising_Fundamentals: 0.7 }),
      { ctx: { ...base, etapa_nivel: 0 }, ...sinOpciones },
      umbrales,
    );
    const vis = visibles(filas, umbrales).map(aFilaVisible);
    expect(vis[0]?.id).toBe("Sales_Machine");
    expect(vis[0]?.condicion_pendiente).not.toBeNull();
    expect(primerRecomendable(filas, umbrales)?.programa).toBe("Fundraising_Fundamentals");
  });

  it("degrada a la mitad los programas fuera de las familias confirmadas, y no sin familias", () => {
    const fits = fitsDe({ Sales_Machine: 0.8, Fundraising_Fundamentals: 0.8, Next: 0.8 });
    const con = calcularRanking(
      fits,
      { ctx: base, ...sinOpciones, familiasConfirmadas: ["ventas"] },
      umbrales,
    );
    const fitDe = (id: IdPrograma) => con.find((f) => f.programa === id)?.fit;
    expect(fitDe("Sales_Machine")).toBe(0.8);
    expect(fitDe("Fundraising_Fundamentals")).toBe(0.4);
    expect(fitDe("Next")).toBe(0.8);
    const sin = calcularRanking(fits, { ctx: base, ...sinOpciones }, umbrales);
    expect(sin.find((f) => f.programa === "Fundraising_Fundamentals")?.fit).toBe(0.8);
  });

  it("degradado y fuera de familia no se acumulan", () => {
    const filas = calcularRanking(
      fitsDe({ Instagram_TikTok: 0.8 }),
      {
        ctx: base,
        ...sinOpciones,
        familiasConfirmadas: ["capital"],
        degradados: ["Instagram_TikTok"],
      },
      umbrales,
    );
    expect(filas.find((f) => f.programa === "Instagram_TikTok")?.fit).toBe(0.4);
  });
});
