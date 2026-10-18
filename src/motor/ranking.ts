import type { IdFamilia, IdPrograma } from "./catalogo.ts";
import { PROGRAMAS, programaPorId } from "./catalogo.ts";
import { evaluarRequisito } from "./requisitos.ts";
import type { ContextoRequisitos, Etiqueta, FilaRanking, FilaVisible, Umbrales } from "./tipos.ts";

export type OpcionesRanking = {
  ctx: ContextoRequisitos;
  familiasConfirmadas: IdFamilia[];
  prioridades: Partial<Record<IdPrograma, number>>;
  degradados: IdPrograma[];
  bloqueadosComoTop: IdPrograma[];
};

export function fitsDesdeNoul(noul: Record<string, number>): Record<IdPrograma, number> {
  const fits = {} as Record<IdPrograma, number>;
  for (const p of PROGRAMAS) {
    fits[p.id] = noul[`fit_${p.id.toLowerCase()}`] ?? 0;
  }
  return fits;
}

export function calcularRanking(
  fits: Record<IdPrograma, number>,
  opciones: OpcionesRanking,
  _umbrales: Umbrales,
): FilaRanking[] {
  const hayConfirmadas = opciones.familiasConfirmadas.length > 0;
  const filas = PROGRAMAS.map((p, indice) => {
    const fitJev = fits[p.id] ?? 0;
    const fuera =
      hayConfirmadas &&
      p.familias.length > 0 &&
      !p.familias.some((f) => opciones.familiasConfirmadas.includes(f));
    const degradado = opciones.degradados.includes(p.id);
    const req = evaluarRequisito(p.id, opciones.ctx);
    const fila: FilaRanking = {
      programa: p.id,
      fit_jev: fitJev,
      fit: fuera || degradado ? fitJev * 0.5 : fitJev,
      prioridad: opciones.prioridades[p.id] ?? 0,
      cumple: req.cumple,
      condicion: req.condicion,
      bloqueado_como_top: opciones.bloqueadosComoTop.includes(p.id),
    };
    return { indice, fila };
  });
  filas.sort(
    (a, b) => b.fila.prioridad - a.fila.prioridad || b.fila.fit - a.fila.fit || a.indice - b.indice,
  );
  return filas.map((f) => f.fila);
}

export function etiquetaDe(fit: number): Etiqueta | null {
  if (fit >= 0.8) {
    return "Muy recomendado";
  }
  if (fit >= 0.6) {
    return "Recomendado";
  }
  if (fit >= 0.4) {
    return "Podría servirte";
  }
  return null;
}

export function primerRecomendable(filas: FilaRanking[], umbrales: Umbrales): FilaRanking | null {
  return (
    filas.find((f) => f.fit >= umbrales.umbral_recomendar && f.cumple && !f.bloqueado_como_top) ??
    null
  );
}

export function visibles(filas: FilaRanking[], umbrales: Umbrales): FilaRanking[] {
  return filas.filter((f) => f.fit >= umbrales.umbral_mostrar);
}

export function aFilaVisible(fila: FilaRanking): FilaVisible {
  const programa = programaPorId(fila.programa);
  return {
    id: fila.programa,
    nombre: programa.nombre,
    url: programa.url,
    fit: fila.fit,
    etiqueta: etiquetaDe(fila.fit),
    cumple_requisito: fila.cumple,
    condicion_pendiente: fila.cumple ? null : fila.condicion,
  };
}
