import { expect, test } from "@playwright/test";

const TOKEN = "token-leads-local";

test("sin token o con token equivocado /api/leads da 401", async ({ request }) => {
  expect((await request.get("/api/leads")).status()).toBe(401);
  const mal = await request.get("/api/leads", { headers: { Authorization: "Bearer otro" } });
  expect(mal.status()).toBe(401);
  expect((await mal.json()).error.code).toBe("NO_AUTORIZADO");
});

test("con token lista leads calificados, sin caché, y el que pide asesor queda caliente", async ({
  request,
}) => {
  const email = `leads-${Date.now()}@example.com`;
  const creado = await request.post("/api/diagnosticos", {
    data: {
      contacto: { nombre: "Persona Leads", email, whatsapp: "+57 300 222 3344" },
      consentimiento: true,
      perfil: "founder",
      etapa: "arrancando",
      reto: "Vendo por referidos y no tengo un proceso comercial ordenado. Ya facturo unos USD 300 mil al año.",
    },
  });
  const { token } = await creado.json();
  await request.post(`/api/diagnosticos/${token}/asesor`, {});

  const r = await request.get("/api/leads", { headers: { Authorization: `Bearer ${TOKEN}` } });
  expect(r.status()).toBe(200);
  expect(r.headers()["cache-control"]).toBe("no-store");
  const { leads } = await r.json();
  const mio = leads.find((l: { email: string }) => l.email === email);
  expect(mio.calificacion).toBe("caliente");
  expect(mio).not.toHaveProperty("token");
  expect(mio).not.toHaveProperty("reto");
});

test("la página de leads pide el token y muestra la tabla", async ({ page }) => {
  await page.goto("/leads.html");
  await page.getByLabel("Token").fill("otro");
  await page.getByRole("button", { name: "Ver leads" }).click();
  await expect(page.getByText("Token inválido.")).toBeVisible();
  await page.getByLabel("Token").fill(TOKEN);
  await page.getByRole("button", { name: "Ver leads" }).click();
  await expect(page.getByRole("columnheader", { name: "Calificación" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});
