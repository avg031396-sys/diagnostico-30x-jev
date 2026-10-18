import type { Etapa, IdDolor, IdPrograma, Perfil } from "../motor/catalogo.ts";
import { ETAPA_NIVEL } from "../motor/catalogo.ts";
import type { RespuestasMotor, ResultadoMotor } from "../motor/tipos.ts";

// Forma de un caso de `casos_prueba` en src/data/insumos-jev.json (solo lo que se usa).
export type CasoPrueba = {
  id: string;
  tipo: string;
  estado: {
    perfil: Perfil;
    etapa?: Etapa;
    edad_hijo?: number;
    reto_principal: string;
    rango_facturacion_anual_usd?: string;
    reuniones_venta_semana?: number;
  };
  esperado?: { programa_recomendado?: string };
  acepta_programa_recomendado?: string[];
};

export type FilaQa = {
  id: string;
  tipo: string;
  esperado: string | null;
  top1: string | null;
  top3: string[];
  acierto_top1: boolean;
  acierto_top3: boolean;
  evaluable: boolean;
  confianza_choice: number | null;
  latencia_ms: number;
  costo_usd: number;
  respuestas: RespuestasMotor | null;
  respuestas_seguimiento: Record<string, string>;
  perfil: Perfil;
  etapa_nivel: number | null;
  edad_hijo: number | null;
  dolores_confirmados: IdDolor[];
};

export type Totales = {
  total: number;
  evaluables: number;
  aciertos_top1: number;
  aciertos_top3: number;
  latencia_p50: number;
  latencia_p95: number;
  costo_total: number;
};

// Respuestas de seguimiento automáticas: salen solo de los datos del propio caso.
export function respuestasAutomaticas(caso: CasoPrueba): Record<string, string> {
  const r: Record<string, string> = {};
  if (caso.estado.rango_facturacion_anual_usd) {
    r.facturacion = caso.estado.rango_facturacion_anual_usd;
  }
  if (typeof caso.estado.reuniones_venta_semana === "number") {
    r.cliente = "b2b";
    r.reuniones = caso.estado.reuniones_venta_semana < 20 ? "menos_20" : "20_o_mas";
  }
  return r;
}

const SALIDAS_REVISION = new Set(["requiere_revision", "no_aplica"]);

export function evaluarCaso(
  caso: CasoPrueba,
  evaluacion: { respuestas: RespuestasMotor | null; latencia_ms: number; costo_usd: number },
  resultado: ResultadoMotor | null,
  extra: { dolores_confirmados: IdDolor[]; respuestas_seguimiento: Record<string, string> },
): FilaQa {
  const esperado = caso.esperado?.programa_recomendado ?? null;
  const aceptados = new Set<string>(
    caso.acepta_programa_recomendado ?? (esperado ? [esperado] : []),
  );
  const top1 = resultado?.programa_top?.id ?? null;
  const top3: string[] = resultado ? resultado.orden.slice(0, 3) : [];
  const esperaRevision = [...aceptados].some((p) => SALIDAS_REVISION.has(p));
  const marcaRevision = resultado?.requiere_revision === true;
  const aciertoTop1 =
    resultado !== null &&
    ((top1 !== null && aceptados.has(top1)) || (esperaRevision && marcaRevision));
  const aciertoTop3 =
    resultado !== null &&
    (top3.some((id) => aceptados.has(id)) || (esperaRevision && marcaRevision));
  return {
    id: caso.id,
    tipo: caso.tipo,
    esperado,
    top1,
    top3,
    acierto_top1: esperado !== null && aciertoTop1,
    acierto_top3: esperado !== null && aciertoTop3,
    evaluable: esperado !== null,
    confianza_choice: evaluacion.respuestas?.choice?.confianza ?? null,
    latencia_ms: evaluacion.latencia_ms,
    costo_usd: evaluacion.costo_usd,
    respuestas: evaluacion.respuestas,
    respuestas_seguimiento: extra.respuestas_seguimiento,
    perfil: caso.estado.perfil,
    etapa_nivel: caso.estado.etapa ? ETAPA_NIVEL[caso.estado.etapa] : null,
    edad_hijo: caso.estado.edad_hijo ?? null,
    dolores_confirmados: extra.dolores_confirmados,
  };
}

// Percentil por rango más cercano.
function percentil(valores: number[], p: number): number {
  if (valores.length === 0) {
    return 0;
  }
  const orden = [...valores].sort((a, b) => a - b);
  const rango = Math.max(1, Math.ceil((p / 100) * orden.length));
  return orden[rango - 1] ?? 0;
}

export function totalizar(filas: FilaQa[]): Totales {
  const evaluables = filas.filter((f) => f.evaluable);
  const latencias = filas.map((f) => f.latencia_ms);
  return {
    total: filas.length,
    evaluables: evaluables.length,
    aciertos_top1: evaluables.filter((f) => f.acierto_top1).length,
    aciertos_top3: evaluables.filter((f) => f.acierto_top3).length,
    latencia_p50: percentil(latencias, 50),
    latencia_p95: percentil(latencias, 95),
    costo_total: filas.reduce((suma, f) => suma + f.costo_usd, 0),
  };
}

export type { IdPrograma };
