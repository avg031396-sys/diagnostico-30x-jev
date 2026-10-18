import { describe, expect, it, vi } from "vitest";
import type { Bindings } from "../../src/worker/app.ts";
import { app } from "../../src/worker/app.ts";
import { CSP, compararSeguro } from "../../src/worker/seguridad.ts";

function entorno(limiteActivo: string, limit = vi.fn().mockResolvedValue({ success: true })) {
  return {
    env: {
      JEV_MODE: "mock",
      JEV_MODEL: "typesafe/jev-1.14",
      LIMITE_ACTIVO: limiteActivo,
      LIMITE_DIAGNOSTICO: { limit },
    } as unknown as Bindings,
    limit,
  };
}

const CUERPO = {
  contacto: { nombre: "Ana Prueba", email: "ana@example.com", whatsapp: "+57 300 000 0000" },
  consentimiento: true,
  perfil: "founder",
  etapa: "arrancando",
  reto: "Vendo por referidos y no tengo un proceso comercial ordenado en mi empresa.",
};

function post(env: Bindings) {
  return app.request(
    "/api/diagnosticos",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(CUERPO),
    },
    env,
  );
}

describe("cabeceras", () => {
  it("toda respuesta lleva CSP, nosniff, referrer y permissions", async () => {
    const { env } = entorno("0");
    const r = await app.request("/api/salud", {}, env);
    expect(r.headers.get("Content-Security-Policy")).toBe(CSP);
    expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(r.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(r.headers.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=(), payment=()",
    );
  });
});

describe("límite de peticiones", () => {
  it("con el binding en {success:false} responde 429 sin tocar JEV ni D1", async () => {
    const { env, limit } = entorno("1", vi.fn().mockResolvedValue({ success: false }));
    const r = await post(env);
    expect(r.status).toBe(429);
    const json = (await r.json()) as { error: { code: string; message: string } };
    expect(json.error.code).toBe("LIMITE_EXCEDIDO");
    expect(json.error.message).toBe(
      "Recibimos muchas solicitudes desde tu conexión. Espera un minuto y vuelve a intentarlo.",
    );
    expect(limit).toHaveBeenCalledTimes(1);
  });

  it("con LIMITE_ACTIVO=0 no consulta el binding", async () => {
    const { env, limit } = entorno("0");
    await post(env);
    expect(limit).not.toHaveBeenCalled();
  });
});

describe("errores", () => {
  it("una excepción da 500 ERROR_INTERNO sin stack", async () => {
    const { env } = entorno("0");
    const r = await post(env);
    expect(r.status).toBe(500);
    const texto = await r.text();
    expect(JSON.parse(texto).error.code).toBe("ERROR_INTERNO");
    expect(texto).not.toMatch(/TypeError|Error:|^\s*at /m);
  });
});

describe("compararSeguro", () => {
  it("iguales true; distintas del mismo largo y de distinto largo false", () => {
    expect(compararSeguro("token-igual", "token-igual")).toBe(true);
    expect(compararSeguro("token-igual", "token-otro!")).toBe(false);
    expect(compararSeguro("corto", "mucho-mas-largo")).toBe(false);
  });
});
