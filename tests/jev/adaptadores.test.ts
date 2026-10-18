import { afterEach, describe, expect, it, vi } from "vitest";
import { crearClienteJev } from "../../src/jev/cliente.ts";
import { construirEstado, construirPreguntas } from "../../src/jev/preguntas.ts";
import fixture from "../fixtures/openrouter-decision.json" with { type: "json" };

const estado = construirEstado({ perfil: "founder", reto: "Vendo poco", etapa: "creciendo" });
const preguntas = construirPreguntas("founder");
const proxy = {
  modo: "composio-proxy" as const,
  modelo: "typesafe/jev-1.14",
  composioApiKey: "clave-de-prueba",
  cuentaOpenrouter: "ca_prueba",
};
const jev = {
  modo: "composio-jev" as const,
  modelo: "typesafe/jev-1.14",
  composioApiKey: "clave-de-prueba",
  cuentaJev: "ca_jev",
};

function respuestaJson(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("composio-proxy", () => {
  it("hace un solo POST con la forma esperada y sin datos personales", async () => {
    const fetchFn = vi.fn().mockResolvedValue(respuestaJson({ data: fixture, status: 200 }));
    await crearClienteJev(proxy, fetchFn).evaluar(estado, preguntas);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://backend.composio.dev/api/v3.1/tools/execute/proxy");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("clave-de-prueba");
    const cuerpo = JSON.parse(init.body as string);
    expect(cuerpo.connected_account_id).toBe("ca_prueba");
    expect(cuerpo.endpoint).toBe("https://openrouter.ai/api/alpha/decisions");
    expect(cuerpo.method).toBe("POST");
    expect(cuerpo.body.model).toBe("typesafe/jev-1.14");
    expect(cuerpo.body.state).toEqual(estado);
    expect(Object.keys(cuerpo.body.questions)).toEqual(Object.keys(preguntas));
    for (const prohibida of ["evidencia", '"nombre"', '"email"', '"whatsapp"', '"empresa"']) {
      expect(init.body as string).not.toContain(prohibida);
    }
  });

  it("normaliza noul, choice, score y costo", async () => {
    const fetchFn = vi.fn().mockResolvedValue(respuestaJson({ data: fixture, status: 200 }));
    const r = await crearClienteJev(proxy, fetchFn).evaluar(estado, preguntas);
    expect(r.answers.noul.bloqueo_comercial).toBe(0.85);
    expect(r.answers.choice).toEqual({ valor: "Sales_Machine", confianza: 0.72 });
    expect(r.answers.score).toEqual({ valor: 2, confianza: 0.66 });
    expect(r.usage.cost).toBe(0.0042);
    expect(r.modelo).toBe("typesafe/jev-1.14");
  });

  it("status 500 dentro del cuerpo o HTTP 401 → JEV_HTTP", async () => {
    const dentro = vi.fn().mockResolvedValue(respuestaJson({ data: {}, status: 500 }));
    await expect(crearClienteJev(proxy, dentro).evaluar(estado, preguntas)).rejects.toMatchObject({
      codigo: "JEV_HTTP",
    });
    const http = vi.fn().mockResolvedValue(respuestaJson({}, 401));
    await expect(crearClienteJev(proxy, http).evaluar(estado, preguntas)).rejects.toMatchObject({
      codigo: "JEV_HTTP",
    });
  });

  it("aborta a los 8000 ms con JEV_TIMEOUT", async () => {
    vi.useFakeTimers();
    const colgado = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("abortado")));
        }),
    );
    const promesa = crearClienteJev(proxy, colgado as unknown as typeof fetch).evaluar(
      estado,
      preguntas,
    );
    const assertion = expect(promesa).rejects.toMatchObject({ codigo: "JEV_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(8000);
    await assertion;
  });

  it("sin claves lanza JEV_CONFIG al crear", () => {
    expect(() => crearClienteJev({ modo: "composio-proxy", modelo: "m" })).toThrowError(
      expect.objectContaining({ codigo: "JEV_CONFIG" }),
    );
  });
});

describe("composio-jev", () => {
  it("acepta data como texto JSON o como objeto con answers", async () => {
    const comoTexto = vi
      .fn()
      .mockResolvedValue(respuestaJson({ data: JSON.stringify(fixture), successful: true }));
    const comoObjeto = vi
      .fn()
      .mockResolvedValue(respuestaJson({ data: { result: fixture }, successful: true }));
    const a = await crearClienteJev(jev, comoTexto).evaluar(estado, preguntas);
    const b = await crearClienteJev(jev, comoObjeto).evaluar(estado, preguntas);
    expect(a.answers).toEqual(b.answers);
    expect(a.answers.choice?.valor).toBe("Sales_Machine");
  });

  it("estructura desconocida → JEV_FORMATO; successful false → JEV_HTTP", async () => {
    const raro = vi.fn().mockResolvedValue(respuestaJson({ data: { otra: 1 }, successful: true }));
    await expect(crearClienteJev(jev, raro).evaluar(estado, preguntas)).rejects.toMatchObject({
      codigo: "JEV_FORMATO",
    });
    const mal = vi.fn().mockResolvedValue(respuestaJson({ successful: false, error: "no" }));
    await expect(crearClienteJev(jev, mal).evaluar(estado, preguntas)).rejects.toMatchObject({
      codigo: "JEV_HTTP",
    });
  });
});
