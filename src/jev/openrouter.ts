import type { ConfigJev } from "./cliente.ts";
import { ENDPOINT_JEV, normalizarAnswers, postConTimeout } from "./proxy.ts";
import type { EstadoJev, EvaluacionJev, JevClient, PreguntasJev } from "./tipos.ts";
import { JevError } from "./tipos.ts";

type Respuesta = Record<string, unknown>;
const esObjeto = (x: unknown): x is Respuesta => typeof x === "object" && x !== null;

// Llamada directa a OpenRouter (sin Composio) con la clave OPENROUTER_API_KEY.
export function crearOpenRouterJev(config: ConfigJev, fetchFn: typeof fetch): JevClient {
  const { openrouterApiKey } = config;
  if (!openrouterApiKey) {
    throw new JevError("JEV_CONFIG", "falta OPENROUTER_API_KEY");
  }
  return {
    async evaluar(estado: EstadoJev, preguntas: PreguntasJev): Promise<EvaluacionJev> {
      const inicio = Date.now();
      const data = await postConTimeout(
        fetchFn,
        ENDPOINT_JEV,
        { Authorization: `Bearer ${openrouterApiKey}` },
        { model: config.modelo, state: estado, questions: preguntas },
      );
      const cuerpo = esObjeto(data) ? data : {};
      const usage = esObjeto(cuerpo.usage) ? cuerpo.usage : {};
      return {
        answers: normalizarAnswers(cuerpo.answers),
        usage: {
          input_tokens: typeof usage.input_tokens === "number" ? usage.input_tokens : 0,
          cost: typeof usage.cost === "number" ? usage.cost : 0,
        },
        latencia_ms: Date.now() - inicio,
        modelo: typeof cuerpo.model === "string" ? cuerpo.model : config.modelo,
      };
    },
  };
}
