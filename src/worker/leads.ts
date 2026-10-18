import { Hono } from "hono";
import type { Bindings } from "./app.ts";
import type { FilaLeadVentas } from "./repositorio.ts";
import { listarLeads } from "./repositorio.ts";
import { compararSeguro } from "./seguridad.ts";

// Vista de leads para el equipo comercial. Lleva datos de contacto, así que exige
// LEADS_TOKEN (secreto aparte de QA_TOKEN). Sin el secreto configurado: 401 siempre.

export type Calificacion = "caliente" | "tibio" | "frio";

// Programas de mayor ticket: un lead completo con uno de estos como n.º 1 va primero.
const ALTO_VALOR = new Set(["Inmersion_Ejecutiva", "Multipliers", "Planes_Corporativos"]);

export function calificar(l: FilaLeadVentas): Calificacion {
  if (l.quiere_asesor === 1) {
    return "caliente";
  }
  if (l.estado === "completo" && l.programa_top && ALTO_VALOR.has(l.programa_top)) {
    return "caliente";
  }
  if (l.estado === "completo" && l.requiere_revision === 0) {
    return "tibio";
  }
  return "frio";
}

const ORDEN: Record<Calificacion, number> = { caliente: 0, tibio: 1, frio: 2 };

export const leads = new Hono<{ Bindings: Bindings }>();

leads.get("/", async (c) => {
  const esperado = c.env.LEADS_TOKEN;
  const recibido = (c.req.header("Authorization") ?? "").replace(/^Bearer /, "");
  if (!esperado || !compararSeguro(recibido, esperado)) {
    return c.json({ error: { code: "NO_AUTORIZADO", message: "Token inválido." } }, 401);
  }
  const filas = (await listarLeads(c.env.DB, 200))
    .map((l) => ({ ...l, calificacion: calificar(l) }))
    .sort((a, b) => ORDEN[a.calificacion] - ORDEN[b.calificacion]);
  c.header("Cache-Control", "no-store");
  return c.json({ leads: filas });
});
