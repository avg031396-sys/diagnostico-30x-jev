import type { Context, MiddlewareHandler } from "hono";
import type { Bindings } from "./app.ts";

// Una sola línea. 'unsafe-inline' en estilos solo porque html-to-image clona estilos en línea;
// los scripts siguen siendo solo 'self'. public/_headers repite esta cadena carácter por carácter.
export const CSP =
  "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";

const CABECERAS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  // Solo tiene efecto sobre HTTPS (producción); los navegadores la ignoran en http://127.0.0.1.
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

export const cabeceras: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  await next();
  // Las respuestas de ASSETS tienen cabeceras inmutables: se copia la respuesta.
  const copia = new Response(c.res.body, c.res);
  for (const [nombre, valor] of Object.entries(CABECERAS)) {
    copia.headers.set(nombre, valor);
  }
  c.res = copia;
};

export const limitarDiagnosticos: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  if (
    c.req.method === "POST" &&
    c.req.path.startsWith("/api/diagnosticos") &&
    c.env.LIMITE_ACTIVO !== "0"
  ) {
    const { success } = await c.env.LIMITE_DIAGNOSTICO.limit({
      key: c.req.header("CF-Connecting-IP") ?? "sin-ip",
    });
    if (!success) {
      return c.json(
        {
          error: {
            code: "LIMITE_EXCEDIDO",
            message:
              "Recibimos muchas solicitudes desde tu conexión. Espera un minuto y vuelve a intentarlo.",
          },
        },
        429,
      );
    }
  }
  await next();
  return undefined;
};

export function manejarError(err: Error, c: Context<{ Bindings: Bindings }>) {
  console.error(JSON.stringify({ evento: "error", ruta: c.req.path, tipo: err.name }));
  return c.json(
    { error: { code: "ERROR_INTERNO", message: "Algo salió mal. Intenta de nuevo." } },
    500,
  );
}

// Comparación en tiempo constante (no se detiene en la primera diferencia).
export function compararSeguro(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diferencia = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diferencia |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diferencia === 0;
}
