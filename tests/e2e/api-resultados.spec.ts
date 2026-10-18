import { expect, test } from "@playwright/test";

const RETO_VENTAS =
  "Vendo por referidos y no tengo un proceso comercial ordenado. Ya facturo unos USD 300 mil al año.";

function cuerpo(reto: string) {
  return {
    contacto: {
      nombre: "Alonso Valdés",
      email: `resultado-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
      whatsapp: "+57 300 000 0000",
      empresa: "Empresa Secreta SA",
    },
    consentimiento: true,
    perfil: "founder",
    etapa: "arrancando",
    reto,
  };
}

const DOLORES = ["bloqueo_comercial", "ventas_por_referidos"];

test("finalizar, resultado público, /r y asesor", async ({ request }) => {
  const creado = await request.post("/api/diagnosticos", { data: cuerpo(RETO_VENTAS) });
  const { token } = await creado.json();

  const pendiente = await request.post(`/api/diagnosticos/${token}/finalizar`, {
    data: { dolores_confirmados: DOLORES },
  });
  expect(pendiente.status()).toBe(200);
  const p = await pendiente.json();
  expect(p.pendiente).toBe(true);
  expect(p.seguimientos[0].id).toBe("cliente");

  const final = await request.post(`/api/diagnosticos/${token}/finalizar`, {
    data: {
      dolores_confirmados: DOLORES,
      respuestas_seguimiento: { cliente: "b2b", reuniones: "menos_20" },
    },
  });
  expect(final.status()).toBe(200);
  const f = await final.json();
  expect(f.pendiente).toBe(false);
  expect(f.resultado_id).toMatch(/^[0-9A-Za-z]{10}$/);
  expect(f.resultado_id).not.toBe(token);
  expect(f.resultado.programa_top.id).toBe("Sales_Machine");

  // Idempotente.
  const otra = await request.post(`/api/diagnosticos/${token}/finalizar`, {
    data: { dolores_confirmados: DOLORES },
  });
  expect((await otra.json()).resultado_id).toBe(f.resultado_id);

  // Resultado público: nombre de pila y nada de contacto.
  const pub = await request.get(`/api/resultados/${f.resultado_id}`);
  expect(pub.status()).toBe(200);
  const texto = await pub.text();
  const json = JSON.parse(texto);
  expect(json.nombre_pila).toBe("Alonso");
  for (const clave of ["email", "whatsapp", "empresa", "token"]) {
    expect(json).not.toHaveProperty(clave);
  }
  expect(texto).not.toContain("example.com");
  expect(texto).not.toContain("Empresa Secreta");
  expect((await request.get("/api/resultados/ZZZZZZZZZZ")).status()).toBe(404);

  // /r/:id con meta OG.
  const pagina = await request.get(`/r/${f.resultado_id}`);
  expect(pagina.status()).toBe(200);
  const html = await pagina.text();
  expect(html).toContain('property="og:title"');
  expect(html).toContain('property="og:description"');
  expect(html).toMatch(/property="og:image" content="http[^"]*\/og\/Sales_Machine\.png"/);
  expect(html).toContain(`/r/${f.resultado_id}"`);
  expect(html).toContain('name="twitter:card"');
  expect(html).toContain('property="og:title"');
  expect((await request.get("/r/ZZZZZZZZZZ")).status()).toBe(404);

  // Asesor.
  const asesor = await request.post(`/api/diagnosticos/${token}/asesor`);
  expect(asesor.status()).toBe(204);
});

test("finalizar sobre un lead en error da 409", async ({ request }) => {
  const creado = await request.post("/api/diagnosticos", {
    data: cuerpo(`${RETO_VENTAS} Quiero simular falla de jev.`),
  });
  expect(creado.status()).toBe(502);
  const { token } = await creado.json();
  const r = await request.post(`/api/diagnosticos/${token}/finalizar`, {
    data: { dolores_confirmados: [] },
  });
  expect(r.status()).toBe(409);
  expect((await r.json()).error.code).toBe("JEV_NO_DISPONIBLE");
  expect((await request.post(`/api/diagnosticos/${token}/asesor`)).status()).toBe(204);
});

test("dos finalizar simultáneos (doble clic) dejan un solo resultado", async ({ request }) => {
  const creado = await request.post("/api/diagnosticos", { data: cuerpo(RETO_VENTAS) });
  const { token } = await creado.json();
  const datos = {
    dolores_confirmados: DOLORES,
    respuestas_seguimiento: { cliente: "b2b", reuniones: "menos_20" },
  };
  const [a, b] = await Promise.all([
    request.post(`/api/diagnosticos/${token}/finalizar`, { data: datos }),
    request.post(`/api/diagnosticos/${token}/finalizar`, { data: datos }),
  ]);
  const [ja, jb] = [await a.json(), await b.json()];
  expect(ja.resultado_id).toMatch(/^[0-9A-Za-z]{10}$/);
  expect(jb.resultado_id).toBe(ja.resultado_id);
  const pub = await request.get(`/api/resultados/${ja.resultado_id}`);
  expect(pub.status()).toBe(200);
});
