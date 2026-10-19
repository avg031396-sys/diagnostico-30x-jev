import { el, medidor, transicion } from "./comun.ts";

export type Contacto = { nombre: string; email: string; whatsapp: string; empresa: string };

export function campo(id: string, etiqueta: string, tipo: string, valor: string) {
  const error = el("span", { class: "campo__error", id: `${id}-error` });
  const input = el("input", {
    id,
    name: id,
    type: tipo,
    value: valor,
    "aria-describedby": `${id}-error`,
    autocomplete: tipo === "email" ? "email" : tipo === "tel" ? "tel" : "off",
  });
  return {
    input,
    error,
    nodo: el("div", { class: "campo" }, [el("label", { for: id }, [etiqueta]), input, error]),
  };
}

export function pasoContacto(
  contenedor: HTMLElement,
  inicial: Contacto,
  alEnviar: (contacto: Contacto) => void,
): void {
  medidor(0, 5);
  transicion(contenedor, () => {
    const nombre = campo("nombre", "Nombre", "text", inicial.nombre);
    const email = campo("email", "Correo", "email", inicial.email);
    const whatsapp = campo("whatsapp", "WhatsApp", "tel", inicial.whatsapp);
    const empresa = campo("empresa", "Empresa (opcional)", "text", inicial.empresa);
    const acepto = el("input", {
      type: "checkbox",
      id: "consentimiento",
      "aria-describedby": "consentimiento-error",
    });
    const errorAcepto = el("span", { class: "campo__error", id: "consentimiento-error" });
    const form = el("form", { novalidate: true, class: "pila" }, [
      el("h1", {}, ["Diagnóstico 30X con ", el("em", { class: "acento" }, ["JEV"])]),
      el("p", {}, ["Cuéntanos tu reto con tus palabras y JEV decide el programa de 30X más afín."]),
      el("h2", {}, ["Antes de empezar"]),
      nombre.nodo,
      email.nodo,
      whatsapp.nodo,
      empresa.nodo,
      el("div", { class: "consentimiento" }, [
        acepto,
        el("label", { for: "consentimiento" }, [
          "Acepto que guarden mis datos para recibir mi diagnóstico (lee el ",
          el(
            "a",
            { href: "/privacidad.html", class: "enlace", target: "_blank", rel: "noopener" },
            ["aviso de privacidad"],
          ),
          ")",
        ]),
      ]),
      errorAcepto,
      el("button", { type: "submit", class: "boton boton--primario" }, ["Empezar"]),
    ]);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const n = nombre.input.value.trim();
      const c = email.input.value.trim();
      const w = whatsapp.input.value.trim();
      nombre.error.textContent = n.length >= 2 ? "" : "Escribe tu nombre.";
      email.error.textContent = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)
        ? ""
        : "Escribe un correo válido.";
      whatsapp.error.textContent = /^\+?[0-9 ()-]{7,20}$/.test(w)
        ? ""
        : "Escribe un WhatsApp válido, solo números.";
      errorAcepto.textContent = acepto.checked ? "" : "Necesitamos tu autorización para continuar.";
      if (
        nombre.error.textContent ||
        email.error.textContent ||
        whatsapp.error.textContent ||
        errorAcepto.textContent
      ) {
        return;
      }
      alEnviar({ nombre: n, email: c, whatsapp: w, empresa: empresa.input.value.trim() });
    });
    contenedor.append(form);
  });
}
