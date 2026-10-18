import type { Etapa, Perfil } from "../motor/catalogo.ts";

export type ModoJev = "mock" | "openrouter" | "composio-proxy" | "composio-jev";

// Forma de las preguntas que viajan a JEV (una por cada pregunta de `preguntas_jev`).
export type PreguntaJev =
  | { type: "noul"; instructions: string }
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] };
export type PreguntasJev = Record<string, PreguntaJev>;

// Lo ÚNICO que puede viajar a JEV sobre la persona. Nunca nombre, correo, WhatsApp ni empresa.
export type EstadoJev = {
  perfil: Perfil;
  etapa?: Etapa;
  etapa_nivel?: number;
  edad_hijo?: number;
  reto_principal: string;
  dolores_elegidos?: string[];
  metas_elegidas?: string[];
};

export type RespuestasJev = {
  noul: Record<string, number>;
  choice: { valor: string; confianza: number } | null;
  score: { valor: number; confianza: number } | null;
};

export type EvaluacionJev = {
  answers: RespuestasJev;
  usage: { input_tokens: number; cost: number };
  latencia_ms: number;
  modelo: string;
};

export interface JevClient {
  evaluar(estado: EstadoJev, preguntas: PreguntasJev): Promise<EvaluacionJev>;
}

export type CodigoJevError = "JEV_CONFIG" | "JEV_HTTP" | "JEV_TIMEOUT" | "JEV_FORMATO";

export class JevError extends Error {
  codigo: CodigoJevError;

  constructor(codigo: CodigoJevError, mensaje: string) {
    super(mensaje);
    this.name = "JevError";
    this.codigo = codigo;
  }
}
