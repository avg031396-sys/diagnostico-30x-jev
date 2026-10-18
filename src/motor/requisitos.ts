import type { IdPrograma } from "./catalogo.ts";
import type { ContextoRequisitos } from "./tipos.ts";

const CREC = "tener un negocio en etapa Creciendo o Consolidada";
const INMERSION =
  "tener un negocio en etapa Creciendo o Consolidada con facturación desde USD 1 millón al año";

type Regla = { cumple: (c: ContextoRequisitos) => boolean; condicion: string | null };

const nivel = (c: ContextoRequisitos, minimo: number) =>
  c.etapa_nivel !== null && c.etapa_nivel >= minimo;

function cumpleInmersion(c: ContextoRequisitos): boolean {
  if (!nivel(c, 3)) {
    return false;
  }
  return c.facturacion === null || c.facturacion === "1M-20M" || c.facturacion === ">20M";
}

const SIEMPRE: Regla = { cumple: () => true, condicion: null };

const REGLAS: Record<IdPrograma, Regla> = {
  Inmersion_Ejecutiva: { cumple: cumpleInmersion, condicion: INMERSION },
  Multipliers: {
    cumple: cumpleInmersion,
    condicion: "cumplir primero el requisito de la Inmersión Ejecutiva",
  },
  AI_for_Executives: SIEMPRE,
  Operaciones_con_AI: { cumple: (c) => nivel(c, 3), condicion: CREC },
  Sales_Machine: {
    cumple: (c) => nivel(c, 2),
    condicion: "tener un negocio que ya factura (etapa Arrancando o más)",
  },
  AI_Sales: {
    cumple: (c) => nivel(c, 3),
    condicion: `${CREC} con proceso comercial`,
  },
  Fundraising_Fundamentals: SIEMPRE,
  Raise_your_round: { cumple: (c) => nivel(c, 1), condicion: "tener al menos un MVP" },
  Next: {
    cumple: (c) =>
      c.perfil === "padre_madre_next" &&
      c.edad_hijo !== null &&
      c.edad_hijo >= 13 &&
      c.edad_hijo <= 18,
    condicion: "ser madre o padre de un hijo/a de 13 a 18 años",
  },
  Instagram_TikTok: { cumple: (c) => nivel(c, 2), condicion: "tener un negocio que ya vende" },
  LinkedIn_Sales: { cumple: (c) => nivel(c, 2), condicion: "tener un negocio que ya vende" },
  Second_Brain: {
    cumple: (c) => nivel(c, 2),
    condicion: "tener un negocio o proyecto en marcha (etapa Arrancando o más)",
  },
  AI_for_Developers: SIEMPRE,
  Growth_Rockstar: SIEMPRE,
  Advanced_Strategy: SIEMPRE,
  Xtreme_Growth: {
    cumple: (c) => nivel(c, 3),
    condicion: "tener tracción (etapa Creciendo o Consolidada)",
  },
  Planes_Corporativos: {
    cumple: (c) => c.perfil === "corporativo",
    condicion: "representar a una empresa",
  },
};

export function evaluarRequisito(
  programa: IdPrograma,
  ctx: ContextoRequisitos,
): { cumple: boolean; condicion: string | null } {
  const regla = REGLAS[programa];
  const cumple = regla.cumple(ctx);
  return { cumple, condicion: cumple ? null : regla.condicion };
}
