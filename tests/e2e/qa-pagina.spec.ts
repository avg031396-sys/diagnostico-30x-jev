import { expect, test } from "@playwright/test";

test("la página /qa corre los casos con el token y no guarda nada en el navegador", async ({
  page,
}) => {
  await page.goto("/qa.html");
  await page.getByLabel("Token de QA").fill("incorrecto");
  await page.getByRole("button", { name: "Correr de nuevo" }).click();
  await expect(page.getByText("Token inválido")).toBeVisible();
  await page.getByLabel("Token de QA").fill("token-e2e-local");
  await page.getByRole("button", { name: "Correr de nuevo" }).click();
  await expect(page.getByText("Listo")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Meta de calibración: ≥ 90 % top-1/)).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(60);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});
