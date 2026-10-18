import { describe, expect, it } from "vitest";
import insumos from "../../src/data/insumos-jev.json" with { type: "json" };
import type { ResultadoMotor } from "../../src/motor/tipos.ts";
import type { CasoPrueba } from "../../src/qa/evaluar.ts";
import { evaluarCaso, respuestasAutomaticas, totalizar } from "../../src/qa/evaluar.ts";

const CASOS = insumos.casos_prueba as unknown as CasoPrueba[];

const ev = { respuestas: null, latencia_ms: 10, costo_usd: 0.001 };
const extra = { dolores_confirmados: [], respuestas_seguimiento: {} };

function resultado(top: string | null, revision: boolean, orden: string[]): ResultadoMotor {
  return {
    tipo: "recomendado",
    programa_top: top
      ? {
          id: top as never,
          nombre: top,
          url: "",
          fit: 0.9,
          etiqueta: "Muy recomendado",
          cumple_requisito: true,
          condicion_pendiente: null,
        }
      : null,
    requiere_revision: revision,
    ranking: [],
    cercanos: [],
    motivo_top: "",
    familias: [],
    chips: [],
    orden: orden as never,
  };
}

const caso = (esperado?: string, acepta?: string[]): CasoPrueba => ({
  id: "x-1",
  tipo: "limpio",
  estado: { perfil: "founder", etapa: "creciendo", reto_principal: "r" },
  esperado: esperado ? { programa_recomendado: esperado } : {},
  acepta_programa_recomendado: acepta,
});

describe("evaluarCaso", () => {
  it("top-1 y top-3 cuentan sobre el programa esperado", () => {
    const f = evaluarCaso(
      caso("Sales_Machine"),
      ev,
      resultado("LinkedIn_Sales", false, ["LinkedIn_Sales", "AI_Sales", "Sales_Machine"]),
      extra,
    );
    expect(f.acierto_top1).toBe(false);
    expect(f.acierto_top3).toBe(true);
    expect(f.evaluable).toBe(true);
  });

  it("esperado requiere_revision o no_aplica acierta si el motor marca revisión", () => {
    const c = caso("no_aplica", ["no_aplica", "requiere_revision"]);
    expect(
      evaluarCaso(c, ev, resultado("Sales_Machine", true, ["Sales_Machine"]), extra).acierto_top1,
    ).toBe(true);
    expect(
      evaluarCaso(c, ev, resultado("Sales_Machine", false, ["Sales_Machine"]), extra).acierto_top1,
    ).toBe(false);
  });

  it("sin esperado el caso no es evaluable", () => {
    expect(evaluarCaso(caso(), ev, resultado("Sales_Machine", false, []), extra).evaluable).toBe(
      false,
    );
  });
});

describe("totalizar y casos", () => {
  it("cuenta solo evaluables y calcula percentiles", () => {
    const filas = [
      evaluarCaso(
        caso("Sales_Machine"),
        { ...ev, latencia_ms: 10 },
        resultado("Sales_Machine", false, ["Sales_Machine"]),
        extra,
      ),
      evaluarCaso(
        caso("Sales_Machine"),
        { ...ev, latencia_ms: 30 },
        resultado("AI_Sales", false, ["AI_Sales"]),
        extra,
      ),
      evaluarCaso(
        caso(),
        { ...ev, latencia_ms: 20 },
        resultado("AI_Sales", false, ["AI_Sales"]),
        extra,
      ),
    ];
    const t = totalizar(filas);
    expect(t).toMatchObject({
      total: 3,
      evaluables: 2,
      aciertos_top1: 1,
      aciertos_top3: 1,
      latencia_p50: 20,
    });
    expect(t.latencia_p95).toBe(30);
    expect(t.costo_total).toBeCloseTo(0.003);
  });

  it("los insumos traen 60 casos y las respuestas automáticas salen del caso", () => {
    expect(CASOS).toHaveLength(60);
    const limpio = CASOS.find((c) => c.id === "limpio-01");
    expect(limpio && respuestasAutomaticas(limpio)).toEqual({
      facturacion: "1M-20M",
      cliente: "b2b",
      reuniones: "20_o_mas",
    });
  });
});
