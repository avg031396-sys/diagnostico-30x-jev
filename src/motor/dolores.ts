import type { IdDolor, IdFamilia } from "./catalogo.ts";
import { DOLORES_CHIP, FAMILIAS } from "./catalogo.ts";
import type { DolorDetectado, Umbrales } from "./tipos.ts";

export function detectarDolores(
  noul: Record<string, number>,
  umbrales: Umbrales,
): DolorDetectado[] {
  return DOLORES_CHIP.filter((d) => (noul[d.id] ?? 0) > umbrales.umbral_dolor)
    .map((d) => ({ id: d.id, etiqueta: d.etiqueta, valor: noul[d.id] ?? 0, familia: d.familia }))
    .sort((a, b) => b.valor - a.valor);
}

export function familiasDe(doloresIds: readonly IdDolor[]): IdFamilia[] {
  const abiertas = new Set<string>();
  for (const id of doloresIds) {
    const chip = DOLORES_CHIP.find((d) => d.id === id);
    if (chip) {
      abiertas.add(chip.familia);
    }
  }
  return FAMILIAS.map((f) => f.id).filter((id) => abiertas.has(id));
}

export function necesitaAclaracion(noul: Record<string, number>, umbrales: Umbrales): boolean {
  const vaga = (noul.respuesta_vaga ?? 0) > umbrales.umbral_vaga;
  const detectados = detectarDolores(noul, umbrales);
  return vaga || familiasDe(detectados.map((d) => d.id)).length === 0;
}

export function doloresTrasAclaracion(
  noul: Record<string, number>,
  familiasElegidas: readonly IdFamilia[],
  umbrales: Umbrales,
): DolorDetectado[] {
  const salida = detectarDolores(noul, umbrales);
  for (const idFamilia of familiasElegidas) {
    if (salida.some((d) => d.familia === idFamilia)) {
      continue;
    }
    const familia = FAMILIAS.find((f) => f.id === idFamilia);
    const chip = DOLORES_CHIP.find((d) => d.id === familia?.dolores[0]);
    if (chip) {
      salida.push({
        id: chip.id,
        etiqueta: chip.etiqueta,
        valor: noul[chip.id] ?? 0,
        familia: chip.familia,
      });
    }
  }
  return salida;
}

export function valoresFamilias(
  noul: Record<string, number>,
): { id: IdFamilia; nombre: string; valor: number }[] {
  return FAMILIAS.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    valor: Math.max(0, ...f.dolores.map((d) => noul[d] ?? 0)),
  }));
}
