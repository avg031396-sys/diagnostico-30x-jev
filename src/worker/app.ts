import { Hono } from "hono";

// Variables y secretos que lee el Worker. `Env` es global: lo genera `wrangler types` en
// worker-configuration.d.ts (D1 `DB`, `ASSETS`, `LIMITE_DIAGNOSTICO` y las variables de wrangler.jsonc).
// Los secretos de Composio y QA_TOKEN no están en wrangler.jsonc, por eso se declaran opcionales aquí.
export type Bindings = Env & {
  QA_TOKEN?: string;
  COMPOSIO_API_KEY?: string;
  COMPOSIO_OPENROUTER_ACCOUNT_ID?: string;
  COMPOSIO_JEV_ACCOUNT_ID?: string;
  JEV_MODEL_COMPOSIO?: string;
};

export const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/salud", (c) => c.json({ ok: true, modo: c.env.JEV_MODE }));

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json(
      { error: { code: "NO_ENCONTRADO", message: "No encontramos lo que buscas." } },
      404,
    );
  }
  return c.text("No encontrado", 404);
});
