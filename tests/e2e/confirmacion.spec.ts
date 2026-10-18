import { expect, test } from "@playwright/test";
import { enviarReto, llenarContacto, RETO_VAGO, RETO_VENTAS } from "./ayudas.ts";

test("chips, seguimientos y navegación al resultado", async ({ page }) => {
  await llenarContacto(page);
  await enviarReto(page, RETO_VENTAS);
  await expect(page.getByText("Esto entendí de tu reto")).toBeVisible();
  await expect(page.getByText("Pocas ventas")).toBeVisible();
  await expect(page.getByText("Vendes solo por referidos")).toBeVisible();
  await expect(page.getByRole("button", { name: "Quitar Pocas ventas" })).toBeVisible();
  await page.getByRole("button", { name: "+ agregar" }).click();
  await expect(page.locator(".chip--sumar")).toHaveCount(9); // 8 dolores restantes + el botón
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("¿Le vendes a empresas o a personas?")).toBeVisible();
  await page.getByRole("button", { name: "A empresas" }).click();
  await expect(page.getByText("¿Cuántas reuniones de venta tienes por semana?")).toBeVisible();
  await page.getByRole("button", { name: "Menos de 20" }).click();
  await page.waitForURL(/\/r\/[0-9A-Za-z]{10}$/);
  const id = page.url().split("/r/")[1] ?? "";
  const token = await page.evaluate((i) => sessionStorage.getItem(`diag:${i}`), id);
  expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
});

test("el reto vago pide aclaración con una sola llamada a /aclarar", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/api/diagnosticos")) {
      posts.push(new URL(r.url()).pathname);
    }
  });
  await llenarContacto(page);
  await enviarReto(page, RETO_VAGO, "Fundador/a", "MVP sin facturar");
  await expect(page.getByText("Ayúdanos a entenderte mejor")).toBeVisible();
  await expect(page.locator("button[aria-pressed]")).toHaveCount(11);
  await page.getByRole("button", { name: "Necesito inversión" }).click();
  await page.getByRole("button", { name: "Levantar capital" }).click();
  await expect(page.getByRole("button", { name: "Necesito inversión" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("¿Ya levantaste inversión antes?")).toBeVisible();
  expect(posts.filter((p) => p.endsWith("/aclarar"))).toHaveLength(1);
  expect(posts.filter((p) => p === "/api/diagnosticos")).toHaveLength(1);
});
