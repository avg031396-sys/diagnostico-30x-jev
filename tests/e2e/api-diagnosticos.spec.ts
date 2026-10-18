import { expect, test } from "@playwright/test";

const RETO_VENTAS =
  "Vendo por referidos y no tengo un proceso comercial ordenado. Ya facturo unos USD 300 mil al año.";
const RETO_VAGO =
  "Quiero mejorar en general y que todo vaya mejor el próximo año con mi negocio actual.";

let contador = 0;
function cuerpo(reto: string, etapa = "arrancando", extra: Record<string, unknown> = {}) {
  contador += 1;
  return {
    contacto: {
      nombre: "Alonso Valdés",
      email: `prueba-${Date.now()}-${contador}@example.com`,
      whatsapp: "+57 300 000 0000",
    },
    consentimiento: true,
    perfil: "founder",
    etapa,
    reto,
    ...extra,
  };
}

test("crea un diagnóstico con el reto de ventas", async ({ request }) => {
  const r = await request.post("/api/diagnosticos", { data: cuerpo(RETO_VENTAS) });
  expect(r.status()).toBe(201);
  const json = await r.json();
  expect(json.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
  expect(json.dolores_detectados).toContainEqual(
    expect.objectContaining({ id: "bloqueo_comercial", etiqueta: "Pocas ventas" }),
  );
  expect(json.necesita_aclaracion).toBe(false);
});

test("rechaza sin consentimiento o con reto corto", async ({ request }) => {
  const sinConsentimiento = await request.post("/api/diagnosticos", {
    data: cuerpo(RETO_VENTAS, "arrancando", { consentimiento: false }),
  });
  expect(sinConsentimiento.status()).toBe(400);
  expect((await sinConsentimiento.json()).error.code).toBe("VALIDACION");
  const corto = await request.post("/api/diagnosticos", { data: cuerpo("muy corto") });
  expect(corto.status()).toBe(400);
  expect((await corto.json()).error.code).toBe("VALIDACION");
});

test("reto vago pide aclaración y aclarar abre la familia de capital", async ({ request }) => {
  const r = await request.post("/api/diagnosticos", { data: cuerpo(RETO_VAGO, "mvp") });
  expect(r.status()).toBe(201);
  const { token, necesita_aclaracion } = await r.json();
  expect(necesita_aclaracion).toBe(true);
  const a = await request.post(`/api/diagnosticos/${token}/aclarar`, {
    data: { dolores: ["capital"], metas: ["levantar_capital"] },
  });
  expect(a.status()).toBe(200);
  const json = await a.json();
  expect(json.dolores_detectados).toContainEqual(expect.objectContaining({ id: "busca_capital" }));
  expect(json.necesita_aclaracion).toBe(false);
  // Segunda aclaración: 409.
  const otra = await request.post(`/api/diagnosticos/${token}/aclarar`, {
    data: { dolores: ["capital"], metas: [] },
  });
  expect(otra.status()).toBe(409);
  expect((await otra.json()).error.code).toBe("YA_HUBO_ACLARACION");
});

test("un token que no existe da 404", async ({ request }) => {
  const r = await request.post("/api/diagnosticos/AAAAAAAAAAAAAAAAAAAAAA/aclarar", {
    data: { dolores: ["ventas"], metas: [] },
  });
  expect(r.status()).toBe(404);
  expect((await r.json()).error.code).toBe("NO_ENCONTRADO");
});

test("si JEV falla responde 502 con token y guarda el lead en error", async ({ request }) => {
  const r = await request.post("/api/diagnosticos", {
    data: cuerpo(`${RETO_VENTAS} Quiero simular falla de jev para probar.`),
  });
  expect(r.status()).toBe(502);
  const json = await r.json();
  expect(json.error.code).toBe("JEV_NO_DISPONIBLE");
  expect(json.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
});
