import type { IdDolor, IdPrograma } from "../motor/catalogo.ts";

// Palabras clave del mock. Todo en minúsculas y sin acentos; la comparación es «el texto contiene la cadena».
export const PALABRAS_DOLOR: Record<IdDolor | "objecion_tiempo_o_precio", string[]> = {
  dependencia_fundador: [
    "depende de mi",
    "todo pasa por mi",
    "horas a la semana",
    "no delego",
    "sin mi",
  ],
  bloqueo_comercial: [
    "vendo poco",
    "no vendo",
    "ventas",
    "vender",
    "proceso comercial",
    "clientes nuevos",
  ],
  quiere_adoptar_ia: ["inteligencia artificial", "usar ia", "adoptar ia", "con ia"],
  tareas_repetitivas_ia: ["tareas repetitivas", "repetitiv", "correos", "pierdo horas"],
  operacion_desordenada: ["caos", "apagar incendios", "apago incendios", "desorden", "operacion"],
  busca_capital: ["inversion", "inversionista", "capital", "levantar", "ronda"],
  dolor_growth: ["no crece", "crecer", "usuarios", "retencion", "adquisicion", "growth"],
  busca_expansion: ["expandir", "otros paises", "internacional", "expansion"],
  dolor_equipo_talento: ["contratar", "talento", "cultura", "mi equipo no", "retener"],
  ventas_por_referidos: ["referido", "boca a boca", "recomendacion"],
  objecion_tiempo_o_precio: ["caro", "precio", "no tengo tiempo"],
};

export const SENALES_FIT: Record<IdPrograma, { dolores: IdDolor[]; palabras: string[] }> = {
  Inmersion_Ejecutiva: { dolores: ["dependencia_fundador", "busca_expansion"], palabras: [] },
  Multipliers: { dolores: [], palabras: ["mentor", "acompanamiento", "mastermind"] },
  AI_for_Executives: { dolores: ["quiere_adoptar_ia"], palabras: [] },
  Operaciones_con_AI: { dolores: ["operacion_desordenada"], palabras: [] },
  Sales_Machine: { dolores: ["bloqueo_comercial"], palabras: [] },
  AI_Sales: { dolores: [], palabras: ["prospect", "ventas con ia", "automatizar ventas"] },
  Fundraising_Fundamentals: { dolores: ["busca_capital"], palabras: [] },
  Next: { dolores: [], palabras: ["hijo", "hija", "adolescente"] },
  Raise_your_round: { dolores: ["busca_capital"], palabras: [] },
  Instagram_TikTok: { dolores: [], palabras: ["instagram", "tiktok", "redes sociales"] },
  LinkedIn_Sales: { dolores: ["ventas_por_referidos"], palabras: ["linkedin"] },
  Second_Brain: { dolores: ["tareas_repetitivas_ia"], palabras: [] },
  AI_for_Developers: {
    dolores: [],
    palabras: ["desarrollador", "programador", "programar", "codigo"],
  },
  Growth_Rockstar: { dolores: ["dolor_growth"], palabras: [] },
  Advanced_Strategy: { dolores: [], palabras: ["equipo de growth", "vp de", "head de"] },
  Xtreme_Growth: { dolores: [], palabras: ["escalar agresiv", "traccion"] },
  Planes_Corporativos: {
    dolores: [],
    palabras: ["colaboradores", "programa corporativo", "formar equipos", "formar a mis equipos"],
  },
};
