import { expect, test } from "@playwright/test";
import { enviarReto, llenarContacto, RETO_VENTAS } from "./ayudas.ts";

test("resultado recomendado, escala, asesor y compartir", async ({ page, context, browser }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const correo = await llenarContacto(page);
  await enviarReto(page, RETO_VENTAS);
  await page.getByRole("button", { name: "Confirmar" }).click();
  await page.getByRole("button", { name: "No tengo un proceso de ventas ordenado" }).click();
  await page.waitForURL(/\/r\/[0-9A-Za-z]{10}$/);

  await expect(page.getByText("Alonso, tu programa es Sales Machine")).toBeVisible();
  await expect(page.locator(".circulo")).toContainText("85%");
  await expect(page.locator(".circulo")).toContainText("Muy recomendado");
  await expect(page.getByText("Te lo recomendamos porque mencionaste:")).toBeVisible();
  await expect(page.getByText("Pocas ventas", { exact: true })).toBeVisible();
  await expect(page.getByText("Tus otras rutas")).toBeVisible();
  await expect(page.getByText("Por qué suma").first()).toBeVisible();
  await expect(page.getByText("Qué te falta").first()).toBeVisible();
  await expect(page.getByText("Clases gratuitas de 30X")).toBeVisible();
  await expect(page.getByRole("link", { name: "Conocer Sales Machine" })).toHaveAttribute(
    "href",
    "https://30x.com/programas/sales-machine",
  );

  // Asesor.
  await page.getByRole("button", { name: "Habla con un asesor de 30X" }).click();
  await expect(page.getByText("Listo, un asesor te contactará")).toBeVisible();

  // Compartir.
  const url = page.url();
  expect(await page.getByRole("link", { name: "LinkedIn" }).getAttribute("href")).toContain(
    "https://www.linkedin.com/sharing/share-offsite/?url=",
  );
  expect(await page.getByRole("link", { name: "X", exact: true }).getAttribute("href")).toContain(
    "https://twitter.com/intent/tweet?text=",
  );
  const wa = (await page.getByRole("link", { name: "WhatsApp" }).getAttribute("href")) ?? "";
  expect(wa.startsWith("https://wa.me/?text=")).toBe(true);
  await page.getByRole("button", { name: "Copiar enlace" }).click();
  await expect(page.getByText("Enlace copiado")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar imagen" }).click();
  expect((await descarga).suggestedFilename()).toMatch(/\.png$/);

  // Vista pública: sin token, sin asesor, sin correo.
  const publico = await browser.newContext();
  const otra = await publico.newPage();
  await otra.goto(url);
  await expect(otra.getByText("Alonso, tu programa es Sales Machine")).toBeVisible();
  await expect(otra.getByRole("button", { name: "Habla con un asesor de 30X" })).toHaveCount(0);
  expect(await otra.content()).not.toContain(correo);
  await publico.close();
});

test("un perfil corporativo recibe una ruta preliminar sin la palabra revisión", async ({
  page,
}) => {
  await llenarContacto(page);
  await enviarReto(
    page,
    "Somos una empresa de logística y queremos vender más a clientes nuevos con un proceso claro este año.",
    "Represento una empresa",
    "Empresa consolidada",
  );
  await page.getByRole("button", { name: "Confirmar" }).click();
  await page.waitForURL(/\/r\/[0-9A-Za-z]{10}$/, { timeout: 15_000 });
  await expect(page.getByText("Tu ruta preliminar:")).toBeVisible();
  await expect(page.getByText("Un asesor de 30X confirma tu ruta")).toBeVisible();
  await expect(page.locator(".boton--primario")).toHaveText("Habla con un asesor de 30X");
  expect((await page.locator("body").innerText()).toLowerCase()).not.toContain("revisión");
});
