import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { crearClienteJev, evaluarConReintento } from "../jev/cliente.ts";
import { construirEstado, construirPreguntas } from "../jev/preguntas.ts";
import type { EvaluacionJev, RespuestasJev } from "../jev/tipos.ts";
import { JevError } from "../jev/tipos.ts";
import type { IdFamilia, Perfil } from "../motor/catalogo.ts";
import { DOLORES_ACLARACION, ETAPA_NIVEL, METAS } from "../motor/catalogo.ts";
import { doloresTrasAclaracion } from "../motor/dolores.ts";
import { resolverResultado } from "../motor/resultado.ts";
import type { Bindings } from "./app.ts";
import {
  aclarar,
  alFallar,
  crearDiagnostico,
  finalizar as esquemaFinalizar,
  esquemaToken,
} from "./esquemas.ts";
import {
  armarVista,
  configJevDesdeEnv,
  dolorDetectadoDe,
  MENSAJE_JEV,
  nuevoResultadoId,
  nuevoToken,
  resultadoPublico,
  UMBRALES,
} from "./flujo.ts";
import {
  completarLead,
  crearLead,
  guardarAclaracion,
  guardarConfirmacion,
  marcarAsesor,
  obtenerLead,
  obtenerResultado,
} from "./repositorio.ts";

export const diagnosticos = new Hono<{ Bindings: Bindings }>();

function log(evento: string, token: string, modo: string, ev?: EvaluacionJev) {
  console.log(
    JSON.stringify({
      evento,
      token: token.slice(0, 4),
      modo,
      latencia_ms: ev?.latencia_ms ?? 0,
      costo_usd: ev?.usage.cost ?? 0,
    }),
  );
}

async function llamarJev(
  env: Bindings,
  estado: ReturnType<typeof construirEstado>,
  perfil: Perfil,
) {
  const cliente = crearClienteJev(configJevDesdeEnv(env));
  return evaluarConReintento(cliente, estado, construirPreguntas(perfil));
}

const errorJev = { code: "JEV_NO_DISPONIBLE", message: MENSAJE_JEV };

diagnosticos.post("/", zValidator("json", crearDiagnostico, alFallar), async (c) => {
  const d = c.req.valid("json");
  const token = nuevoToken();
  const estado = construirEstado({
    perfil: d.perfil,
    etapa: d.etapa,
    edad_hijo: d.edad_hijo,
    reto: d.reto,
  });
  const base = {
    token,
    nombre: d.contacto.nombre,
    email: d.contacto.email,
    whatsapp: d.contacto.whatsapp,
    empresa: d.contacto.empresa || null,
    perfil: d.perfil,
    etapa: d.etapa ?? null,
    edad_hijo: d.edad_hijo ?? null,
    reto: d.reto,
    jev_modo: c.env.JEV_MODE,
    jev_modelo: c.env.JEV_MODEL,
  };
  let evaluacion: EvaluacionJev;
  try {
    evaluacion = await llamarJev(c.env, estado, d.perfil);
  } catch (error) {
    const codigo = error instanceof JevError ? error.codigo : "JEV_HTTP";
    await crearLead(c.env.DB, {
      ...base,
      estado: "error",
      jev_respuestas: null,
      jev_error: codigo,
      latencia_ms: 0,
      costo_usd: 0,
    });
    log("jev_error", token, c.env.JEV_MODE);
    return c.json({ error: errorJev, token }, 502);
  }
  await crearLead(c.env.DB, {
    ...base,
    estado: "en_curso",
    jev_respuestas: JSON.stringify(evaluacion.answers),
    jev_error: null,
    latencia_ms: evaluacion.latencia_ms,
    costo_usd: evaluacion.usage.cost,
  });
  log("diagnostico_creado", token, c.env.JEV_MODE, evaluacion);
  const vista = armarVista(
    { perfil: d.perfil, etapa: d.etapa ?? null, edad_hijo: d.edad_hijo ?? null },
    evaluacion.answers,
    dolorDetectadoDe(evaluacion.answers),
    false,
  );
  return c.json({ token, ...vista }, 201);
});

const noEncontrado = { code: "NO_ENCONTRADO", message: "No encontramos lo que buscas." };

diagnosticos.post(
  "/:token/aclarar",
  zValidator("param", esquemaToken, alFallar),
  zValidator("json", aclarar, alFallar),
  async (c) => {
    const { token } = c.req.valid("param");
    const lead = await obtenerLead(c.env.DB, token);
    if (!lead) {
      return c.json({ error: noEncontrado }, 404);
    }
    if (lead.estado === "error") {
      return c.json({ error: errorJev }, 409);
    }
    if (lead.llamadas_jev >= 2) {
      return c.json(
        { error: { code: "YA_HUBO_ACLARACION", message: "Ya recibimos tu aclaración." } },
        409,
      );
    }
    const { dolores, metas } = c.req.valid("json");
    const etiquetasDolores = dolores.flatMap((f) =>
      DOLORES_ACLARACION.filter((a) => a.familia === f).map((a) => a.etiqueta),
    );
    const etiquetasMetas = metas.flatMap((m) =>
      METAS.filter((x) => x.id === m).map((x) => x.etiqueta),
    );
    const perfil = lead.perfil as Perfil;
    const estado = construirEstado({
      perfil,
      etapa: lead.etapa as keyof typeof ETAPA_NIVEL | undefined,
      edad_hijo: lead.edad_hijo ?? undefined,
      reto: lead.reto,
      dolores_elegidos: etiquetasDolores,
      metas_elegidas: etiquetasMetas,
    });
    let evaluacion: EvaluacionJev;
    try {
      evaluacion = await llamarJev(c.env, estado, perfil);
    } catch {
      // Cuenta como la 2.ª llamada y conserva las respuestas de la primera.
      await guardarAclaracion(c.env.DB, token, {
        dolores_elegidos: dolores,
        metas_elegidas: metas,
        jev_respuestas: null,
        latencia_ms: 0,
        costo_usd: 0,
      });
      log("jev_error", token, c.env.JEV_MODE);
      return c.json({ error: errorJev }, 502);
    }
    await guardarAclaracion(c.env.DB, token, {
      dolores_elegidos: dolores,
      metas_elegidas: metas,
      jev_respuestas: JSON.stringify(evaluacion.answers),
      latencia_ms: evaluacion.latencia_ms,
      costo_usd: evaluacion.usage.cost,
    });
    log("aclaracion", token, c.env.JEV_MODE, evaluacion);
    const detectados = doloresTrasAclaracion(
      evaluacion.answers.noul,
      dolores as IdFamilia[],
      UMBRALES,
    );
    return c.json(armarVista(lead, evaluacion.answers, detectados, true), 200);
  },
);

diagnosticos.post(
  "/:token/finalizar",
  zValidator("param", esquemaToken, alFallar),
  zValidator("json", esquemaFinalizar, alFallar),
  async (c) => {
    const { token } = c.req.valid("param");
    const lead = await obtenerLead(c.env.DB, token);
    if (!lead) {
      return c.json({ error: noEncontrado }, 404);
    }
    if (lead.estado === "error") {
      return c.json({ error: errorJev }, 409);
    }
    if (lead.estado === "completo" && lead.resultado_id) {
      const fila = await obtenerResultado(c.env.DB, lead.resultado_id);
      if (fila) {
        return c.json({
          pendiente: false,
          resultado_id: fila.id,
          resultado: resultadoPublico(fila),
        });
      }
    }
    const cuerpo = c.req.valid("json");
    await guardarConfirmacion(c.env.DB, token, cuerpo.dolores_confirmados);
    const respuestas = JSON.parse(lead.jev_respuestas ?? "{}") as RespuestasJev;
    const salida = resolverResultado(
      {
        respuestas,
        perfil: lead.perfil as Perfil,
        etapa_nivel: lead.etapa
          ? (ETAPA_NIVEL[lead.etapa as keyof typeof ETAPA_NIVEL] ?? null)
          : null,
        edad_hijo: lead.edad_hijo,
        dolores_confirmados: cuerpo.dolores_confirmados,
        respuestas_seguimiento: cuerpo.respuestas_seguimiento ?? null,
      },
      UMBRALES,
    );
    if (salida.pendiente) {
      return c.json({ pendiente: true, seguimientos: salida.seguimientos });
    }
    const r = salida.resultado;
    const id = nuevoResultadoId();
    const fila = {
      id,
      nombre_pila: lead.nombre.trim().split(/\s+/)[0]?.slice(0, 40) ?? "",
      tipo: r.tipo,
      requiere_revision: r.requiere_revision ? 1 : 0,
      programa_id: r.programa_top?.id ?? null,
      fit: r.programa_top?.fit ?? null,
      detalle: JSON.stringify({
        programa_top: r.programa_top,
        ranking: r.ranking,
        cercanos: r.cercanos,
        motivo_top: r.motivo_top,
        familias: r.familias,
        chips: r.chips,
      }),
    };
    await completarLead(c.env.DB, {
      token,
      resultado: fila,
      respuestas_seguimiento: cuerpo.respuestas_seguimiento ?? null,
      confianza_choice: salida.confianza_choice,
    });
    return c.json({
      pendiente: false,
      resultado_id: id,
      resultado: resultadoPublico({ ...fila, created_at: "" }),
    });
  },
);

diagnosticos.post("/:token/asesor", zValidator("param", esquemaToken, alFallar), async (c) => {
  const { token } = c.req.valid("param");
  if (!(await marcarAsesor(c.env.DB, token))) {
    return c.json({ error: noEncontrado }, 404);
  }
  return c.body(null, 204);
});
