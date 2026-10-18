import { expect, test } from "@playwright/test";

const TOKEN = "token-e2e-local";
const auth = { Authorization: `Bearer ${TOKEN}` };

test("sin token válido el lote da 401", async ({ request }) => {
  const r = await request.post("/api/qa/lote", { data: { lote: 0 } });
  expect(r.status()).toBe(401);
  expect((await r.json()).error.code).toBe("NO_AUTORIZADO");
  const mal = await request.post("/api/qa/lote", {
    data: { lote: 0 },
    headers: { Authorization: "Bearer otro" },
  });
  expect(mal.status()).toBe(401);
});

test("corre los lotes, cierra y la última corrida es pública", async ({ request }) => {
  const primero = await request.post("/api/qa/lote", { data: { lote: 0 }, headers: auth });
  expect(primero.status()).toBe(200);
  const { run_id, procesados, lotes_total } = await primero.json();
  expect(procesados).toBe(10);
  expect(lotes_total).toBe(6);
  for (let lote = 1; lote < lotes_total; lote++) {
    const r = await request.post("/api/qa/lote", { data: { run_id, lote }, headers: auth });
    expect(r.status()).toBe(200);
  }
  // El mismo lote dos veces no duplica casos.
  const repetido = await request.post("/api/qa/lote", { data: { run_id, lote: 0 }, headers: auth });
  expect((await repetido.json()).procesados).toBe(0);
  const cierre = await request.post(`/api/qa/${run_id}/cerrar`, { headers: auth });
  expect(cierre.status()).toBe(200);
  const totales = await cierre.json();
  expect(totales.total).toBe(60);
  expect(totales.evaluables).toBe(54);

  const ultima = await request.get("/api/qa/ultima");
  expect(ultima.status()).toBe(200);
  const { run } = await ultima.json();
  expect(run.estado).toBe("cerrado");
  expect(run.detalle).toHaveLength(60);
  for (const clave of ["id", "tipo", "esperado", "top1", "top3", "acierto_top1", "latencia_ms"]) {
    expect(run.detalle[0]).toHaveProperty(clave);
  }
});

test("un lote fuera de rango o sin run_id da 400", async ({ request }) => {
  expect((await request.post("/api/qa/lote", { data: { lote: 99 }, headers: auth })).status()).toBe(
    400,
  );
  expect((await request.post("/api/qa/lote", { data: { lote: 2 }, headers: auth })).status()).toBe(
    400,
  );
});
