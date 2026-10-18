import type { Page } from "@playwright/test";

export const RETO_VENTAS =
  "Vendo por referidos y no tengo un proceso comercial ordenado. Ya facturo unos USD 300 mil al año.";
export const RETO_VAGO =
  "Quiero mejorar en general y que todo vaya mejor el próximo año con mi negocio actual.";

let contador = 0;

export async function llenarContacto(page: Page, nombre = "Alonso Valdés") {
  contador += 1;
  const correo = `ui-${Date.now()}-${contador}@example.com`;
  await page.goto("/");
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("WhatsApp").fill("+57 300 000 0000");
  await page.getByLabel("Acepto que guarden mis datos").check();
  await page.getByRole("button", { name: "Empezar" }).click();
  return correo;
}

// Recorre hasta el reto y lo envía.
export async function enviarReto(
  page: Page,
  reto: string,
  perfil = "Fundador/a",
  etapa = "Ya factura, arrancando",
) {
  await page.getByRole("button", { name: perfil }).click();
  await page.getByRole("button", { name: etapa }).click();
  await page.getByLabel("Tu reto, con tus palabras").fill(reto);
  await page.getByRole("button", { name: "Analizar mi reto" }).click();
}
