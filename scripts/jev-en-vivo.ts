import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { crearClienteJev } from "../src/jev/cliente.ts";
import { construirEstado, construirPreguntas } from "../src/jev/preguntas.ts";
import { JevError } from "../src/jev/tipos.ts";

// UNA llamada real a JEV (sin reintento). Gasta saldo: solo la corre quien tiene las claves.
const RETO =
  "Vendo por referidos y no tengo un proceso comercial ordenado. Ya facturo unos USD 300 mil al año.";

function leerDevVars(ruta: string): Record<string, string> {
  const salida: Record<string, string> = {};
  if (!existsSync(ruta)) {
    return salida;
  }
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const texto = linea.trim();
    const i = texto.indexOf("=");
    if (texto === "" || texto.startsWith("#") || i < 1) {
      continue;
    }
    salida[texto.slice(0, i).trim()] = texto.slice(i + 1).trim();
  }
  return salida;
}

export type OpcionesEjecutar = {
  env: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
  imprimir?: (texto: string) => void;
};

export async function ejecutar({
  env,
  fetchFn = fetch,
  imprimir = console.log,
}: OpcionesEjecutar): Promise<number> {
  if (env.JEV_MODE !== "composio-proxy") {
    imprimir("JEV_MODE debe ser composio-proxy");
    return 2;
  }
  if (!env.COMPOSIO_API_KEY || !env.COMPOSIO_OPENROUTER_ACCOUNT_ID) {
    imprimir("Faltan COMPOSIO_API_KEY o COMPOSIO_OPENROUTER_ACCOUNT_ID");
    return 3;
  }
  const cliente = crearClienteJev(
    {
      modo: "composio-proxy",
      modelo: env.JEV_MODEL || "typesafe/jev-1.14",
      composioApiKey: env.COMPOSIO_API_KEY,
      cuentaOpenrouter: env.COMPOSIO_OPENROUTER_ACCOUNT_ID,
    },
    fetchFn,
  );
  try {
    const estado = construirEstado({ perfil: "founder", etapa: "arrancando", reto: RETO });
    const r = await cliente.evaluar(estado, construirPreguntas("founder"));
    imprimir(`Programa (Choice): ${r.answers.choice?.valor ?? "sin Choice"}`);
    imprimir(`Confianza: ${r.answers.choice?.confianza ?? "n/d"}`);
    imprimir(`Latencia: ${r.latencia_ms} ms`);
    imprimir(`Costo: USD ${r.usage.cost}`);
    imprimir(`Modelo: ${r.modelo}`);
    return 0;
  } catch (error) {
    imprimir(`Error de JEV: ${error instanceof JevError ? error.codigo : "desconocido"}`);
    return 4;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = { ...leerDevVars(".dev.vars"), ...process.env };
  process.exitCode = await ejecutar({ env });
}
