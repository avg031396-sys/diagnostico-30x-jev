import { z } from "zod";
import seguimientos from "../data/seguimientos.json" with { type: "json" };
import { DOLORES_CHIP, ETAPAS, FAMILIAS, METAS, PERFILES } from "../motor/catalogo.ts";

type Ids<T extends readonly { id: string }[]> = [T[number]["id"], ...T[number]["id"][]];
const ids = <T extends readonly { id: string }[]>(lista: T) => lista.map((x) => x.id) as Ids<T>;

export const REGEX_TOKEN = /^[A-Za-z0-9_-]{22}$/;
export const REGEX_RESULTADO = /^[0-9A-Za-z]{10}$/;

export const esquemaToken = z.object({ token: z.string().regex(REGEX_TOKEN) });
export const esquemaResultadoId = z.object({ id: z.string().regex(REGEX_RESULTADO) });

export const crearDiagnostico = z
  .object({
    contacto: z.object({
      nombre: z.string().trim().min(2).max(80),
      email: z.email().max(120),
      whatsapp: z
        .string()
        .trim()
        .regex(/^\+?[0-9 ()-]{7,20}$/),
      empresa: z.string().trim().max(120).optional(),
    }),
    consentimiento: z.literal(true),
    perfil: z.enum(ids(PERFILES)),
    etapa: z.enum(ids(ETAPAS)).optional(),
    edad_hijo: z.number().int().min(10).max(25).optional(),
    reto: z.string().trim().min(40).max(1200),
  })
  .superRefine((d, ctx) => {
    if (d.perfil === "padre_madre_next") {
      if (d.edad_hijo === undefined) {
        ctx.addIssue({ code: "custom", path: ["edad_hijo"], message: "falta edad_hijo" });
      }
      if (d.etapa !== undefined) {
        ctx.addIssue({ code: "custom", path: ["etapa"], message: "no aplica etapa" });
      }
    } else if (d.etapa === undefined) {
      ctx.addIssue({ code: "custom", path: ["etapa"], message: "falta etapa" });
    }
  });

export const aclarar = z.object({
  dolores: z
    .array(z.enum(ids(FAMILIAS)))
    .min(1)
    .max(6)
    .refine((a) => new Set(a).size === a.length),
  metas: z
    .array(z.enum(ids(METAS)))
    .max(5)
    .refine((a) => new Set(a).size === a.length),
});

const PREGUNTAS = seguimientos.bloques.flatMap((b) => b.preguntas);

export const finalizar = z.object({
  dolores_confirmados: z
    .array(z.enum(ids(DOLORES_CHIP)))
    .max(10)
    .refine((a) => new Set(a).size === a.length),
  respuestas_seguimiento: z
    .record(z.string(), z.string())
    .refine((r) =>
      Object.entries(r).every(([pregunta, valor]) =>
        PREGUNTAS.some((p) => p.id === pregunta && p.opciones.some((o) => o.id === valor)),
      ),
    )
    .optional(),
});

export type EntradaCrear = z.infer<typeof crearDiagnostico>;

// Hook común de zValidator: toda validación fallida devuelve el mismo 400.
export function alFallar(
  resultado: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } },
  c: { json: (cuerpo: unknown, estado: 400) => Response },
) {
  if (!resultado.success) {
    const campos = (resultado.error?.issues ?? []).map((i) => i.path.map(String).join("."));
    return c.json(
      { error: { code: "VALIDACION", message: "Revisa los datos del formulario.", campos } },
      400,
    );
  }
  return undefined;
}
