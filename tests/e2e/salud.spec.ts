import { expect, test } from "@playwright/test";

// Corre contra `wrangler dev` (lo arranca playwright.config.ts) con JEV_MODE=mock.
test("GET /api/salud responde ok y el modo mock", async ({ request }) => {
  const respuesta = await request.get("/api/salud");
  expect(respuesta.status()).toBe(200);
  expect(await respuesta.json()).toEqual({ ok: true, modo: "mock" });
});

test("la portada es un archivo estático con el título del sitio", async ({ request }) => {
  const respuesta = await request.get("/");
  expect(respuesta.status()).toBe(200);
  expect(await respuesta.text()).toContain("Diagnóstico 30X con JEV");
});

test("una ruta que no existe devuelve 404 con la página 404", async ({ request }) => {
  const respuesta = await request.get("/no-existe");
  expect(respuesta.status()).toBe(404);
  expect(await respuesta.text()).toContain("Esta página no existe");
});

test("una ruta /api inexistente devuelve el error JSON único", async ({ request }) => {
  const respuesta = await request.get("/api/no-existe");
  expect(respuesta.status()).toBe(404);
  expect(await respuesta.json()).toEqual({
    error: { code: "NO_ENCONTRADO", message: "No encontramos lo que buscas." },
  });
});

test("los estáticos y la API devuelven la misma CSP", async ({ request }) => {
  const rutas = ["/", "/no-existe", "/api/salud"];
  const csp: (string | undefined)[] = [];
  for (const ruta of rutas) {
    const respuesta = await request.get(ruta);
    expect(respuesta.headers()["x-content-type-options"]).toBe("nosniff");
    csp.push(respuesta.headers()["content-security-policy"]);
  }
  expect(csp[0]).toBeTruthy();
  expect(csp[1]).toBe(csp[0]);
  expect(csp[2]).toBe(csp[0]);
});
