import { copiarEnlace, descargarImagen, enlacesCompartir } from "./compartir.ts";
import { api, el } from "./comun.ts";
import type { ResultadoPublico } from "./resultado-vista.ts";
import { renderResultado } from "./resultado-vista.ts";

async function iniciar(): Promise<void> {
  const raiz = document.getElementById("contenido");
  if (!raiz) {
    return;
  }
  const id = location.pathname.split("/").filter(Boolean).pop() ?? "";
  const r = await api<ResultadoPublico>(`/api/resultados/${id}`);
  raiz.replaceChildren();
  if (r.estado !== 200) {
    raiz.append(
      el("h1", {}, ["No encontramos este resultado"]),
      el("p", {}, [el("a", { class: "enlace", href: "/" }, ["Haz tu diagnóstico"])]),
    );
    return;
  }
  const token = sessionStorage.getItem(`diag:${id}`);
  const tarjeta = renderResultado(raiz, r.cuerpo, { token });
  if (!token) {
    raiz.append(el("a", { class: "boton boton--primario", href: "/" }, ["Haz tu diagnóstico"]));
  }
  const programa = r.cuerpo.programa_top;
  if (!programa) {
    return;
  }
  const url = `${location.origin}/r/${id}`;
  const enlaces = enlacesCompartir(url, programa.nombre);
  const aviso = el("p", { "aria-live": "polite", class: "suave" });
  const copiar = el("button", { type: "button", class: "boton boton--secundario" }, [
    "Copiar enlace",
  ]);
  copiar.addEventListener("click", async () => {
    aviso.textContent = await copiarEnlace(url);
  });
  const descargar = el("button", { type: "button", class: "boton boton--secundario" }, [
    "Descargar imagen",
  ]);
  descargar.addEventListener("click", async () => {
    try {
      await descargarImagen(tarjeta, programa.id);
    } catch {
      aviso.textContent = "No pudimos generar la imagen. Intenta de nuevo.";
    }
  });
  const externo = (href: string, texto: string) =>
    el("a", { class: "boton boton--secundario", href, target: "_blank", rel: "noopener" }, [texto]);
  raiz.append(
    el("section", { class: "pila" }, [
      el("h2", {}, ["Comparte tu ruta"]),
      el("div", { class: "fila" }, [
        externo(enlaces.linkedin, "LinkedIn"),
        externo(enlaces.x, "X"),
        externo(enlaces.whatsapp, "WhatsApp"),
        copiar,
        descargar,
      ]),
      aviso,
    ]),
  );
}

iniciar();
