import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import insumos from "../src/data/insumos-jev.json" with { type: "json" };
import { construirEstado } from "../src/jev/preguntas.ts";
import type { CasoPrueba } from "../src/qa/evaluar.ts";

// Línea base: los mismos casos de QA contra un LLM genérico de chat (vía OpenRouter), con la
// MISMA información que recibe JEV (estado sin datos personales + opciones del Choice con su
// descripción). Responde "¿por qué JEV y no un prompt a un LLM?" con números.
// Gasta saldo: una llamada por caso. Uso:
//   npm run comparar-llm -- --modelo <id-de-openrouter> [--limite 10]

const CASOS = insumos.casos_prueba as unknown as CasoPrueba[];
type Opcion = { id: string; descripcion: string };
const CHOICE = (
  insumos.preguntas_jev as unknown as { tipo: string; pregunta: string; opciones: Opcion[] }[]
).find((p) => p.tipo === "choice");
const URL_CHAT = "https://openrouter.ai/api/v1/chat/completions";
const SALIDA = ".wrangler/comparacion-llm.json";

export type FilaLlm = {
  id: string;
  esperado: string | null;
  elegido: string | null;
  acierto: boolean;
  latencia_ms: number;
  costo_usd: number;
};

function leerDevVars(ruta: string): Record<string, string> {
  const salida: Record<string, string> = {};
  if (!existsSync(ruta)) {
    return salida;
  }
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const i = linea.indexOf("=");
    if (i > 0 && !linea.trimStart().startsWith("#")) {
      salida[linea.slice(0, i).trim()] = linea.slice(i + 1).trim();
    }
  }
  return salida;
}

export function prompt(caso: CasoPrueba): string {
  const estado = construirEstado({
    perfil: caso.estado.perfil,
    etapa: caso.estado.etapa,
    edad_hijo: caso.estado.edad_hijo,
    reto: caso.estado.reto_principal,
  });
  const opciones = (CHOICE?.opciones ?? []).map((o) => `- ${o.id}: ${o.descripcion}`).join("\n");
  return [
    CHOICE?.pregunta ?? "",
    "",
    "Persona:",
    JSON.stringify(estado),
    "",
    "Opciones (responde con el id exacto):",
    opciones,
    "",
    'Responde solo JSON: {"programa": "<id>"}',
  ].join("\n");
}

function acierta(caso: CasoPrueba, elegido: string | null): boolean {
  const esperado = caso.esperado?.programa_recomendado;
  const aceptados = new Set(caso.acepta_programa_recomendado ?? (esperado ? [esperado] : []));
  return elegido !== null && aceptados.has(elegido);
}

async function evaluar(
  caso: CasoPrueba,
  modelo: string,
  clave: string,
  fetchFn: typeof fetch,
): Promise<FilaLlm> {
  const inicio = Date.now();
  const base = { id: caso.id, esperado: caso.esperado?.programa_recomendado ?? null };
  try {
    const r = await fetchFn(URL_CHAT, {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        temperature: 0,
        response_format: { type: "json_object" },
        usage: { include: true },
        messages: [{ role: "user", content: prompt(caso) }],
      }),
    });
    const json = (await r.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { cost?: number };
    };
    const texto = json.choices?.[0]?.message?.content ?? "";
    const id = (JSON.parse(texto.slice(texto.indexOf("{"))) as { programa?: string }).programa;
    const elegido = CHOICE?.opciones.some((o) => o.id === id) ? (id ?? null) : null;
    return {
      ...base,
      elegido,
      acierto: acierta(caso, elegido),
      latencia_ms: Date.now() - inicio,
      costo_usd: json.usage?.cost ?? 0,
    };
  } catch {
    return {
      ...base,
      elegido: null,
      acierto: false,
      latencia_ms: Date.now() - inicio,
      costo_usd: 0,
    };
  }
}

export type OpcionesComparar = {
  args: string[];
  env: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
  imprimir?: (texto: string) => void;
  guardar?: (ruta: string, contenido: string) => void;
};

export async function ejecutar({
  args,
  env,
  fetchFn = fetch,
  imprimir = console.log,
  guardar = (ruta, contenido) => writeFileSync(ruta, contenido),
}: OpcionesComparar): Promise<number> {
  const valor = (nombre: string) => {
    const i = args.indexOf(nombre);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const modelo = valor("--modelo");
  if (!modelo) {
    imprimir("Uso: npm run comparar-llm -- --modelo <id-de-openrouter> [--limite 10]");
    return 2;
  }
  const clave = env.OPENROUTER_API_KEY;
  if (!clave) {
    imprimir("Falta OPENROUTER_API_KEY (en .dev.vars o en el entorno).");
    return 3;
  }
  const limite = Number(valor("--limite") ?? CASOS.length);
  const casos = CASOS.filter((c) => c.esperado?.programa_recomendado).slice(0, limite);
  const filas: FilaLlm[] = [];
  for (let i = 0; i < casos.length; i += 5) {
    const lote = casos.slice(i, i + 5);
    filas.push(...(await Promise.all(lote.map((c) => evaluar(c, modelo, clave, fetchFn)))));
  }
  const aciertos = filas.filter((f) => f.acierto).length;
  const latencias = filas.map((f) => f.latencia_ms).sort((a, b) => a - b);
  const p50 = latencias[Math.max(0, Math.ceil(latencias.length / 2) - 1)] ?? 0;
  const costo = filas.reduce((s, f) => s + f.costo_usd, 0);
  imprimir(`Modelo: ${modelo}`);
  imprimir(`Top-1: ${aciertos}/${filas.length}`);
  imprimir(`Latencia p50: ${p50} ms · Costo total: USD ${costo.toFixed(4)}`);
  imprimir(`Detalle en ${SALIDA}. Compáralo con /qa.html (JEV + motor).`);
  guardar(
    SALIDA,
    JSON.stringify({ modelo, aciertos, total: filas.length, p50, costo, filas }, null, 2),
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = { ...leerDevVars(".dev.vars"), ...process.env };
  process.exitCode = await ejecutar({ args: process.argv.slice(2), env });
}
