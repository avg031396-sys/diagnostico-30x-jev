import insumos from "../data/insumos-jev.json" with { type: "json" };
import type { Etapa, Perfil } from "../motor/catalogo.ts";
import { ETAPA_NIVEL } from "../motor/catalogo.ts";
import type { EstadoJev, PreguntasJev } from "./tipos.ts";

type PreguntaInsumo = {
  id: string;
  tipo: "noul" | "choice" | "score";
  afirmacion?: string;
  pregunta?: string;
  opciones?: { id: string; descripcion: string }[];
  niveles?: { nivel: number; descripcion: string }[];
};

// El JSON se lee como datos: aquí solo se toman id, texto, opciones y niveles.
// `evidencia`, `fuente_pagina`, `mide` y `programa` NUNCA se copian a la llamada.
const PREGUNTAS_INSUMO = insumos.preguntas_jev as unknown as PreguntaInsumo[];

// Regla de `reglas_codigo`: a una empresa solo se le ofrecen estas tres salidas.
const OPCIONES_CORPORATIVO = new Set(["Planes_Corporativos", "Multipliers", "requiere_revision"]);

export function construirPreguntas(perfil: Perfil): PreguntasJev {
  const salida: PreguntasJev = {};
  for (const p of PREGUNTAS_INSUMO) {
    if (p.tipo === "noul") {
      salida[p.id] = { type: "noul", instructions: p.afirmacion ?? "" };
    } else if (p.tipo === "choice") {
      const criteria: Record<string, string> = {};
      for (const opcion of p.opciones ?? []) {
        if (perfil === "corporativo" && !OPCIONES_CORPORATIVO.has(opcion.id)) {
          continue;
        }
        criteria[opcion.id] = opcion.descripcion;
      }
      salida[p.id] = { type: "choice", instructions: p.pregunta ?? "", criteria };
    } else {
      const niveles = [...(p.niveles ?? [])].sort((a, b) => a.nivel - b.nivel);
      salida[p.id] = {
        type: "score",
        instructions: p.pregunta ?? "",
        criteria: niveles.map((n) => n.descripcion),
      };
    }
  }
  return salida;
}

export type EntradaEstado = {
  perfil: Perfil;
  etapa?: Etapa;
  edad_hijo?: number;
  reto: string;
  dolores_elegidos?: string[];
  metas_elegidas?: string[];
};

// Devuelve SOLO las 7 claves permitidas. Si la entrada trae `contacto` u otra clave, se ignora.
export function construirEstado(entrada: EntradaEstado): EstadoJev {
  const estado: EstadoJev = { perfil: entrada.perfil, reto_principal: entrada.reto };
  if (entrada.etapa !== undefined) {
    estado.etapa = entrada.etapa;
    estado.etapa_nivel = ETAPA_NIVEL[entrada.etapa];
  }
  if (entrada.edad_hijo !== undefined) {
    estado.edad_hijo = entrada.edad_hijo;
  }
  if (entrada.dolores_elegidos && entrada.dolores_elegidos.length > 0) {
    estado.dolores_elegidos = entrada.dolores_elegidos;
  }
  if (entrada.metas_elegidas && entrada.metas_elegidas.length > 0) {
    estado.metas_elegidas = entrada.metas_elegidas;
  }
  return estado;
}
