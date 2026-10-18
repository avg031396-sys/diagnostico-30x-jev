import type { Bindings } from "./app.ts";
import { app } from "./app.ts";
import { purgarAntiguos } from "./borrado.ts";

export default {
  fetch: app.fetch,
  // Cron diario (wrangler.jsonc `triggers`): borra leads de más de 90 días.
  async scheduled(evento: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(purgarAntiguos(env.DB, new Date(evento.scheduledTime)));
  },
} satisfies ExportedHandler<Bindings>;
