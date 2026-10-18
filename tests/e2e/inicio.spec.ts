import { expect, test } from "@playwright/test";
import { enviarReto, llenarContacto, RETO_VENTAS } from "./ayudas.ts";

test("el contacto se pide al final, valida en el navegador y no envía nada a /api/", async ({
  page,
}) => {
  const peticiones: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/")) {
      peticiones.push(r.url());
    }
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Fundador/a" }).click();
  await page.getByRole("button", { name: "Tengo una idea" }).click();
  await page.getByLabel("Tu reto, con tus palabras").fill(RETO_VENTAS);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "4");
  await page.getByRole("button", { name: "Analizar mi reto" }).click();
  await expect(page.getByText("Escribe tu nombre.")).toBeVisible();
  await expect(page.getByText("Escribe un correo válido.")).toBeVisible();
  await expect(page.getByText("Escribe un WhatsApp válido, solo números.")).toBeVisible();
  await expect(page.getByText("Necesitamos tu autorización para continuar.")).toBeVisible();
  expect(peticiones).toEqual([]);
});

test("el perfil muestra 5 opciones y un medidor en 1", async ({ page }) => {
  await llenarContacto(page);
  await expect(page.getByText("¿Cuál es tu punto de partida?")).toBeVisible();
  for (const nombre of [
    "Fundador/a",
    "Ejecutivo/a",
    "Represento una empresa",
    "Tengo un hijo/a adolescente (13-18)",
    "Independiente / consultor",
  ]) {
    await expect(page.getByRole("button", { name: nombre })).toBeVisible();
  }
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
});

test("padre o madre pide la edad en lugar de la etapa", async ({ page }) => {
  await llenarContacto(page);
  await page.getByRole("button", { name: "Tengo un hijo/a adolescente (13-18)" }).click();
  await expect(page.getByLabel("Edad de tu hijo/a")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tengo una idea" })).toHaveCount(0);
});

test("el reto exige 40 caracteres, muestra el contador y copia los ejemplos", async ({ page }) => {
  await llenarContacto(page);
  await page.getByRole("button", { name: "Fundador/a" }).click();
  await page.getByRole("button", { name: "Tengo una idea" }).click();
  const boton = page.getByRole("button", { name: "Continuar" });
  await expect(boton).toBeDisabled();
  await page.getByLabel("Tu reto, con tus palabras").fill("corto");
  await expect(page.getByText("5/1200")).toBeVisible();
  await expect(boton).toBeDisabled();
  await page.getByRole("button", { name: /Vendo por referidos y no tengo/ }).click();
  await expect(boton).toBeEnabled();
  await expect(page.getByLabel("Tu reto, con tus palabras")).toHaveValue(/Vendo por referidos/);
});

test("el envío hace un solo POST y un fallo de JEV ofrece asesor", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/diagnosticos")) {
      posts.push(r.url());
    }
  });
  await llenarContacto(page);
  await enviarReto(page, `${RETO_VENTAS} Quiero simular falla de jev.`);
  await expect(page.getByText("Tuvimos un problema al analizar tu reto")).toBeVisible();
  await page.getByRole("button", { name: "Habla con un asesor de 30X" }).click();
  await expect(page.getByText("Listo, un asesor te contactará")).toBeVisible();
  expect(posts).toHaveLength(1);
});

test("el foco con Tab es visible y el pie está presente", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const estilo = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement as Element);
    return { estilo: s.outlineStyle, ancho: Number.parseFloat(s.outlineWidth) };
  });
  expect(estilo.estilo).not.toBe("none");
  expect(estilo.ancho).toBeGreaterThanOrEqual(2);
  await expect(
    page.getByText("Prototipo para el Hackatón 30X · no oficial · código abierto en"),
  ).toBeVisible();
});
