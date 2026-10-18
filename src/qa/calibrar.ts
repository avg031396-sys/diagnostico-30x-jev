import { resolverResultado } from "../motor/resultado.ts";
import type { Umbrales } from "../motor/tipos.ts";
import type { CasoPrueba, FilaQa } from "./evaluar.ts";
import { evaluarCaso } from "./evaluar.ts";

// Calibración fuera de línea: vuelve a correr el motor sobre las respuestas de JEV guardadas en
// una corrida de QA, con cada combinación de la rejilla. Sin red: JEV no se llama otra vez.

export type Combinacion = Pick<Umbrales, "umbral_recomendar" | "umbral_mostrar" | "umbral_choice">;

export type Marcador = { evaluables: number; top1: number; top3: number };

export type FilaCalibracion = {
  combinacion: Combinacion;
  calibracion: Marcador;
  validacion: Marcador;
};

export type ReporteCalibracion = {
  filas: FilaCalibracion[];
  actual: FilaCalibracion;
  mejor: FilaCalibracion;
  // Validación más de 10 puntos por debajo de calibración (top-1): no se debe escribir.
  sobreajuste: boolean;
};

const PREFIJO_VALIDACION = "parafrasis-";

function pasos(desde: number, hasta: number, paso: number): number[] {
  const salida: number[] = [];
  for (let v = desde; v <= hasta + 1e-9; v += paso) {
    salida.push(Math.round(v * 100) / 100);
  }
  return salida;
}

export function rejilla(): Combinacion[] {
  const combinaciones: Combinacion[] = [];
  for (const umbral_recomendar of pasos(0.4, 0.8, 0.05)) {
    for (const umbral_mostrar of pasos(0.2, 0.6, 0.05)) {
      if (umbral_mostrar > umbral_recomendar) {
        continue;
      }
      for (const umbral_choice of pasos(0.3, 0.8, 0.1)) {
        combinaciones.push({ umbral_recomendar, umbral_mostrar, umbral_choice });
      }
    }
  }
  return combinaciones;
}

export function reevaluar(fila: FilaQa, caso: CasoPrueba, umbrales: Umbrales): FilaQa {
  const extra = {
    dolores_confirmados: fila.dolores_confirmados,
    respuestas_seguimiento: fila.respuestas_seguimiento,
  };
  const ev = { respuestas: fila.respuestas, latencia_ms: fila.latencia_ms, costo_usd: 0 };
  if (!fila.respuestas) {
    return evaluarCaso(caso, ev, null, extra);
  }
  const salida = resolverResultado(
    {
      respuestas: fila.respuestas,
      perfil: fila.perfil,
      etapa_nivel: fila.etapa_nivel,
      edad_hijo: fila.edad_hijo,
      dolores_confirmados: fila.dolores_confirmados,
      respuestas_seguimiento: fila.respuestas_seguimiento,
    },
    umbrales,
  );
  return evaluarCaso(caso, ev, salida.pendiente ? null : salida.resultado, extra);
}

function marcar(filas: FilaQa[]): Marcador {
  const evaluables = filas.filter((f) => f.evaluable);
  return {
    evaluables: evaluables.length,
    top1: evaluables.filter((f) => f.acierto_top1).length,
    top3: evaluables.filter((f) => f.acierto_top3).length,
  };
}

export const porcentaje = (m: Marcador, campo: "top1" | "top3") =>
  m.evaluables === 0 ? 0 : (100 * m[campo]) / m.evaluables;

function distancia(a: Combinacion, b: Combinacion): number {
  return (
    Math.abs(a.umbral_recomendar - b.umbral_recomendar) +
    Math.abs(a.umbral_mostrar - b.umbral_mostrar) +
    Math.abs(a.umbral_choice - b.umbral_choice)
  );
}

export function calibrar(
  detalle: FilaQa[],
  casos: CasoPrueba[],
  base: Umbrales,
): ReporteCalibracion {
  const porId = new Map(casos.map((c) => [c.id, c]));
  const pares = detalle.flatMap((fila) => {
    const caso = porId.get(fila.id);
    return caso ? [{ fila, caso }] : [];
  });
  const evaluar = (combinacion: Combinacion): FilaCalibracion => {
    const umbrales = { ...base, ...combinacion };
    const filas = pares.map(({ fila, caso }) => reevaluar(fila, caso, umbrales));
    return {
      combinacion,
      calibracion: marcar(filas.filter((f) => !f.id.startsWith(PREFIJO_VALIDACION))),
      validacion: marcar(filas.filter((f) => f.id.startsWith(PREFIJO_VALIDACION))),
    };
  };
  const actual = evaluar({
    umbral_recomendar: base.umbral_recomendar,
    umbral_mostrar: base.umbral_mostrar,
    umbral_choice: base.umbral_choice,
  });
  // Orden: top-1 de calibración, luego top-3, y a empate gana la más cercana a los umbrales actuales.
  const filas = rejilla()
    .map(evaluar)
    .sort(
      (a, b) =>
        b.calibracion.top1 - a.calibracion.top1 ||
        b.calibracion.top3 - a.calibracion.top3 ||
        distancia(a.combinacion, actual.combinacion) - distancia(b.combinacion, actual.combinacion),
    );
  const primera = filas[0] ?? actual;
  // Solo se cambia si mejora de verdad: a igual top-1 y top-3 se quedan los umbrales actuales.
  const mejor =
    primera.calibracion.top1 > actual.calibracion.top1 ||
    (primera.calibracion.top1 === actual.calibracion.top1 &&
      primera.calibracion.top3 > actual.calibracion.top3)
      ? primera
      : actual;
  const sobreajuste =
    mejor.validacion.evaluables > 0 &&
    porcentaje(mejor.calibracion, "top1") - porcentaje(mejor.validacion, "top1") > 10;
  return { filas, actual, mejor, sobreajuste };
}
