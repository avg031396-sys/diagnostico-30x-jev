import { describe, expect, it } from "vitest";
import { borrarPorContacto, DIAS_RETENCION, purgarAntiguos } from "../../src/worker/borrado.ts";

type Sentencia = { sql: string; valores: unknown[] };

// D1 falso: guarda cada sentencia preparada y devuelve las filas indicadas en los SELECT.
function d1Falso(filas: unknown[] = []) {
  const ejecutadas: Sentencia[] = [];
  const preparar = (sql: string) => {
    const s: Sentencia = { sql, valores: [] };
    return {
      bind(...valores: unknown[]) {
        s.valores = valores;
        return this;
      },
      async all() {
        ejecutadas.push(s);
        return { results: filas };
      },
      s,
    };
  };
  const db = {
    prepare: preparar,
    async batch(lote: { s: Sentencia }[]) {
      ejecutadas.push(...lote.map((x) => x.s));
      return [];
    },
  };
  return { db: db as unknown as D1Database, ejecutadas };
}

describe("purgarAntiguos", () => {
  it(`borra leads y tarjetas sin referencia de más de ${DIAS_RETENCION} días`, async () => {
    const { db, ejecutadas } = d1Falso();
    await purgarAntiguos(db, new Date("2026-10-18T07:00:00.000Z"));
    expect(ejecutadas).toHaveLength(2);
    expect(ejecutadas[0]?.sql).toContain("DELETE FROM leads WHERE created_at < ?");
    expect(ejecutadas[0]?.valores).toEqual(["2026-07-20T07:00:00.000Z"]);
    expect(ejecutadas[1]?.sql).toContain("DELETE FROM resultados");
    expect(ejecutadas[1]?.sql).toContain("NOT IN (SELECT resultado_id FROM leads");
  });
});

describe("borrarPorContacto", () => {
  const filas = [
    { id: 1, whatsapp: "+57 300 111 2233", resultado_id: "AbCdEfGhIj" },
    { id: 2, whatsapp: "+57 300 999 0000", resultado_id: null },
  ];

  it("borra solo los leads cuyo WhatsApp coincide (ignorando el formato) y su tarjeta", async () => {
    const { db, ejecutadas } = d1Falso(filas);
    expect(await borrarPorContacto(db, "x@example.com", "573001112233")).toBe(1);
    const borrados = ejecutadas.filter((s) => s.sql.startsWith("DELETE"));
    expect(borrados.map((s) => [s.sql, s.valores])).toEqual([
      ["DELETE FROM leads WHERE id = ?", [1]],
      ["DELETE FROM resultados WHERE id = ?", ["AbCdEfGhIj"]],
    ]);
  });

  it("sin coincidencia no borra nada", async () => {
    const { db, ejecutadas } = d1Falso(filas);
    expect(await borrarPorContacto(db, "x@example.com", "+1 555 000 0000")).toBe(0);
    expect(ejecutadas.some((s) => s.sql.startsWith("DELETE"))).toBe(false);
  });
});
