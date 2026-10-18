import type { Page } from "@playwright/test";

export const RETO_VENTAS =
  "Vendo por referidos y no tengo un proceso comercial ordenado. Ya facturo unos USD 300 mil al año.";
export const RETO_VAGO =
  "Quiero mejorar en general y que todo vaya mejor el próximo año con mi negocio actual.";

let contador = 0;
// El contacto se pide al final (después del reto): se recuerda aquí y lo llena enviarReto.
type Contacto = { nombre: string; correo: string };
const pendientes = new WeakMap<Page, Contacto>();

function nuevoContacto(nombre = "Alonso Valdés"): Contacto {
  contador += 1;
  return { nombre, correo: `ui-${Date.now()}-${contador}@example.com` };
}

// Abre la portada y prepara el contacto que se llenará al final. Devuelve el correo.
export async function llenarContacto(page: Page, nombre = "Alonso Valdés") {
  const contacto = nuevoContacto(nombre);
  pendientes.set(page, contacto);
  await page.goto("/");
  return contacto.correo;
}

export async function llenarFormularioContacto(page: Page, contacto = nuevoContacto()) {
  await page.getByLabel("Nombre").fill(contacto.nombre);
  await page.getByLabel("Correo").fill(contacto.correo);
  await page.getByLabel("WhatsApp").fill("+57 300 000 0000");
  await page.getByLabel("Acepto que guarden mis datos").check();
  await page.getByRole("button", { name: "Analizar mi reto" }).click();
}

// Recorre perfil, etapa y reto; luego llena el contacto y envía.
export async function enviarReto(
  page: Page,
  reto: string,
  perfil = "Fundador/a",
  etapa = "Ya factura, arrancando",
) {
  await page.getByRole("button", { name: perfil }).click();
  await page.getByRole("button", { name: etapa }).click();
  await page.getByLabel("Tu reto, con tus palabras").fill(reto);
  await page.getByRole("button", { name: "Continuar" }).click();
  await llenarFormularioContacto(page, pendientes.get(page));
}
