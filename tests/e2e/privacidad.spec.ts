import { expect, test } from "@playwright/test";

test("el aviso de privacidad dice qué se guarda, para qué y cómo escribir", async ({ page }) => {
  await page.goto("/privacidad.html");
  const cuerpo = await page.locator("main").innerText();
  for (const texto of ["nombre", "correo", "WhatsApp", "empresa", "reto", "prototipo no oficial"]) {
    expect(cuerpo.toLowerCase()).toContain(texto.toLowerCase());
  }
  await expect(
    page.getByRole("link", { name: /repositorio de GitHub \(issues\)/ }),
  ).toHaveAttribute("href", "https://github.com/avg031396-sys/diagnostico-30x-jev/issues");
  expect(cuerpo).not.toMatch(/\S+@\S+\.\S+/);
});
