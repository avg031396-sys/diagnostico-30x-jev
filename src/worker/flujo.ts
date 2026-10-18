import umbralesJson from "../data/umbrales.json" with { type: "json" };
import type { ConfigJev } from "../jev/cliente.ts";
import type { ModoJev, RespuestasJev } from "../jev/tipos.ts";
import type { IdDolor, Perfil } from "../motor/catalogo.ts";
import { ETAPA_NIVEL } from "../motor/catalogo.ts";
import { detectarDolores, necesitaAclaracion } from "../motor/dolores.ts";
import { resolverResultado } from "../motor/resultado.ts";
import type {
  DolorDetectado,
  PreguntaSeguimiento,
  ResultadoMotor,
  Umbrales,
} from "../motor/tipos.ts";
import type { Bindings } from "./app.ts";
import type { FilaLead, FilaResultado } from "./repositorio.ts";

export const UMBRALES: Umbrales = umbralesJson;

export const MENSAJE_JEV = "Tuvimos un problema al analizar tu reto.";

// Una variable vacía cuenta como ausente.
export function configJevDesdeEnv(env: Bindings): ConfigJev {
  return {
    modo: env.JEV_MODE as ModoJev,
    modelo: env.JEV_MODEL,
    modeloComposio: env.JEV_MODEL_COMPOSIO || undefined,
    composioApiKey: env.COMPOSIO_API_KEY || undefined,
    cuentaOpenrouter: env.COMPOSIO_OPENROUTER_ACCOUNT_ID || undefined,
    cuentaJev: env.COMPOSIO_JEV_ACCOUNT_ID || undefined,
  };
}

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// 16 bytes aleatorios en base64url sin relleno = 22 caracteres.
export function nuevoToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// 10 caracteres base62; se rechazan los bytes >= 248 (62 * 4) para no sesgar.
export function nuevoResultadoId(): string {
  let id = "";
  while (id.length < 10) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    for (const b of bytes) {
      if (b < 248 && id.length < 10) {
        id += BASE62[b % 62];
      }
    }
  }
  return id;
}

export type VistaDiagnostico = {
  dolores_detectados: { id: string; etiqueta: string; valor: number }[];
  necesita_aclaracion: boolean;
  seguimientos: PreguntaSeguimiento[];
  ranking_preliminar: {
    programa_top: ResultadoMotor["programa_top"];
    ranking: ResultadoMotor["ranking"];
  };
};

// Con todos los dolores detectados tomados como confirmados.
export function armarVista(
  lead: Pick<FilaLead, "perfil" | "etapa" | "edad_hijo">,
  respuestas: RespuestasJev,
  dolores: DolorDetectado[],
  aclaracion: boolean,
): VistaDiagnostico {
  const entrada = {
    respuestas,
    perfil: lead.perfil as Perfil,
    etapa_nivel: lead.etapa ? (ETAPA_NIVEL[lead.etapa as keyof typeof ETAPA_NIVEL] ?? null) : null,
    edad_hijo: lead.edad_hijo,
    dolores_confirmados: dolores.map((d) => d.id as IdDolor),
  };
  const pendiente = resolverResultado({ ...entrada, respuestas_seguimiento: null }, UMBRALES);
  const preliminar = resolverResultado({ ...entrada, respuestas_seguimiento: {} }, UMBRALES);
  return {
    dolores_detectados: dolores.map((d) => ({ id: d.id, etiqueta: d.etiqueta, valor: d.valor })),
    necesita_aclaracion: aclaracion ? false : necesitaAclaracion(respuestas.noul, UMBRALES),
    seguimientos: pendiente.pendiente ? pendiente.seguimientos : [],
    ranking_preliminar: preliminar.pendiente
      ? { programa_top: null, ranking: [] }
      : { programa_top: preliminar.resultado.programa_top, ranking: preliminar.resultado.ranking },
  };
}

export function dolorDetectadoDe(respuestas: RespuestasJev): DolorDetectado[] {
  return detectarDolores(respuestas.noul, UMBRALES);
}

// Forma pública del resultado (sin datos de contacto).
export function resultadoPublico(fila: FilaResultado) {
  const detalle = JSON.parse(fila.detalle) as Pick<
    ResultadoMotor,
    "programa_top" | "ranking" | "familias" | "chips"
  >;
  return {
    tipo: fila.tipo,
    requiere_revision: fila.requiere_revision === 1,
    programa_top: detalle.programa_top,
    ranking: detalle.ranking,
    familias: detalle.familias,
    chips: detalle.chips,
  };
}
