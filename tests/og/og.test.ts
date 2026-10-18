import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PROGRAMAS } from "../../src/motor/catalogo.ts";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const IDS = [...PROGRAMAS.map((p) => p.id), "default"];

describe("imágenes OG", () => {
  for (const id of IDS) {
    it(`${id}.png existe, mide 1200x630 y pesa menos de 300 KB`, () => {
      const ruta = `${RAIZ}public/og/${id}.png`;
      expect(existsSync(ruta)).toBe(true);
      const bytes = readFileSync(ruta);
      expect(bytes.readUInt32BE(16)).toBe(1200);
      expect(bytes.readUInt32BE(20)).toBe(630);
      expect(statSync(ruta).size).toBeLessThan(300 * 1024);
    });
  }
});
