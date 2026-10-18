import { zValidator } from "@hono/zod-validator";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import insumos from "../data/insumos-jev.json" with { type: "json" };
import { crearClienteJev, evaluarConReintento } from "../jev/cliente.ts";
import { construirEstado, construirPreguntas } from "../jev/preguntas.ts";
import { ETAPA_NIVEL } from "../motor/catalogo.ts";
import { detectarDolores } from "../motor/dolores.ts";
import { resolverResultado } from "../motor/resultado.ts";
import type { CasoPrueba, FilaQa } from "../qa/evaluar.ts";
import { evaluarCaso, respuestasAutomaticas, totalizar } from "../qa/evaluar.ts";
import type { Bindings } from "./app.ts";
import { alFallar } from "./esquemas.ts";
import { configJevDesdeEnv, UMBRALES } from "./flujo.ts";
import { compararSeguro } from "./seguridad.ts";

export const qa = new Hono<{ Bindings: Bindings }>();

const CASOS = insumos.casos_prueba as unknown as CasoPrueba[];
const TAMANO_LOTE = 10;
const LOTES_TOTAL = Math.ceil(CASOS.length / TAMANO_LOTE);

type FilaRun = {
  id: string;
  created_at: string;
  estado: string;
  modo: string;
  modelo: string;
  umbrales: string;
  lotes_total: number;
  lotes_procesados: string;
  detalle: string;
};

function noAutorizado() {
  return { error: { code: "NO_AUTORIZADO", message: "Token de QA inválido." } };
}

const autorizar: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  const esperado = c.env.QA_TOKEN;
  const recibido = (c.req.header("Authorization") ?? "").replace(/^Bearer /, "");
  if (!esperado || !compararSeguro(recibido, esperado)) {
    return c.json(noAutorizado(), 401);
  }
  await next();
  return undefined;
};

qa.use("/lote", autorizar);
qa.use("/:run_id/cerrar", autorizar);

async function evaluarUno(env: Bindings, caso: CasoPrueba): Promise<FilaQa> {
  const seguimiento = respuestasAutomaticas(caso);
  const base = { dolores_confirmados: [], respuestas_seguimiento: seguimiento };
  try {
    const estado = construirEstado({
      perfil: caso.estado.perfil,
      etapa: caso.estado.etapa,
      edad_hijo: caso.estado.edad_hijo,
      reto: caso.estado.reto_principal,
    });
    const cliente = crearClienteJev(configJevDesdeEnv(env));
    const ev = await evaluarConReintento(cliente, estado, construirPreguntas(caso.estado.perfil));
    const dolores = detectarDolores(ev.answers.noul, UMBRALES).map((d) => d.id);
    const nivel = caso.estado.etapa ? ETAPA_NIVEL[caso.estado.etapa] : null;
    const salida = resolverResultado(
      {
        respuestas: ev.answers,
        perfil: caso.estado.perfil,
        etapa_nivel: nivel,
        edad_hijo: caso.estado.edad_hijo ?? null,
        dolores_confirmados: dolores,
        respuestas_seguimiento: seguimiento,
      },
      UMBRALES,
    );
    return evaluarCaso(
      caso,
      { respuestas: ev.answers, latencia_ms: ev.latencia_ms, costo_usd: ev.usage.cost },
      salida.pendiente ? null : salida.resultado,
      { dolores_confirmados: dolores, respuestas_seguimiento: seguimiento },
    );
  } catch {
    // Un caso cuyo JEV falla queda sin top-1 y sin aciertos.
    return evaluarCaso(caso, { respuestas: null, latencia_ms: 0, costo_usd: 0 }, null, base);
  }
}

const esquemaLote = z.object({
  run_id: z.string().min(1).max(64).optional(),
  lote: z.number().int().min(0),
});

qa.post("/lote", zValidator("json", esquemaLote, alFallar), async (c) => {
  const { run_id, lote } = c.req.valid("json");
  if (lote >= LOTES_TOTAL || (lote > 0 && !run_id)) {
    return c.json(
      { error: { code: "VALIDACION", message: "Lote fuera de rango.", campos: ["lote"] } },
      400,
    );
  }
  let id = run_id;
  if (!id) {
    id = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO qa_runs (id, modo, modelo, umbrales, lotes_total) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(id, c.env.JEV_MODE, c.env.JEV_MODEL, JSON.stringify(UMBRALES), LOTES_TOTAL)
      .run();
  }
  const run = await c.env.DB.prepare(
    "SELECT id, estado, lotes_procesados, detalle FROM qa_runs WHERE id = ?",
  )
    .bind(id)
    .first<FilaRun>();
  if (!run) {
    return c.json(
      { error: { code: "NO_ENCONTRADO", message: "No encontramos esa corrida." } },
      404,
    );
  }
  const procesados = JSON.parse(run.lotes_procesados) as number[];
  if (procesados.includes(lote)) {
    return c.json({ run_id: id, lote, procesados: 0, lotes_total: LOTES_TOTAL });
  }
  const casos = CASOS.slice(lote * TAMANO_LOTE, (lote + 1) * TAMANO_LOTE);
  const filas = await Promise.all(casos.map((caso) => evaluarUno(c.env, caso)));
  const detalle = [...(JSON.parse(run.detalle) as FilaQa[]), ...filas];
  await c.env.DB.prepare("UPDATE qa_runs SET lotes_procesados = ?, detalle = ? WHERE id = ?")
    .bind(JSON.stringify([...procesados, lote]), JSON.stringify(detalle), id)
    .run();
  return c.json({ run_id: id, lote, procesados: filas.length, lotes_total: LOTES_TOTAL });
});

qa.post("/:run_id/cerrar", async (c) => {
  const id = c.req.param("run_id");
  const run = await c.env.DB.prepare("SELECT id, detalle FROM qa_runs WHERE id = ?")
    .bind(id)
    .first<FilaRun>();
  if (!run) {
    return c.json(
      { error: { code: "NO_ENCONTRADO", message: "No encontramos esa corrida." } },
      404,
    );
  }
  const t = totalizar(JSON.parse(run.detalle) as FilaQa[]);
  await c.env.DB.prepare(
    `UPDATE qa_runs SET estado = 'cerrado', total = ?, evaluables = ?, aciertos_top1 = ?,
      aciertos_top3 = ?, latencia_p50 = ?, latencia_p95 = ?, costo_total = ? WHERE id = ?`,
  )
    .bind(
      t.total,
      t.evaluables,
      t.aciertos_top1,
      t.aciertos_top3,
      t.latencia_p50,
      t.latencia_p95,
      t.costo_total,
      id,
    )
    .run();
  return c.json({ run_id: id, ...t });
});

qa.get("/ultima", async (c) => {
  const run = await c.env.DB.prepare(
    `SELECT id, created_at, estado, modo, modelo, umbrales, total, evaluables, aciertos_top1,
      aciertos_top3, latencia_p50, latencia_p95, costo_total, detalle
     FROM qa_runs WHERE estado = 'cerrado' ORDER BY created_at DESC, rowid DESC LIMIT 1`,
  ).first<Record<string, unknown>>();
  if (!run) {
    return c.json({ run: null });
  }
  return c.json({
    run: {
      ...run,
      umbrales: JSON.parse(run.umbrales as string),
      detalle: JSON.parse(run.detalle as string),
    },
  });
});
