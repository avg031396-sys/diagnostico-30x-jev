import { describe, expect, it, vi } from "vitest";
import { ejecutar } from "../../scripts/jev-en-vivo.ts";
import fixture from "../fixtures/openrouter-decision.json" with { type: "json" };

const env = {
  JEV_MODE: "composio-proxy",
  JEV_MODEL: "typesafe/jev-1.14",
  COMPOSIO_API_KEY: "clave-ficticia",
  COMPOSIO_OPENROUTER_ACCOUNT_ID: "ca_ficticia",
};

describe("jev-en-vivo", () => {
  it("hace una sola petición e imprime programa, confianza, latencia y costo", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: fixture, status: 200 })));
    const salida: string[] = [];
    const codigo = await ejecutar({ env, fetchFn, imprimir: (t) => salida.push(t) });
    expect(codigo).toBe(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const texto = salida.join("\n");
    expect(texto).toContain("Sales_Machine");
    expect(texto).toContain("Confianza");
    expect(texto).toContain("Latencia");
    expect(texto).toContain("Costo");
  });

  it("sin claves de Composio devuelve 3 sin llamar a fetch", async () => {
    const fetchFn = vi.fn();
    const codigo = await ejecutar({
      env: { JEV_MODE: "composio-proxy" },
      fetchFn: fetchFn as unknown as typeof fetch,
      imprimir: () => undefined,
    });
    expect(codigo).toBe(3);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("con otro modo devuelve 2", async () => {
    const codigo = await ejecutar({ env: { JEV_MODE: "mock" }, imprimir: () => undefined });
    expect(codigo).toBe(2);
  });
});
