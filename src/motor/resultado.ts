import type { IdDolor, IdPrograma, Perfil } from "./catalogo.ts";
import { DOLORES_CHIP } from "./catalogo.ts";
import { familiasDe, valoresFamilias } from "./dolores.ts";
import {
  aFilaVisible,
  calcularRanking,
  fitsDesdeNoul,
  primerRecomendable,
  visibles,
} from "./ranking.ts";
import { efectosDeSeguimiento, elegirSeguimientos } from "./seguimientos.ts";
import type {
  ContextoRequisitos,
  FilaRanking,
  PreguntaSeguimiento,
  RespuestasMotor,
  ResultadoMotor,
  Umbrales,
} from "./tipos.ts";

export type EntradaResultado = {
  respuestas: RespuestasMotor;
  perfil: Perfil;
  etapa_nivel: number | null;
  edad_hijo: number | null;
  dolores_confirmados: IdDolor[];
  respuestas_seguimiento: Record<string, string> | null;
};

export type SalidaResultado =
  | { pendiente: true; seguimientos: PreguntaSeguimiento[] }
  | { pendiente: false; resultado: ResultadoMotor; confianza_choice: number | null };

function sumarPrioridades(
  a: Partial<Record<IdPrograma, number>>,
  b: Partial<Record<IdPrograma, number>>,
): Partial<Record<IdPrograma, number>> {
  const salida = { ...a };
  for (const [id, n] of Object.entries(b)) {
    salida[id as IdPrograma] = (salida[id as IdPrograma] ?? 0) + (n ?? 0);
  }
  return salida;
}

function elegirTop(filas: FilaRanking[], umbrales: Umbrales) {
  const recomendable = primerRecomendable(filas, umbrales);
  if (recomendable) {
    return { top: recomendable, hayRecomendable: true };
  }
  const vis = visibles(filas, umbrales);
  return { top: vis.find((f) => f.cumple) ?? vis[0] ?? null, hayRecomendable: false };
}

export function resolverResultado(entrada: EntradaResultado, umbrales: Umbrales): SalidaResultado {
  const { respuestas, perfil, etapa_nivel, edad_hijo } = entrada;
  const familiasConfirmadas = familiasDe(entrada.dolores_confirmados);
  const fits = fitsDesdeNoul(respuestas.noul);
  let prioridades: Partial<Record<IdPrograma, number>> = {};

  // Regla NEXT: madre o padre con hijo/a de 13 a 18.
  if (perfil === "padre_madre_next" && edad_hijo !== null && edad_hijo >= 13 && edad_hijo <= 18) {
    prioridades.Next = 3;
    fits.Next = Math.max(fits.Next, umbrales.umbral_recomendar);
  }

  const ctx: ContextoRequisitos = { perfil, etapa_nivel, edad_hijo, facturacion: null };
  let degradados: IdPrograma[] = [];
  let bloqueadosComoTop: IdPrograma[] = [];
  let filas = calcularRanking(
    fits,
    { ctx, familiasConfirmadas, prioridades, degradados, bloqueadosComoTop },
    umbrales,
  );

  const choice = respuestas.choice;
  if (entrada.respuestas_seguimiento === null) {
    const seguimientos = elegirSeguimientos({
      filas,
      familiasConfirmadas,
      choice: choice?.valor ?? null,
      etapa_nivel,
      umbrales,
    });
    if (seguimientos.length > 0) {
      return { pendiente: true, seguimientos };
    }
  } else {
    const efectos = efectosDeSeguimiento(
      entrada.respuestas_seguimiento,
      respuestas.noul,
      etapa_nivel,
      umbrales,
    );
    prioridades = sumarPrioridades(prioridades, efectos.prioridades);
    degradados = efectos.degradados;
    bloqueadosComoTop = efectos.bloqueadosComoTop;
    filas = calcularRanking(
      fits,
      {
        ctx: { ...ctx, facturacion: efectos.facturacion },
        familiasConfirmadas,
        prioridades,
        degradados,
        bloqueadosComoTop,
      },
      umbrales,
    );
  }

  const { top, hayRecomendable } = elegirTop(filas, umbrales);
  const vis = visibles(filas, umbrales);
  const choiceInvalido =
    !choice || choice.valor === "requiere_revision" || choice.valor === "no_aplica";
  const requiereRevision =
    !top ||
    !hayRecomendable ||
    choiceInvalido ||
    choice?.valor !== top.programa ||
    (choice?.confianza ?? 0) < umbrales.umbral_choice ||
    (respuestas.noul.datos_incoherentes ?? 0) > 0.5;

  const tipo = !top ? "conversacion" : requiereRevision ? "preliminar" : "recomendado";
  const etiquetas = new Map<string, string>(DOLORES_CHIP.map((d) => [d.id, d.etiqueta]));

  return {
    pendiente: false,
    confianza_choice: choice?.confianza ?? null,
    resultado: {
      tipo,
      programa_top: top ? aFilaVisible(top) : null,
      requiere_revision: requiereRevision,
      ranking: vis.filter((f) => f !== top).map(aFilaVisible),
      familias: valoresFamilias(respuestas.noul),
      chips: entrada.dolores_confirmados.map((id) => etiquetas.get(id) ?? id),
      orden: filas.map((f) => f.programa),
    },
  };
}
