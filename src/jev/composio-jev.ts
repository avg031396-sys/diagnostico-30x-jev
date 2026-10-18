import type { ConfigJev } from "./cliente.ts";
import { normalizarAnswers, postConTimeout } from "./proxy.ts";
import type { EstadoJev, EvaluacionJev, JevClient, PreguntasJev } from "./tipos.ts";
import { JevError } from "./tipos.ts";

const URL_EJECUTAR = "https://backend.composio.dev/api/v3.1/tools/execute/JEV_EVALUATE_STATE";

type Respuesta = Record<string, unknown>;
const esObjeto = (x: unknown): x is Respuesta => typeof x === "object" && x !== null;

function buscarAnswers(data: unknown): Respuesta | null {
  const candidatos = [
    data,
    ...(esObjeto(data) ? [data.data, data.response_data, data.result] : []),
  ];
  for (const c of candidatos) {
    if (esObjeto(c) && esObjeto(c.answers)) {
      return c;
    }
  }
  return null;
}

// Respaldo UNVERIFIED: toolkit `jev` de Composio. Normaliza a la misma forma o lanza JEV_FORMATO.
export function crearComposioJev(config: ConfigJev, fetchFn: typeof fetch): JevClient {
  const { composioApiKey, cuentaJev } = config;
  if (!composioApiKey || !cuentaJev) {
    throw new JevError("JEV_CONFIG", "falta COMPOSIO_API_KEY o COMPOSIO_JEV_ACCOUNT_ID");
  }
  return {
    async evaluar(estado: EstadoJev, preguntas: PreguntasJev): Promise<EvaluacionJev> {
      const inicio = Date.now();
      const cuerpo = await postConTimeout(
        fetchFn,
        URL_EJECUTAR,
        { "x-api-key": composioApiKey },
        {
          connected_account_id: cuentaJev,
          arguments: {
            model: config.modeloComposio ?? config.modelo,
            state: estado,
            questions: preguntas,
          },
        },
      );
      const envoltura = esObjeto(cuerpo) ? cuerpo : {};
      if (envoltura.successful === false) {
        throw new JevError("JEV_HTTP", `composio-jev: ${String(envoltura.error ?? "error")}`);
      }
      let data: unknown = envoltura.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          throw new JevError("JEV_FORMATO", "composio-jev: la respuesta no es JSON");
        }
      }
      const origen = buscarAnswers(data);
      if (!origen) {
        throw new JevError("JEV_FORMATO", "composio-jev: respuesta no reconocida");
      }
      const usage = esObjeto(origen.usage) ? origen.usage : {};
      return {
        answers: normalizarAnswers(origen.answers),
        usage: {
          input_tokens: typeof usage.input_tokens === "number" ? usage.input_tokens : 0,
          cost: typeof usage.cost === "number" ? usage.cost : 0,
        },
        latencia_ms: Date.now() - inicio,
        modelo:
          typeof origen.model === "string"
            ? origen.model
            : (config.modeloComposio ?? config.modelo),
      };
    },
  };
}
