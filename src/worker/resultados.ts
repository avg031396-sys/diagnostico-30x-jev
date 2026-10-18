import type { Context } from "hono";
import { Hono } from "hono";
import type { Bindings } from "./app.ts";
import { REGEX_RESULTADO } from "./esquemas.ts";
import { resultadoPublico } from "./flujo.ts";
import { obtenerResultado } from "./repositorio.ts";

export const resultados = new Hono<{ Bindings: Bindings }>();

const noEncontrado = { code: "NO_ENCONTRADO", message: "No encontramos lo que buscas." };

resultados.get("/:id", async (c) => {
  const id = c.req.param("id");
  const fila = REGEX_RESULTADO.test(id) ? await obtenerResultado(c.env.DB, id) : null;
  if (!fila) {
    return c.json({ error: noEncontrado }, 404);
  }
  return c.json({
    id: fila.id,
    nombre_pila: fila.nombre_pila,
    ...resultadoPublico(fila),
    created_at: fila.created_at,
  });
});

const escapar = (valor: string) =>
  valor.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function paginaResultado(c: Context<{ Bindings: Bindings }>) {
  const id = c.req.param("id") ?? "";
  const fila = REGEX_RESULTADO.test(id) ? await obtenerResultado(c.env.DB, id) : null;
  if (!fila) {
    const pagina = await c.env.ASSETS.fetch(new URL("/404", c.req.url));
    return new Response(pagina.body, { status: 404, headers: pagina.headers });
  }
  const publico = resultadoPublico(fila);
  const origen = new URL(c.req.url).origin;
  const top = publico.programa_top;
  const titulo = top ? `Mi ruta en 30X: ${top.nombre}` : "Hablemos de tu caso en 30X";
  const descripcion = `Diagnóstico 30X con JEV · ${top?.etiqueta ?? "ruta preliminar"}`;
  const imagen = `${origen}/og/${top ? top.id : "default"}.png`;
  const metas = [
    ["og:title", titulo],
    ["og:description", descripcion],
    ["og:image", imagen],
    ["og:url", `${origen}/r/${id}`],
    ["og:type", "website"],
    ["twitter:card", "summary_large_image"],
  ]
    // Open Graph usa `property`; las tarjetas de X/Twitter usan `name`.
    .map(([k = "", v = ""]) => {
      const atributo = k.startsWith("twitter:") ? "name" : "property";
      return `<meta ${atributo}="${k}" content="${escapar(v)}">`;
    })
    .join("");
  const base = await c.env.ASSETS.fetch(new URL("/resultado", c.req.url));
  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(titulo);
      },
    })
    .on("head", {
      element(el) {
        el.append(metas, { html: true });
      },
    })
    .transform(base);
}
