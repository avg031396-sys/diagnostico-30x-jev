import { crearComposioJev } from "./composio-jev.ts";
import { crearMockJev } from "./mock.ts";
import { crearProxyJev } from "./proxy.ts";
import type { EstadoJev, EvaluacionJev, JevClient, ModoJev, PreguntasJev } from "./tipos.ts";
import { JevError } from "./tipos.ts";

export type ConfigJev = {
  modo: ModoJev;
  modelo: string;
  modeloComposio?: string;
  composioApiKey?: string;
  cuentaOpenrouter?: string;
  cuentaJev?: string;
};

export function crearClienteJev(config: ConfigJev, fetchFn: typeof fetch = fetch): JevClient {
  switch (config.modo) {
    case "mock":
      return crearMockJev();
    case "composio-proxy":
      return crearProxyJev(config, fetchFn);
    case "composio-jev":
      return crearComposioJev(config, fetchFn);
    default:
      throw new JevError("JEV_CONFIG", `modo no disponible: ${String(config.modo)}`);
  }
}

// Un intento y un reintento. Si vuelve a fallar, propaga un JevError.
export async function evaluarConReintento(
  cliente: JevClient,
  estado: EstadoJev,
  preguntas: PreguntasJev,
): Promise<EvaluacionJev> {
  try {
    return await cliente.evaluar(estado, preguntas);
  } catch {
    try {
      return await cliente.evaluar(estado, preguntas);
    } catch (error) {
      if (error instanceof JevError) {
        throw error;
      }
      throw new JevError("JEV_HTTP", error instanceof Error ? error.message : "error desconocido");
    }
  }
}
