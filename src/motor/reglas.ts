import type { Perfil } from "./catalogo.ts";
import type { Facturacion } from "./tipos.ts";

// Regla de la Inmersión Ejecutiva, como enruta Andrés: dueño de un negocio que ya factura
// «milloncitos de dólares para arriba» y cuyo reto es que todo depende de él o expandirse.
// Solo se aplica con la facturación respondida en el seguimiento (nunca se supone).
const UMBRAL_SENAL = 0.8;

export type EntradaReglaInmersion = {
  perfil: Perfil;
  etapa_nivel: number | null;
  facturacion: Facturacion | null;
  noul: Record<string, number>;
};

export function aplicaReglaInmersion(e: EntradaReglaInmersion): boolean {
  const factura1M = e.facturacion === "1M-20M" || e.facturacion === ">20M";
  const senal =
    (e.noul.dependencia_fundador ?? 0) > UMBRAL_SENAL ||
    (e.noul.busca_expansion ?? 0) > UMBRAL_SENAL;
  return e.perfil === "founder" && (e.etapa_nivel ?? 0) >= 3 && factura1M && senal;
}
