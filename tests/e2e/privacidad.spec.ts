import { expect, test } from "@playwright/test";

test("el aviso de privacidad dice qué se guarda, para qué, cuánto tiempo y cómo borrar", async ({
  page,
}) => {
  await page.goto("/privacidad.html");
  const cuerpo = await page.locator("main").innerText();
  for (const texto of [
    "nombre",
    "correo",
    "WhatsApp",
    "empresa",
    "reto",
    "prototipo no oficial",
    "90 días",
    "30X no recibe tus datos",
  ]) {
    expect(cuerpo.toLowerCase()).toContain(texto.toLowerCase());
  }
  await expect(page.getByRole("button", { name: "Borrar mis datos" })).toBeVisible();
  expect(cuerpo).not.toMatch(/\S+@\S+\.\S+/);
});

const RETO =
  "Vendo por referidos y no tengo un proceso comercial ordenado. Ya facturo unos USD 300 mil al año.";

test("borrar con correo y WhatsApp elimina el lead y su tarjeta; con otro WhatsApp no", async ({
  request,
}) => {
  const email = `borrado-${Date.now()}@Example.com`;
  const creado = await request.post("/api/diagnosticos", {
    data: {
      contacto: { nombre: "Persona Borrado", email, whatsapp: "+57 300 111 2233" },
      consentimiento: true,
      perfil: "founder",
      etapa: "arrancando",
      reto: RETO,
    },
  });
  const { token } = await creado.json();
  const final = await request.post(`/api/diagnosticos/${token}/finalizar`, {
    data: {
      dolores_confirmados: ["bloqueo_comercial", "ventas_por_referidos"],
      respuestas_seguimiento: { cliente: "b2b", reuniones: "menos_20" },
    },
  });
  const { resultado_id } = await final.json();

  // WhatsApp distinto: misma respuesta, pero no borra nada.
  const otro = await request.post("/api/borrado", {
    data: { email, whatsapp: "+57 300 999 9999" },
  });
  expect(otro.status()).toBe(202);
  expect((await request.get(`/api/resultados/${resultado_id}`)).status()).toBe(200);

  // Correo en otras mayúsculas y WhatsApp con otro formato: borra.
  const ok = await request.post("/api/borrado", {
    data: { email: email.toLowerCase(), whatsapp: "573001112233" },
  });
  expect(ok.status()).toBe(202);
  expect(await ok.json()).toEqual({ ok: true });
  expect((await request.get(`/api/resultados/${resultado_id}`)).status()).toBe(404);
  expect((await request.post(`/api/diagnosticos/${token}/asesor`, {})).status()).toBe(404);
});

test("el borrado valida la entrada", async ({ request }) => {
  const r = await request.post("/api/borrado", { data: { email: "no-es-correo" } });
  expect(r.status()).toBe(400);
  expect((await r.json()).error.code).toBe("VALIDACION");
});
