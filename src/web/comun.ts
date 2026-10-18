import "@fontsource-variable/inter";
import "@fontsource-variable/inter-tight";
import "@fontsource/instrument-serif/400-italic.css";
import "./estilos.css";

type Atributo = string | boolean | undefined | ((evento: Event) => void);
type Hijo = Node | string;

// Crea un elemento. Los atributos `on<evento>` con función se enganchan con addEventListener.
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, Atributo> = {},
  hijos: Hijo[] = [],
): HTMLElementTagNameMap[K] {
  const nodo = document.createElement(tag);
  for (const [clave, valor] of Object.entries(attrs)) {
    if (typeof valor === "function") {
      nodo.addEventListener(clave.replace(/^on/, ""), valor);
    } else if (valor === true) {
      nodo.setAttribute(clave, "");
    } else if (valor !== false && valor !== undefined) {
      nodo.setAttribute(clave, valor);
    }
  }
  nodo.append(...hijos);
  return nodo;
}

export type RespuestaApi<T = Record<string, unknown>> = { estado: number; cuerpo: T };

// fetch JSON a la misma origen. Nunca lanza: un fallo de red devuelve estado 0.
export async function api<T extends object = object>(
  ruta: string,
  cuerpo?: unknown,
): Promise<RespuestaApi<T>> {
  try {
    const respuesta = await fetch(ruta, {
      method: cuerpo === undefined ? "GET" : "POST",
      headers: cuerpo === undefined ? undefined : { "Content-Type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, cuerpo: (texto ? JSON.parse(texto) : {}) as T };
  } catch {
    return { estado: 0, cuerpo: {} as T };
  }
}

export function medidor(actual: number, total: number): void {
  const barra = document.getElementById("medidor");
  const texto = document.getElementById("medidor-texto");
  const caja = document.getElementById("medidor-caja");
  if (!barra || !texto || !caja) {
    return;
  }
  caja.hidden = actual < 1;
  barra.setAttribute("aria-valuenow", String(actual));
  barra.setAttribute("aria-valuemax", String(total));
  barra.style.setProperty("--avance", `${(actual / total) * 100}%`);
  texto.textContent = `Paso ${actual} de ${total}`;
}

// Cambia la pantalla: opacidad + 8 px en 200 ms (0 ms con movimiento reducido).
export function transicion(contenedor: HTMLElement, render: () => void): void {
  contenedor.classList.remove("paso--visible");
  contenedor.replaceChildren();
  render();
  requestAnimationFrame(() => contenedor.classList.add("paso--visible"));
}

export function anunciar(texto: string): void {
  let region = document.getElementById("anuncio");
  if (!region) {
    region = el("div", { id: "anuncio", "aria-live": "polite", class: "solo-lector" });
    document.body.append(region);
  }
  region.textContent = texto;
}

// Pantalla de error amable con el botón de asesor (si hay token).
export function pantallaError(contenedor: HTMLElement, token: string | null, titulo: string): void {
  const estado = el("p", { "aria-live": "polite", class: "suave" });
  transicion(contenedor, () => {
    const hijos: Node[] = [
      el("h2", {}, [titulo]),
      el("p", {}, [
        "Puedes hablar con una persona del equipo y ella te ayuda a encontrar tu ruta.",
      ]),
    ];
    if (token) {
      const boton = el("button", { type: "button", class: "boton boton--primario" }, [
        "Habla con un asesor de 30X",
      ]);
      boton.addEventListener("click", async () => {
        boton.disabled = true;
        const r = await api(`/api/diagnosticos/${token}/asesor`, {});
        estado.textContent =
          r.estado === 204
            ? "Listo, un asesor te contactará"
            : "No pudimos avisar. Intenta de nuevo.";
        if (r.estado !== 204) {
          boton.disabled = false;
        }
      });
      hijos.push(boton);
    }
    hijos.push(estado);
    contenedor.append(el("div", { class: "pila" }, hijos));
  });
}
