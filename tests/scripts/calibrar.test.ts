import { describe, expect, it } from "vitest";
import { ejecutar } from "../../scripts/calibrar.ts";
import insumos from "../../src/data/insumos-jev.json" with { type: "json" };
import umbrales from "../../src/data/umbrales.json" with { type: "json" };
import { PROGRAMAS } from "../../src/motor/catalogo.ts";
import type { Umbrales } from "../../src/motor/tipos.ts";
import { calibrar, rejilla } from "../../src/qa/calibrar.ts";
import type { CasoPrueba, FilaQa } from "../../src/qa/evaluar.ts";

const CASOS = insumos.casos_prueba as unknown as CasoPrueba[];
const BASE = umbrales as Umbrales;
const IDS = new Set<string>(PROGRAMAS.map((p) => p.id));

// Corrida sintética: JEV da al programa esperado de cada caso un fit bajo (0.3) y nada más.
// Con umbral_mostrar 0.4 casi ningún caso acierta; bajarlo a 0.3 los recupera todos.
function detalle(fit: number | null): FilaQa[] {
  return CASOS.filter((c) => IDS.has(c.esperado?.programa_recomendado ?? "")).map((c) => {
    const esperado = c.esperado?.programa_recomendado ?? "";
    return {
      id: c.id,
      tipo: c.tipo,
      esperado,
      top1: null,
      top3: [],
      acierto_top1: false,
      acierto_top3: false,
      evaluable: true,
      confianza_choice: 0.9,
      latencia_ms: 100,
      costo_usd: 0,
      respuestas:
        fit === null
          ? null
          : {
              noul: { [`fit_${esperado.toLowerCase()}`]: fit },
              choice: { valor: esperado, confianza: 0.9 },
              score: null,
            },
      respuestas_seguimiento: {},
      perfil: c.estado.perfil,
      etapa_nivel: null,
      edad_hijo: c.estado.edad_hijo ?? null,
      dolores_confirmados: [],
    };
  });
}

function correr(args: string[], archivo: unknown) {
  const salida: string[] = [];
  const escritos: Record<string, string> = {};
  const codigo = ejecutar({
    args,
    leer: (ruta) => (ruta === "qa.json" ? JSON.stringify(archivo) : null),
    escribir: (ruta, contenido) => {
      escritos[ruta] = contenido;
    },
    imprimir: (t) => salida.push(t),
    base: BASE,
  });
  return { codigo, texto: salida.join("\n"), escritos };
}

describe("calibrar (motor)", () => {
  it("la rejilla nunca pone umbral_mostrar por encima de umbral_recomendar", () => {
    const r = rejilla();
    expect(r.length).toBeGreaterThan(50);
    expect(r.every((c) => c.umbral_mostrar <= c.umbral_recomendar)).toBe(true);
  });

  it("encuentra una combinación mejor cuando la hay", () => {
    const reporte = calibrar(detalle(0.3), CASOS, BASE);
    expect(reporte.mejor.calibracion.top1).toBeGreaterThan(reporte.actual.calibracion.top1);
    expect(reporte.sobreajuste).toBe(false);
  });

  it("sin respuestas de JEV no hay mejora y se quedan los umbrales actuales", () => {
    const reporte = calibrar(detalle(null), CASOS, BASE);
    expect(reporte.mejor).toBe(reporte.actual);
    expect(reporte.actual.calibracion.top1).toBe(0);
  });
});

describe("calibrar (script)", () => {
  it("sin argumentos devuelve 2", () => {
    expect(correr([], {}).codigo).toBe(2);
  });

  it("archivo inexistente o sin detalle devuelve 3", () => {
    expect(correr(["otro.json"], {}).codigo).toBe(3);
    expect(correr(["qa.json"], { run: { detalle: [] } }).codigo).toBe(3);
  });

  it("en seco imprime la tabla y no escribe", () => {
    const r = correr(["qa.json"], { run: { modo: "openrouter", detalle: detalle(0.3) } });
    expect(r.codigo).toBe(0);
    expect(r.texto).toContain("actual");
    expect(r.texto).toContain("elegida");
    expect(Object.keys(r.escritos)).toHaveLength(0);
  });

  it("con --escribir guarda solo los tres umbrales de la rejilla", () => {
    const r = correr(["qa.json", "--escribir"], {
      run: { modo: "openrouter", detalle: detalle(0.3) },
    });
    expect(r.codigo).toBe(0);
    const escrito = JSON.parse(r.escritos["src/data/umbrales.json"] ?? "{}") as Umbrales;
    expect(escrito.umbral_mostrar).toBeLessThanOrEqual(0.3);
    expect(escrito.umbral_dolor).toBe(BASE.umbral_dolor);
    expect(escrito.umbral_vaga).toBe(BASE.umbral_vaga);
    expect(escrito.delta_hermanos).toBe(BASE.delta_hermanos);
  });

  it("no escribe con una corrida del modo mock", () => {
    const r = correr(["qa.json", "--escribir"], { run: { modo: "mock", detalle: detalle(0.3) } });
    expect(r.codigo).toBe(5);
    expect(Object.keys(r.escritos)).toHaveLength(0);
  });
});
