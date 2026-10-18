import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Escanea el código que se publica y falla si aparece algo que nunca debe llegar al repo:
// el webhook de 30X, claves reales, cabeceras con valor literal o un teléfono de 30X.
const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const CARPETAS = ["src", "public", "scripts", "migrations"];
const BINARIOS = new Set([".png", ".jpg", ".jpeg", ".ico", ".woff", ".woff2"]);
const SALTAR_EN_RAIZ = new Set(["worker-configuration.d.ts", "package-lock.json"]);

const PATRONES: { nombre: string; regex: RegExp }[] = [
  { nombre: "webhook de Apps Script", regex: /script\.google\.com\/macros/i },
  { nombre: "clave de OpenRouter", regex: /sk-or-[A-Za-z0-9_-]{8,}/ },
  { nombre: "clave de Composio", regex: /\bak_[A-Za-z0-9_-]{8,}/ },
  {
    nombre: "x-api-key con valor literal",
    regex: /x-api-key["']?\s*[:=]\s*["'][^"'\s]{8,}["']/i,
  },
  { nombre: "Bearer literal", regex: /Bearer\s+[A-Za-z0-9._~+/=-]{20,}/ },
  { nombre: "teléfono +57 literal", regex: /\+57[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}/ },
];

function archivosDe(carpeta: string): string[] {
  if (!existsSync(carpeta)) {
    return [];
  }
  const salida: string[] = [];
  for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name !== "node_modules") {
        salida.push(...archivosDe(ruta));
      }
    } else if (!BINARIOS.has(extname(entrada.name).toLowerCase())) {
      salida.push(ruta);
    }
  }
  return salida;
}

function archivosSueltosDeLaRaiz(): string[] {
  return readdirSync(RAIZ, { withFileTypes: true })
    .filter((e) => e.isFile())
    .filter((e) => !e.name.startsWith(".env") && e.name !== ".dev.vars")
    .filter((e) => !SALTAR_EN_RAIZ.has(e.name))
    .filter((e) => !BINARIOS.has(extname(e.name).toLowerCase()))
    .map((e) => join(RAIZ, e.name));
}

const ARCHIVOS = [
  ...CARPETAS.flatMap((c) => archivosDe(join(RAIZ, c))),
  ...archivosSueltosDeLaRaiz(),
];

describe("secretos y datos que nunca deben llegar al repo", () => {
  it("revisa al menos un archivo", () => {
    expect(ARCHIVOS.length).toBeGreaterThan(0);
  });

  for (const { nombre, regex } of PATRONES) {
    it(`no hay ${nombre}`, () => {
      const coincidencias: string[] = [];
      for (const archivo of ARCHIVOS) {
        const lineas = readFileSync(archivo, "utf8").split(/\r?\n/);
        for (const [i, linea] of lineas.entries()) {
          if (regex.test(linea)) {
            coincidencias.push(`${relative(RAIZ, archivo)}:${i + 1}`);
          }
        }
      }
      expect(coincidencias).toEqual([]);
    });
  }
});
