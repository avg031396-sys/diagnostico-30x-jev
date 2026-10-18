import { describe, expect, it, vi } from "vitest";
import { ejecutar, prompt } from "../../scripts/comparar-llm.ts";
import insumos from "../../src/data/insumos-jev.json" with { type: "json" };
import type { CasoPrueba } from "../../src/qa/evaluar.ts";

const CASOS = insumos.casos_prueba as unknown as CasoPrueba[];

function respuesta(programa: string) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ programa }) } }],
      usage: { cost: 0.0001 },
    }),
  );
}

describe("comparar-llm", () => {
  it("el prompt no lleva datos de contacto ni evidencia, y sí las opciones del Choice", () => {
    const texto = prompt(CASOS[0] as CasoPrueba);
    expect(texto).toContain("Inmersion_Ejecutiva");
    expect(texto).toContain("reto_principal");
    expect(texto).not.toContain("youtube.com");
    expect(texto).not.toMatch(/@|whatsapp/i);
  });

  it("sin modelo devuelve 2 y sin clave devuelve 3, sin llamar a fetch", async () => {
    const fetchFn = vi.fn();
    const f = fetchFn as unknown as typeof fetch;
    expect(await ejecutar({ args: [], env: {}, fetchFn: f, imprimir: () => undefined })).toBe(2);
    expect(
      await ejecutar({ args: ["--modelo", "x/y"], env: {}, fetchFn: f, imprimir: () => undefined }),
    ).toBe(3);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("cuenta aciertos contra el programa esperado y guarda el detalle", async () => {
    const caso = CASOS[0] as CasoPrueba;
    const esperado = caso.esperado?.programa_recomendado ?? "";
    const fetchFn = vi.fn().mockImplementation(async () => respuesta(esperado));
    const salida: string[] = [];
    let guardado = "";
    const codigo = await ejecutar({
      args: ["--modelo", "x/y", "--limite", "2"],
      env: { OPENROUTER_API_KEY: "clave-ficticia" },
      fetchFn,
      imprimir: (t) => salida.push(t),
      guardar: (_ruta, contenido) => {
        guardado = contenido;
      },
    });
    expect(codigo).toBe(0);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const json = JSON.parse(guardado) as { total: number; aciertos: number };
    expect(json.total).toBe(2);
    expect(json.aciertos).toBeGreaterThanOrEqual(1);
    expect(salida.join("\n")).toContain("Top-1:");
  });

  it("una respuesta inválida cuenta como fallo, no rompe la corrida", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("no es json"));
    let guardado = "";
    await ejecutar({
      args: ["--modelo", "x/y", "--limite", "1"],
      env: { OPENROUTER_API_KEY: "k" },
      fetchFn,
      imprimir: () => undefined,
      guardar: (_r, c) => {
        guardado = c;
      },
    });
    expect((JSON.parse(guardado) as { aciertos: number }).aciertos).toBe(0);
  });
});
