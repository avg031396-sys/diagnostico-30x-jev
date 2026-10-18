import seguimientos from "../data/seguimientos.json" with { type: "json" };
import type { IdFamilia, IdPrograma } from "./catalogo.ts";
import { DOLORES_ACLARACION, FAMILIAS, programaPorId } from "./catalogo.ts";
import type {
  BloqueSeguimiento,
  Facturacion,
  FilaRanking,
  PreguntaSeguimiento,
  Umbrales,
} from "./tipos.ts";

const BLOQUES = seguimientos.bloques as unknown as BloqueSeguimiento[];

export type EntradaSeguimientos = {
  filas: FilaRanking[];
  familiasConfirmadas: IdFamilia[];
  choice: string | null;
  etapa_nivel: number | null;
  umbrales: Umbrales;
};

const HERMANOS_VENTAS: IdPrograma[] = [
  "Sales_Machine",
  "LinkedIn_Sales",
  "AI_Sales",
  "Instagram_TikTok",
];
const HERMANOS_IA: IdPrograma[] = [
  "AI_for_Executives",
  "Second_Brain",
  "AI_for_Developers",
  "AI_Sales",
];

function contar(bloque: BloqueSeguimiento): number {
  return bloque.preguntas.length;
}

// Dos hermanos a menos de `delta_hermanos` entre las dos visibles de mayor fit del grupo.
function hermanosCerca(filas: FilaRanking[], grupo: IdPrograma[], delta: number): boolean {
  const fits = filas
    .filter((f) => grupo.includes(f.programa))
    .map((f) => f.fit)
    .sort((a, b) => b - a);
  const [a, b] = fits;
  return a !== undefined && b !== undefined && a - b < delta;
}

function maxFitDeFamilia(visibles: FilaRanking[], familia: IdFamilia): number {
  const programas = FAMILIAS.find((f) => f.id === familia)?.programas ?? [];
  return Math.max(
    0,
    ...visibles.filter((f) => programas.some((p) => p === f.programa)).map((f) => f.fit),
  );
}

// Empate entre programas de familias distintas: ninguna pregunta de bloque los separa,
// así que se pregunta qué es lo más urgente. Solo cuenta lo que cumple su requisito.
export function preguntaPrioridad(vis: FilaRanking[], delta: number): PreguntaSeguimiento | null {
  const elegibles = vis.filter((f) => f.cumple);
  const n1 = elegibles[0];
  if (!n1) {
    return null;
  }
  const familias: IdFamilia[] = [];
  for (const f of elegibles) {
    const familia = (programaPorId(f.programa).familias as readonly IdFamilia[])[0];
    if (n1.fit - f.fit < delta && familia && !familias.includes(familia)) {
      familias.push(familia);
    }
  }
  if (familias.length < 2) {
    return null;
  }
  return {
    id: "prioridad",
    texto: "Si solo pudieras resolver una cosa este año, ¿cuál sería?",
    opciones: familias.slice(0, 4).map((id) => ({
      id,
      etiqueta: DOLORES_ACLARACION.find((d) => d.familia === id)?.etiqueta ?? id,
    })),
  };
}

export function elegirSeguimientos(entrada: EntradaSeguimientos): PreguntaSeguimiento[] {
  const { filas, familiasConfirmadas, choice, etapa_nivel, umbrales } = entrada;
  const vis = filas.filter((f) => f.fit >= umbrales.umbral_mostrar);
  const top3 = vis.slice(0, 3);
  const disparados = new Set<string>();

  if (top3.some((f) => f.programa === "Inmersion_Ejecutiva") && (etapa_nivel ?? 0) >= 3) {
    disparados.add("inmersion");
  }
  if (
    familiasConfirmadas.includes("ventas") &&
    hermanosCerca(vis, HERMANOS_VENTAS, umbrales.delta_hermanos)
  ) {
    disparados.add("ventas");
  }
  if (
    familiasConfirmadas.includes("inteligencia_artificial") &&
    hermanosCerca(vis, HERMANOS_IA, umbrales.delta_hermanos)
  ) {
    disparados.add("ia");
  }
  if (familiasConfirmadas.includes("capital")) {
    disparados.add("capital");
  }
  if (familiasConfirmadas.includes("growth")) {
    disparados.add("growth");
  }

  // Discrepancia: el Choice no es el n.º 1 pero está cerca de él.
  let primero: string | null = null;
  const n1 = vis[0];
  if (n1 && choice && choice !== n1.programa) {
    const fila = top3.find((f) => f.programa === choice);
    if (fila && n1.fit - fila.fit < umbrales.delta_hermanos) {
      const familias = programaPorId(fila.programa as IdPrograma).familias as readonly IdFamilia[];
      const bloque = BLOQUES.find((b) => familias.includes(b.familia));
      if (bloque) {
        disparados.add(bloque.id);
        primero = bloque.id;
      }
    }
  }

  const ordenados = BLOQUES.filter((b) => disparados.has(b.id)).sort((a, b) => {
    if (a.id === primero) {
      return -1;
    }
    if (b.id === primero) {
      return 1;
    }
    return maxFitDeFamilia(vis, b.familia) - maxFitDeFamilia(vis, a.familia);
  });

  const salida: PreguntaSeguimiento[] = [];
  let total = 0;
  const prioridad = preguntaPrioridad(vis, umbrales.delta_hermanos);
  if (prioridad) {
    salida.push(prioridad);
    total = 1;
  }
  for (const bloque of ordenados) {
    if (total + contar(bloque) <= 2) {
      salida.push(...bloque.preguntas);
      total += contar(bloque);
    }
  }
  return salida;
}

export type EfectosSeguimiento = {
  prioridades: Partial<Record<IdPrograma, number>>;
  degradados: IdPrograma[];
  bloqueadosComoTop: IdPrograma[];
  facturacion: Facturacion | null;
};

const FACTURACIONES = new Set(["<100k", "100k-1M", "1M-20M", ">20M"]);

export function efectosDeSeguimiento(
  respuestas: Record<string, string>,
  noul: Record<string, number>,
  etapa_nivel: number | null,
  umbrales: Umbrales,
): EfectosSeguimiento {
  const prioridades: Partial<Record<IdPrograma, number>> = {};
  const degradados: IdPrograma[] = [];
  const bloqueadosComoTop: IdPrograma[] = [];
  let facturacion: Facturacion | null = null;
  const sumar = (id: IdPrograma, n: number) => {
    prioridades[id] = (prioridades[id] ?? 0) + n;
  };

  // La familia elegida como más urgente sube completa (dentro de ella manda el fit).
  const urgente = FAMILIAS.find((f) => f.id === respuestas.prioridad);
  for (const id of urgente?.programas ?? []) {
    sumar(id, 1);
  }
  if (respuestas.formato === "presencial") {
    sumar("Inmersion_Ejecutiva", 1);
  } else if (respuestas.formato === "online") {
    bloqueadosComoTop.push("Inmersion_Ejecutiva");
  }
  const fact = respuestas.facturacion;
  if (fact !== undefined && FACTURACIONES.has(fact)) {
    facturacion = fact as Facturacion;
  }
  if (respuestas.cliente === "b2b") {
    degradados.push("Instagram_TikTok");
  } else if (respuestas.cliente === "b2c") {
    degradados.push("Sales_Machine", "LinkedIn_Sales", "AI_Sales");
    sumar("Instagram_TikTok", 1);
  }
  if (respuestas.reuniones === "menos_20") {
    sumar("Sales_Machine", 2);
  }
  if (respuestas.uso_ia === "personal") {
    sumar("Second_Brain", 1);
  } else if (respuestas.uso_ia === "equipo") {
    if ((noul.operacion_desordenada ?? 0) > umbrales.umbral_dolor) {
      sumar("Operaciones_con_AI", 1);
    } else {
      sumar("AI_for_Executives", 1);
    }
  } else if (respuestas.uso_ia === "producto") {
    sumar("AI_for_Developers", 1);
  }
  if (respuestas.inversion_previa === "no") {
    sumar("Fundraising_Fundamentals", 1);
  } else if (respuestas.inversion_previa === "si") {
    sumar("Raise_your_round", 1);
  }
  if (respuestas.rol_growth === "ejecuto") {
    sumar("Growth_Rockstar", 1);
  } else if (respuestas.rol_growth === "dirijo") {
    sumar((etapa_nivel ?? 0) >= 3 ? "Xtreme_Growth" : "Advanced_Strategy", 1);
  }
  return { prioridades, degradados, bloqueadosComoTop, facturacion };
}
