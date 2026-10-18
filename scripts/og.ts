import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { PROGRAMAS } from "../src/motor/catalogo.ts";

// Genera public/og/<id>.png (1200x630) para cada programa y para `default`.
// Las fuentes se incrustan como data: URI; si no se encuentran, sigue con system-ui.
function fuente(paquete: string, archivo: string, familia: string, extra: string): string {
  try {
    const raiz = fileURLToPath(new URL(".", import.meta.resolve(`${paquete}/package.json`)));
    const base64 = readFileSync(`${raiz}files/${archivo}`).toString("base64");
    return `@font-face { font-family: "${familia}"; ${extra} src: url(data:font/woff2;base64,${base64}) format("woff2"); }`;
  } catch {
    console.warn(`aviso: no se encontró la fuente ${familia}; se usa system-ui`);
    return "";
  }
}

const fuentes = [
  fuente(
    "@fontsource-variable/inter",
    "inter-latin-wght-normal.woff2",
    "Inter Variable",
    "font-weight: 100 900;",
  ),
  fuente(
    "@fontsource/instrument-serif",
    "instrument-serif-latin-400-italic.woff2",
    "Instrument Serif",
    "font-style: italic; font-weight: 400;",
  ),
].join("\n");

// Una palabra en Instrument Serif itálica lima: la última del nombre.
function conAcento(nombre: string): string {
  const palabras = nombre.split(" ");
  const ultima = palabras.pop() ?? "";
  return [...palabras, `<em>${ultima}</em>`].join(" ");
}

const plantilla = readFileSync(new URL("./og-plantilla.html", import.meta.url), "utf8");
const raizProyecto = fileURLToPath(new URL("../", import.meta.url));
mkdirSync(`${raizProyecto}public/og`, { recursive: true });

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
const objetivos = [
  ...PROGRAMAS.map((p) => ({ id: p.id, nombre: p.nombre })),
  { id: "default", nombre: "tu programa de 30X" },
];
for (const o of objetivos) {
  const html = plantilla
    .replace("__FUENTES__", fuentes)
    .replace("__PROGRAMA__", conAcento(o.nombre));
  await pagina.setContent(html);
  await pagina.screenshot({ path: `${raizProyecto}public/og/${o.id}.png` });
  console.log(`og: public/og/${o.id}.png`);
}
await navegador.close();
