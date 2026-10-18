import { api, el } from "./comun.ts";

export type FilaPrograma = {
  id: string;
  nombre: string;
  url: string;
  fit: number;
  etiqueta: string | null;
  cumple_requisito: boolean;
  condicion_pendiente: string | null;
};

export type ResultadoPublico = {
  id: string;
  nombre_pila: string;
  tipo: "recomendado" | "preliminar" | "conversacion";
  programa_top: FilaPrograma | null;
  ranking: FilaPrograma[];
  cercanos: { id: string; nombre: string; url: string; fit: number; razon: string }[];
  motivo_top: string;
  familias: { id: string; nombre: string; valor: number }[];
  chips: string[];
};

const URL_PROGRAMAS = "https://30x.com/programas";
const porcentaje = (fit: number) => `${Math.round(fit * 100)}%`;

function barra(nombre: string, fit: number, leyenda?: string): HTMLElement {
  const relleno = el("span", { class: "barra__relleno" });
  relleno.style.setProperty("--ancho", porcentaje(fit));
  const nodos: Node[] = [
    el("span", {}, [nombre]),
    el("strong", {}, [porcentaje(fit)]),
    el("span", { class: "barra__pista" }, [relleno]),
  ];
  if (leyenda) {
    nodos.push(el("span", { class: "leyenda" }, [leyenda]));
  }
  return el("div", { class: "barra" }, nodos);
}

function botonAsesor(token: string, principal: boolean, estado: HTMLElement): HTMLElement {
  const boton = el(
    "button",
    { type: "button", class: `boton ${principal ? "boton--primario" : "boton--secundario"}` },
    ["Habla con un asesor de 30X"],
  );
  boton.addEventListener("click", async () => {
    boton.disabled = true;
    const r = await api(`/api/diagnosticos/${token}/asesor`, {});
    estado.textContent =
      r.estado === 204 ? "Listo, un asesor te contactará" : "No pudimos avisar. Intenta de nuevo.";
    if (r.estado !== 204) {
      boton.disabled = false;
    }
  });
  return boton;
}

export function renderResultado(
  contenedor: HTMLElement,
  r: ResultadoPublico,
  { token }: { token: string | null },
): HTMLElement {
  const top = r.programa_top;
  const estado = el("p", { "aria-live": "polite", class: "suave" });
  const asesor = (principal: boolean) => (token ? botonAsesor(token, principal, estado) : null);
  const tarjeta = el("section", { id: "tarjeta", class: "tarjeta pila" });

  if (r.tipo === "conversacion" || !top) {
    tarjeta.append(
      el("h1", {}, ["Hablemos: tu caso merece una conversación"]),
      el("p", {}, [
        "Tu reto es particular y una persona de 30X puede ayudarte mejor que un formulario.",
      ]),
    );
    const acciones = el("div", { class: "fila" }, [
      asesor(true) ??
        el("a", { class: "boton boton--primario", href: "/" }, ["Haz tu diagnóstico"]),
      el(
        "a",
        {
          class: "boton boton--secundario",
          href: URL_PROGRAMAS,
          target: "_blank",
          rel: "noopener",
        },
        ["Ver los programas de 30X"],
      ),
    ]);
    tarjeta.append(acciones, estado);
    contenedor.append(tarjeta);
    return tarjeta;
  }

  const preliminar = r.tipo === "preliminar";
  const conocer = el(
    "a",
    {
      class: `boton ${preliminar ? "boton--secundario" : "boton--primario"}`,
      href: top.url,
      target: "_blank",
      rel: "noopener",
    },
    [`Conocer ${top.nombre}`],
  );
  const botonAse = asesor(preliminar);
  tarjeta.append(
    el("h1", {}, [
      preliminar
        ? `Tu ruta preliminar: ${top.nombre}`
        : `${r.nombre_pila}, tu programa es ${top.nombre}`,
    ]),
    el("div", { class: "circulo", role: "img", "aria-label": `Afinidad ${porcentaje(top.fit)}` }, [
      porcentaje(top.fit),
      el("small", {}, [top.etiqueta ?? ""]),
    ]),
  );
  if (preliminar) {
    tarjeta.append(el("p", {}, ["Un asesor de 30X confirma tu ruta"]));
  }
  if (r.chips.length > 0) {
    tarjeta.append(
      el("p", {}, ["Te lo recomendamos porque mencionaste:"]),
      el(
        "div",
        { class: "fila" },
        r.chips.map((c) => el("span", { class: "chip" }, [c])),
      ),
    );
  }
  tarjeta.append(
    el(
      "div",
      { class: "fila" },
      (preliminar ? [botonAse, conocer] : [conocer, botonAse]).filter(
        (n): n is HTMLElement => n !== null,
      ),
    ),
    estado,
  );
  contenedor.append(tarjeta);

  if (r.cercanos.length > 0) {
    contenedor.append(
      el("section", { class: "pila" }, [
        el("h2", {}, ["Rutas casi igual de fuertes (a 10 puntos o menos)"]),
        el("p", {}, [r.motivo_top]),
        ...r.cercanos.map((f) => barra(f.nombre, f.fit, f.razon)),
      ]),
    );
  }
  const cercanosIds = new Set(r.cercanos.map((c) => c.id));
  const otros = r.ranking.filter((f) => !cercanosIds.has(f.id));
  if (otros.length > 0) {
    contenedor.append(
      el("section", { class: "pila" }, [
        el("h2", {}, ["Otras rutas que podrían servirte"]),
        ...otros.map((f) =>
          barra(
            f.nombre,
            f.fit,
            f.cumple_requisito
              ? undefined
              : `tu reto coincide, pero aún no cumples: ${f.condicion_pendiente ?? ""}`,
          ),
        ),
      ]),
    );
  }
  contenedor.append(
    el("section", { class: "pila" }, [
      el("h2", {}, ["Qué tanto pesa cada tema en tu reto"]),
      ...r.familias.map((f) => barra(f.nombre, f.valor)),
    ]),
  );
  return tarjeta;
}
