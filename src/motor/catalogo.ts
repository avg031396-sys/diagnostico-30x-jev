// Catálogo escrito a mano de lo que dicen los insumos (src/data/insumos-jev.json).
// No importa el JSON: la interfaz importa este archivo y no debe cargar 137 KB de insumos.
// tests/jev/preguntas.test.ts falla si este archivo y los insumos se separan.

export const PERFILES = [
  { id: "founder", etiqueta: "Fundador/a" },
  { id: "ejecutivo", etiqueta: "Ejecutivo/a" },
  { id: "corporativo", etiqueta: "Represento una empresa" },
  { id: "padre_madre_next", etiqueta: "Tengo un hijo/a adolescente (13-18)" },
  { id: "independiente", etiqueta: "Independiente / consultor" },
] as const;
export type Perfil = (typeof PERFILES)[number]["id"];

export const ETAPAS = [
  { id: "idea", etiqueta: "Tengo una idea", nivel: 0 },
  { id: "mvp", etiqueta: "MVP sin facturar", nivel: 1 },
  { id: "arrancando", etiqueta: "Ya factura, arrancando", nivel: 2 },
  { id: "creciendo", etiqueta: "Creciendo, quiero escalar", nivel: 3 },
  { id: "consolidada", etiqueta: "Empresa consolidada", nivel: 4 },
] as const;
export type Etapa = (typeof ETAPAS)[number]["id"];

export const ETAPA_NIVEL: Record<Etapa, number> = {
  idea: 0,
  mvp: 1,
  arrancando: 2,
  creciendo: 3,
  consolidada: 4,
};

export type IdFamilia =
  | "ventas"
  | "inteligencia_artificial"
  | "operacion"
  | "capital"
  | "growth"
  | "escala_y_estrategia";

// Los 10 Noul de dolor que abren una familia. Etiqueta = texto del chip que ve la persona.
export const DOLORES_CHIP = [
  { id: "bloqueo_comercial", etiqueta: "Pocas ventas", familia: "ventas" },
  { id: "ventas_por_referidos", etiqueta: "Vendes solo por referidos", familia: "ventas" },
  { id: "quiere_adoptar_ia", etiqueta: "Quieres adoptar IA", familia: "inteligencia_artificial" },
  {
    id: "tareas_repetitivas_ia",
    etiqueta: "Tareas repetitivas que podría hacer la IA",
    familia: "inteligencia_artificial",
  },
  { id: "operacion_desordenada", etiqueta: "Operación desordenada", familia: "operacion" },
  { id: "busca_capital", etiqueta: "Buscas inversión", familia: "capital" },
  { id: "dolor_growth", etiqueta: "Tu negocio no crece", familia: "growth" },
  { id: "dependencia_fundador", etiqueta: "Todo depende de ti", familia: "escala_y_estrategia" },
  { id: "busca_expansion", etiqueta: "Quieres expandirte", familia: "escala_y_estrategia" },
  {
    id: "dolor_equipo_talento",
    etiqueta: "Te falta equipo o talento",
    familia: "escala_y_estrategia",
  },
] as const satisfies readonly { id: string; etiqueta: string; familia: IdFamilia }[];
export type IdDolor = (typeof DOLORES_CHIP)[number]["id"];

// Los 17 programas, en el orden de las opciones del Choice de los insumos.
export const PROGRAMAS = [
  {
    id: "Inmersion_Ejecutiva",
    nombre: "Inmersión Ejecutiva",
    url: "https://30x.com/inmersivo",
    familias: ["escala_y_estrategia"],
  },
  {
    id: "Multipliers",
    nombre: "Multipliers",
    url: "https://30x.com/multipliers",
    familias: ["escala_y_estrategia"],
  },
  {
    id: "AI_for_Executives",
    nombre: "AI for Executives",
    url: "https://30x.com/ai-for-executives",
    familias: ["inteligencia_artificial"],
  },
  {
    id: "Operaciones_con_AI",
    nombre: "Operaciones con AI",
    url: "https://30x.com/operacionesconai",
    familias: ["operacion"],
  },
  {
    id: "Sales_Machine",
    nombre: "Sales Machine",
    url: "https://30x.com/programas/sales-machine",
    familias: ["ventas"],
  },
  {
    id: "AI_Sales",
    nombre: "AI Sales",
    url: "https://30x.com/programas/ai-sales",
    familias: ["ventas", "inteligencia_artificial"],
  },
  {
    id: "Fundraising_Fundamentals",
    nombre: "Fundraising Fundamentals",
    url: "https://30x.com/fundraising-fundamentals",
    familias: ["capital"],
  },
  { id: "Next", nombre: "NEXT", url: "https://30x.com/next", familias: [] },
  {
    id: "Raise_your_round",
    nombre: "Raise your Round",
    url: "https://30x.com/raise-your-round",
    familias: ["capital"],
  },
  {
    id: "Instagram_TikTok",
    nombre: "Instagram & TikTok",
    url: "https://30x.com/instagram-tiktok",
    familias: ["ventas"],
  },
  {
    id: "LinkedIn_Sales",
    nombre: "LinkedIn Sales",
    url: "https://30x.com/linkedin-sales",
    familias: ["ventas"],
  },
  {
    id: "Second_Brain",
    nombre: "Second Brain",
    url: "https://30x.com/ai-second-brain",
    familias: ["inteligencia_artificial"],
  },
  {
    id: "AI_for_Developers",
    nombre: "AI for Developers",
    url: "https://30x.com/ai-for-developers",
    familias: ["inteligencia_artificial"],
  },
  {
    id: "Growth_Rockstar",
    nombre: "Growth Rockstar",
    url: "https://30x.com/programas/growth-rockstar",
    familias: ["growth"],
  },
  {
    id: "Advanced_Strategy",
    nombre: "Advanced Strategy",
    url: "https://30x.com/programas/advanced-strategy",
    familias: ["growth"],
  },
  {
    id: "Xtreme_Growth",
    nombre: "Xtreme Growth",
    url: "https://30x.com/programas/xtreme-growth",
    familias: ["growth"],
  },
  {
    id: "Planes_Corporativos",
    nombre: "Planes Corporativos",
    url: "https://30x.com/planes-corporativos",
    familias: [],
  },
] as const satisfies readonly {
  id: string;
  nombre: string;
  url: string;
  familias: readonly IdFamilia[];
}[];
export type IdPrograma = (typeof PROGRAMAS)[number]["id"];

// Las 6 familias de `familias_dolor`: `dolores` = `se_activa_con`.
export const FAMILIAS = [
  {
    id: "ventas",
    nombre: "Ventas",
    dolores: ["bloqueo_comercial", "ventas_por_referidos"],
    programas: ["Sales_Machine", "LinkedIn_Sales", "AI_Sales", "Instagram_TikTok"],
  },
  {
    id: "inteligencia_artificial",
    nombre: "Inteligencia artificial",
    dolores: ["quiere_adoptar_ia", "tareas_repetitivas_ia"],
    programas: ["AI_for_Executives", "Second_Brain", "AI_for_Developers", "AI_Sales"],
  },
  {
    id: "operacion",
    nombre: "Operación",
    dolores: ["operacion_desordenada"],
    programas: ["Operaciones_con_AI"],
  },
  {
    id: "capital",
    nombre: "Capital",
    dolores: ["busca_capital"],
    programas: ["Fundraising_Fundamentals", "Raise_your_round"],
  },
  {
    id: "growth",
    nombre: "Growth",
    dolores: ["dolor_growth"],
    programas: ["Growth_Rockstar", "Advanced_Strategy", "Xtreme_Growth"],
  },
  {
    id: "escala_y_estrategia",
    nombre: "Escala y estrategia",
    dolores: ["dependencia_fundador", "busca_expansion", "dolor_equipo_talento"],
    programas: ["Inmersion_Ejecutiva", "Multipliers"],
  },
] as const satisfies readonly {
  id: IdFamilia;
  nombre: string;
  dolores: readonly IdDolor[];
  programas: readonly IdPrograma[];
}[];

// Botones de la pantalla «Ayúdanos a entenderte mejor» (cada dolor abre una familia).
export const DOLORES_ACLARACION = [
  { etiqueta: "Vendo poco o sin proceso", familia: "ventas" },
  { etiqueta: "No sé cómo usar IA", familia: "inteligencia_artificial" },
  { etiqueta: "Mi operación es un caos", familia: "operacion" },
  { etiqueta: "Necesito inversión", familia: "capital" },
  { etiqueta: "Mi negocio no crece", familia: "growth" },
  { etiqueta: "Todo depende de mí", familia: "escala_y_estrategia" },
] as const satisfies readonly { etiqueta: string; familia: IdFamilia }[];

export const METAS = [
  { id: "vender_mas", etiqueta: "Vender más" },
  { id: "levantar_capital", etiqueta: "Levantar capital" },
  { id: "liderar_equipo", etiqueta: "Liderar a mi equipo" },
  { id: "expandirme", etiqueta: "Expandirme" },
  { id: "ser_referente", etiqueta: "Ser referente" },
] as const;
export type IdMeta = (typeof METAS)[number]["id"];

export const URL_TODOS_LOS_PROGRAMAS = "https://30x.com/programas";

export function programaPorId(id: IdPrograma) {
  const programa = PROGRAMAS.find((p) => p.id === id);
  if (!programa) {
    throw new Error(`programa desconocido: ${id}`);
  }
  return programa;
}
