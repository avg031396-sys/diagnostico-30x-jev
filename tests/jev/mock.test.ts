import { describe, expect, it, vi } from "vitest";
import { crearClienteJev, evaluarConReintento } from "../../src/jev/cliente.ts";
import { crearMockJev } from "../../src/jev/mock.ts";
import { construirEstado, construirPreguntas } from "../../src/jev/preguntas.ts";
import type { EvaluacionJev } from "../../src/jev/tipos.ts";
import { JevError } from "../../src/jev/tipos.ts";

const RETO =
  "Vendo por referidos y no tengo un proceso comercial ordenado. Ya facturo unos USD 300 mil al año.";
const DOLORES = [
  "dependencia_fundador",
  "bloqueo_comercial",
  "quiere_adoptar_ia",
  "busca_capital",
  "busca_expansion",
  "ventas_por_referidos",
  "operacion_desordenada",
  "tareas_repetitivas_ia",
  "dolor_growth",
  "dolor_equipo_talento",
];

function evaluar(reto: string, perfil: "founder" | "corporativo" = "founder") {
  const estado = construirEstado({ perfil, etapa: "creciendo", reto });
  return crearMockJev().evaluar(estado, construirPreguntas(perfil));
}

describe("mock", () => {
  it("evalúa el reto de referidos con los valores esperados", async () => {
    const { answers } = await evaluar(RETO);
    for (const id of DOLORES) {
      const alto = id === "bloqueo_comercial" || id === "ventas_por_referidos";
      expect(answers.noul[id]).toBe(alto ? 0.85 : 0.1);
    }
    expect(answers.noul.fit_sales_machine).toBe(0.85);
    expect(answers.noul.fit_linkedin_sales).toBe(0.85);
    expect(answers.choice).toEqual({ valor: "Sales_Machine", confianza: 0.7 });
  });

  it("es determinista y no cuesta nada", async () => {
    const a = await evaluar(RETO);
    const b = await evaluar(RETO);
    expect(b).toEqual(a);
    expect(a.latencia_ms).toBe(0);
    expect(a.usage.cost).toBe(0);
    expect(a.modelo).toBe("mock");
  });

  it("un reto sin palabras clave es vago y su Choice no_aplica o requiere_revision", async () => {
    const { answers } = await evaluar("xyz abc");
    expect(answers.noul.respuesta_vaga).toBe(0.85);
    expect(answers.choice?.valor).toBe("requiere_revision");
  });

  it("simular falla de jev lanza JEV_HTTP", async () => {
    await expect(evaluar("quiero simular falla de jev")).rejects.toMatchObject({
      codigo: "JEV_HTTP",
    });
  });

  it("corporativo: responde solo lo recibido y elige dentro de sus criteria", async () => {
    const preguntas = construirPreguntas("corporativo");
    const estado = construirEstado({
      perfil: "corporativo",
      reto: "Necesito formar a mis equipos, son 200 colaboradores",
    });
    const { answers } = await crearMockJev().evaluar(estado, preguntas);
    expect(answers.choice?.valor).toBe("Planes_Corporativos");
    const sinMatch = await evaluar("ventas ventas", "corporativo");
    expect(["Planes_Corporativos", "Multipliers", "requiere_revision"]).toContain(
      sinMatch.answers.choice?.valor,
    );
  });
});

describe("fábrica y reintento", () => {
  it("el modo mock nunca llama a fetch", async () => {
    const espia = vi.fn() as unknown as typeof fetch;
    const cliente = crearClienteJev({ modo: "mock", modelo: "typesafe/jev-1.14" }, espia);
    await cliente.evaluar(
      construirEstado({ perfil: "founder", reto: RETO }),
      construirPreguntas("founder"),
    );
    expect(espia).toHaveBeenCalledTimes(0);
  });

  const ok: EvaluacionJev = {
    answers: { noul: {}, choice: null, score: null },
    usage: { input_tokens: 0, cost: 0 },
    latencia_ms: 1,
    modelo: "x",
  };
  const estado = construirEstado({ perfil: "founder", reto: RETO });

  it("falla una vez y luego responde: devuelve la segunda respuesta", async () => {
    const evaluarFn = vi.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce(ok);
    const r = await evaluarConReintento({ evaluar: evaluarFn }, estado, {});
    expect(r).toBe(ok);
    expect(evaluarFn).toHaveBeenCalledTimes(2);
  });

  it("falla dos veces: lanza JevError", async () => {
    const evaluarFn = vi.fn().mockRejectedValue(new Error("x"));
    await expect(evaluarConReintento({ evaluar: evaluarFn }, estado, {})).rejects.toBeInstanceOf(
      JevError,
    );
  });
});
