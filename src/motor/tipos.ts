import type { IdDolor, IdFamilia, IdPrograma, Perfil } from "./catalogo.ts";

export type Umbrales = {
  umbral_recomendar: number;
  umbral_mostrar: number;
  umbral_choice: number;
  umbral_dolor: number;
  umbral_vaga: number;
  delta_hermanos: number;
};

export type Facturacion = "<100k" | "100k-1M" | "1M-20M" | ">20M";

export type ContextoRequisitos = {
  perfil: Perfil;
  etapa_nivel: number | null;
  edad_hijo: number | null;
  facturacion: Facturacion | null;
};

export type FilaRanking = {
  programa: IdPrograma;
  fit_jev: number;
  fit: number;
  prioridad: number;
  cumple: boolean;
  condicion: string | null;
  bloqueado_como_top: boolean;
};

export type Etiqueta = "Muy recomendado" | "Recomendado" | "Podría servirte";

export type FilaVisible = {
  id: IdPrograma;
  nombre: string;
  url: string;
  fit: number;
  etiqueta: Etiqueta | null;
  cumple_requisito: boolean;
  condicion_pendiente: string | null;
  // Dolores confirmados de la persona que apuntan a este programa (por familia).
  motivos?: string[];
  // Aviso cuando la afinidad bajó por ser de un tema que la persona no confirmó.
  nota?: string;
};

export type ResultadoMotor = {
  tipo: "recomendado" | "preliminar" | "conversacion";
  programa_top: FilaVisible | null;
  requiere_revision: boolean;
  ranking: FilaVisible[];
  // Programas a 10 puntos o menos del n.º 1, con la razón de que no quedaran primero.
  cercanos: { id: IdPrograma; nombre: string; url: string; fit: number; razon: string }[];
  motivo_top: string;
  familias: { id: IdFamilia; nombre: string; valor: number }[];
  chips: string[];
  orden: IdPrograma[];
};

// Misma forma que `RespuestasJev` de src/jev/tipos.ts; el motor no importa de src/jev.
export type RespuestasMotor = {
  noul: Record<string, number>;
  choice: { valor: string; confianza: number } | null;
  score: { valor: number; confianza: number } | null;
};

export type DolorDetectado = {
  id: IdDolor;
  etiqueta: string;
  valor: number;
  familia: IdFamilia;
};

export type PreguntaSeguimiento = {
  id: string;
  texto: string;
  solo_si?: Record<string, string>;
  opciones: { id: string; etiqueta: string }[];
};

export type BloqueSeguimiento = {
  id: string;
  familia: IdFamilia;
  preguntas: PreguntaSeguimiento[];
};
