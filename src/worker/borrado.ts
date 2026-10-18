import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { Bindings } from "./app.ts";
import { alFallar } from "./esquemas.ts";

// Borrado de datos personales: a pedido de la persona (POST /api/borrado) y automático por
// antigüedad (cron diario, ver `scheduled` en index.ts). Acceso a D1 de `leads` y `resultados`
// solo para borrar; las demás lecturas y escrituras siguen en repositorio.ts.

export const DIAS_RETENCION = 90;

const soloDigitos = (texto: string) => texto.replace(/\D/g, "");

const esquemaBorrado = z.object({
  email: z.email().max(120),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/),
});

// Borra los leads cuyo correo y WhatsApp coinciden (los dos: con solo el correo cualquiera
// podría borrar a otra persona) y sus tarjetas públicas. Devuelve cuántos leads borró.
export async function borrarPorContacto(
  db: D1Database,
  email: string,
  whatsapp: string,
): Promise<number> {
  const { results } = await db
    .prepare("SELECT id, whatsapp, resultado_id FROM leads WHERE lower(email) = lower(?)")
    .bind(email)
    .all<{ id: number; whatsapp: string; resultado_id: string | null }>();
  const digitos = soloDigitos(whatsapp);
  const coinciden = results.filter((l) => soloDigitos(l.whatsapp) === digitos);
  if (coinciden.length === 0) {
    return 0;
  }
  // Primero los leads (tienen la llave foránea hacia resultados), luego las tarjetas.
  await db.batch([
    ...coinciden.map((l) => db.prepare("DELETE FROM leads WHERE id = ?").bind(l.id)),
    ...coinciden
      .filter((l) => l.resultado_id)
      .map((l) => db.prepare("DELETE FROM resultados WHERE id = ?").bind(l.resultado_id)),
  ]);
  return coinciden.length;
}

// Purga diaria: leads con más de DIAS_RETENCION días y las tarjetas que ya nadie referencia.
export async function purgarAntiguos(db: D1Database, ahora: Date): Promise<void> {
  const corte = new Date(ahora.getTime() - DIAS_RETENCION * 86_400_000).toISOString();
  await db.batch([
    db.prepare("DELETE FROM leads WHERE created_at < ?").bind(corte),
    db
      .prepare(
        `DELETE FROM resultados WHERE created_at < ?
           AND id NOT IN (SELECT resultado_id FROM leads WHERE resultado_id IS NOT NULL)`,
      )
      .bind(corte),
  ]);
}

export const borrado = new Hono<{ Bindings: Bindings }>();

// Siempre la misma respuesta, exista o no el correo: la ruta no sirve para averiguar quién
// hizo el diagnóstico.
borrado.post("/", zValidator("json", esquemaBorrado, alFallar), async (c) => {
  const { email, whatsapp } = c.req.valid("json");
  const n = await borrarPorContacto(c.env.DB, email, whatsapp);
  console.log(JSON.stringify({ evento: "borrado", leads: n }));
  return c.json({ ok: true }, 202);
});
