import type { IdDolor, IdPrograma } from "../motor/catalogo.ts";
import { PROGRAMAS } from "../motor/catalogo.ts";
import { PALABRAS_DOLOR, SENALES_FIT } from "./mock-keywords.ts";
import type { EstadoJev, EvaluacionJev, JevClient, PreguntasJev, RespuestasJev } from "./tipos.ts";
import { JevError } from "./tipos.ts";

const ALTO = 0.85;
const BAJO = 0.1;

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function contiene(texto: string, palabras: string[]): boolean {
  return palabras.some((p) => texto.includes(p));
}

// Adaptador determinista y sin red: mismo texto, mismas respuestas.
export function crearMockJev(): JevClient {
  return {
    async evaluar(estado: EstadoJev, preguntas: PreguntasJev): Promise<EvaluacionJev> {
      const texto = normalizar(
        [
          estado.reto_principal,
          ...(estado.dolores_elegidos ?? []),
          ...(estado.metas_elegidas ?? []),
        ].join(" "),
      );
      if (texto.includes("simular falla de jev")) {
        throw new JevError("JEV_HTTP", "falla simulada del mock");
      }

      const dolores = Object.keys(PALABRAS_DOLOR) as (IdDolor | "objecion_tiempo_o_precio")[];
      const valor: Record<string, number> = {};
      for (const id of dolores) {
        valor[id] = contiene(texto, PALABRAS_DOLOR[id]) ? ALTO : BAJO;
      }
      const hayDolor = dolores.some(
        (id) => id !== "objecion_tiempo_o_precio" && valor[id] === ALTO,
      );
      valor.respuesta_vaga = hayDolor ? BAJO : ALTO;
      valor.datos_incoherentes = 0.05;
      valor.enamorado_de_solucion = BAJO;

      const fits = {} as Record<IdPrograma, number>;
      for (const p of PROGRAMAS) {
        const senal = SENALES_FIT[p.id];
        const activo =
          senal.dolores.some((d) => valor[d] === ALTO) || contiene(texto, senal.palabras);
        fits[p.id] = activo ? ALTO : BAJO;
        valor[`fit_${p.id.toLowerCase()}`] = fits[p.id];
      }

      const respuestas: RespuestasJev = { noul: {}, choice: null, score: null };
      for (const [id, pregunta] of Object.entries(preguntas)) {
        if (pregunta.type === "noul") {
          respuestas.noul[id] = valor[id] ?? BAJO;
        } else if (pregunta.type === "choice") {
          respuestas.choice = elegirChoice(pregunta.criteria, fits);
        } else {
          respuestas.score = { valor: estado.etapa_nivel ?? 0, confianza: 0.7 };
        }
      }

      return {
        answers: respuestas,
        usage: { input_tokens: 0, cost: 0 },
        latencia_ms: 0,
        modelo: "mock",
      };
    },
  };
}

function elegirChoice(
  criteria: Record<string, string>,
  fits: Record<IdPrograma, number>,
): { valor: string; confianza: number } {
  let mejor: IdPrograma | null = null;
  for (const p of PROGRAMAS) {
    if (p.id in criteria && (mejor === null || fits[p.id] > fits[mejor])) {
      mejor = p.id;
    }
  }
  if (mejor !== null && fits[mejor] > BAJO) {
    return { valor: mejor, confianza: 0.7 };
  }
  return {
    valor: "requiere_revision" in criteria ? "requiere_revision" : "no_aplica",
    confianza: 0.7,
  };
}
