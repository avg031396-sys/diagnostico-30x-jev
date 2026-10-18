import type { ConfigJev } from "./cliente.ts";
import type { EstadoJev, EvaluacionJev, JevClient, PreguntasJev, RespuestasJev } from "./tipos.ts";
import { JevError } from "./tipos.ts";

export const TIMEOUT_MS = 8000;
const URL_PROXY = "https://backend.composio.dev/api/v3.1/tools/execute/proxy";
// URL absoluta a propósito: la base URL de la conexión de Composio es UNVERIFIED.
const ENDPOINT_JEV = "https://openrouter.ai/api/alpha/decisions";

type Respuesta = Record<string, unknown>;

const esObjeto = (x: unknown): x is Respuesta => typeof x === "object" && x !== null;

export function normalizarAnswers(answers: unknown): RespuestasJev {
  if (!esObjeto(answers)) {
    throw new JevError("JEV_FORMATO", "la respuesta de JEV no trae answers");
  }
  const salida: RespuestasJev = { noul: {}, choice: null, score: null };
  for (const [id, a] of Object.entries(answers)) {
    if (!esObjeto(a)) {
      continue;
    }
    if (a.type === "noul" && typeof a.noul === "number") {
      salida.noul[id] = a.noul;
    } else if (a.type === "choice" && typeof a.choice === "string") {
      salida.choice = {
        valor: a.choice,
        confianza: typeof a.confidence === "number" ? a.confidence : 0,
      };
    } else if (a.type === "score" && typeof a.score === "number") {
      salida.score = {
        valor: a.score,
        confianza: typeof a.confidence === "number" ? a.confidence : 0,
      };
    }
  }
  return salida;
}

// POST con tiempo límite. Al abortar lanza JEV_TIMEOUT; un HTTP no 2xx, JEV_HTTP.
export async function postConTimeout(
  fetchFn: typeof fetch,
  url: string,
  apiKey: string,
  cuerpo: unknown,
): Promise<unknown> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    const respuesta = await fetchFn(url, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      signal: control.signal,
    });
    if (!respuesta.ok) {
      throw new JevError("JEV_HTTP", `Composio respondió HTTP ${respuesta.status}`);
    }
    return await respuesta.json();
  } catch (error) {
    if (error instanceof JevError) {
      throw error;
    }
    if (control.signal.aborted) {
      throw new JevError("JEV_TIMEOUT", `JEV no respondió en ${TIMEOUT_MS} ms`);
    }
    throw new JevError("JEV_HTTP", error instanceof Error ? error.message : "error de red");
  } finally {
    clearTimeout(temporizador);
  }
}

export function crearProxyJev(config: ConfigJev, fetchFn: typeof fetch): JevClient {
  const { composioApiKey, cuentaOpenrouter } = config;
  if (!composioApiKey || !cuentaOpenrouter) {
    throw new JevError("JEV_CONFIG", "falta COMPOSIO_API_KEY o COMPOSIO_OPENROUTER_ACCOUNT_ID");
  }
  return {
    async evaluar(estado: EstadoJev, preguntas: PreguntasJev): Promise<EvaluacionJev> {
      const inicio = Date.now();
      const cuerpo = await postConTimeout(fetchFn, URL_PROXY, composioApiKey, {
        connected_account_id: cuentaOpenrouter,
        endpoint: ENDPOINT_JEV,
        method: "POST",
        body: { model: config.modelo, state: estado, questions: preguntas },
      });
      const envoltura = esObjeto(cuerpo) ? cuerpo : {};
      const status = typeof envoltura.status === "number" ? envoltura.status : 200;
      if (status < 200 || status > 299) {
        throw new JevError("JEV_HTTP", `OpenRouter respondió ${status} vía Composio`);
      }
      const data = esObjeto(envoltura.data) ? envoltura.data : {};
      const usage = esObjeto(data.usage) ? data.usage : {};
      return {
        answers: normalizarAnswers(data.answers),
        usage: {
          input_tokens: typeof usage.input_tokens === "number" ? usage.input_tokens : 0,
          cost: typeof usage.cost === "number" ? usage.cost : 0,
        },
        latencia_ms: Date.now() - inicio,
        modelo: typeof data.model === "string" ? data.model : config.modelo,
      };
    },
  };
}
