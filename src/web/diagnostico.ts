import { ETAPAS, PERFILES } from "../motor/catalogo.ts";
import { anunciar, api, el, medidor, pantallaError, transicion } from "./comun.ts";
import type { RespuestaCreacion } from "./confirmacion.ts";
import { mostrarConfirmacion } from "./confirmacion.ts";
import type { Contacto } from "./contacto.ts";
import { campo, pasoContacto } from "./contacto.ts";

type Estado = {
  contacto: Contacto;
  perfil: string;
  etapa: string;
  edad_hijo: number | null;
  reto: string;
};

const estado: Estado = {
  contacto: { nombre: "", email: "", whatsapp: "", empresa: "" },
  perfil: "",
  etapa: "",
  edad_hijo: null,
  reto: "",
};

const EJEMPLOS = [
  "Vendo por referidos y no tengo un proceso comercial ordenado. Quiero duplicar mis ventas este año.",
  "Mi operación es un caos: apago incendios todo el día y todo depende de mí. Quiero que el negocio funcione sin mí.",
  "Quiero que mi equipo adopte inteligencia artificial y no sé por dónde empezar ni cómo medirlo.",
];

function pasoPerfil(contenedor: HTMLElement): void {
  medidor(1, 5);
  transicion(contenedor, () => {
    contenedor.append(
      el("h1", {}, ["Diagnóstico 30X con ", el("em", { class: "acento" }, ["JEV"])]),
      el("p", {}, ["Cuéntanos tu reto con tus palabras y JEV decide el programa de 30X más afín."]),
      el("h2", {}, ["¿Cuál es tu punto de partida?"]),
      el(
        "div",
        { class: "pila" },
        PERFILES.map((p) =>
          el(
            "button",
            {
              type: "button",
              class: "opcion",
              onclick: () => {
                estado.perfil = p.id;
                estado.etapa = "";
                estado.edad_hijo = null;
                pasoEtapa(contenedor);
              },
            },
            [p.etiqueta],
          ),
        ),
      ),
    );
  });
}

function pasoEtapa(contenedor: HTMLElement): void {
  medidor(2, 5);
  transicion(contenedor, () => {
    if (estado.perfil === "padre_madre_next") {
      const edad = campo("edad", "Edad de tu hijo/a", "number", "");
      edad.input.setAttribute("min", "10");
      edad.input.setAttribute("max", "25");
      const siguiente = el("button", { type: "button", class: "boton boton--primario" }, [
        "Continuar",
      ]);
      siguiente.addEventListener("click", () => {
        const n = Number(edad.input.value);
        if (!Number.isInteger(n) || n < 10 || n > 25) {
          edad.error.textContent = "Escribe una edad entre 10 y 25.";
          return;
        }
        estado.edad_hijo = n;
        pasoReto(contenedor);
      });
      contenedor.append(
        el("div", { class: "pila" }, [
          el("h2", {}, ["¿Qué edad tiene tu hijo/a?"]),
          edad.nodo,
          siguiente,
        ]),
      );
      return;
    }
    contenedor.append(
      el("h2", {}, ["¿En qué etapa está tu negocio?"]),
      el(
        "div",
        { class: "pila" },
        ETAPAS.map((e) =>
          el(
            "button",
            {
              type: "button",
              class: "opcion",
              onclick: () => {
                estado.etapa = e.id;
                pasoReto(contenedor);
              },
            },
            [e.etiqueta],
          ),
        ),
      ),
    );
  });
}

function pasoReto(contenedor: HTMLElement): void {
  medidor(3, 5);
  transicion(contenedor, () => {
    const area = el("textarea", {
      id: "reto",
      name: "reto",
      maxlength: "1200",
      "aria-describedby": "reto-contador",
    });
    area.value = estado.reto;
    const contador = el("span", { id: "reto-contador", class: "suave" });
    const enviar = el(
      "button",
      { type: "button", class: "boton boton--primario", disabled: true },
      ["Continuar"],
    );
    const actualizar = () => {
      const n = area.value.length;
      contador.textContent = `${n}/1200`;
      enviar.disabled = area.value.trim().length < 40;
    };
    area.addEventListener("input", actualizar);
    enviar.addEventListener("click", () => {
      estado.reto = area.value.trim();
      pasoContacto(contenedor, estado.contacto, (contacto) => {
        estado.contacto = contacto;
        enviarReto(contenedor);
      });
    });
    contenedor.append(
      el("div", { class: "pila" }, [
        el("h2", {}, ["¿Qué te está frenando hoy y qué quieres lograr en 12 meses?"]),
        el("div", { class: "campo" }, [
          el("label", { for: "reto" }, ["Tu reto, con tus palabras (mínimo 40 caracteres)"]),
          area,
          contador,
        ]),
        el("p", { class: "suave" }, ["O toca un ejemplo:"]),
        ...EJEMPLOS.map((texto) =>
          el(
            "button",
            {
              type: "button",
              class: "opcion",
              onclick: () => {
                area.value = texto;
                actualizar();
                area.focus();
              },
            },
            [texto],
          ),
        ),
        enviar,
      ]),
    );
    actualizar();
  });
}

async function enviarReto(contenedor: HTMLElement): Promise<void> {
  transicion(contenedor, () => {
    contenedor.append(el("h2", {}, ["JEV está leyendo tu reto…"]));
  });
  anunciar("JEV está leyendo tu reto…");
  const { nombre, email, whatsapp, empresa } = estado.contacto;
  const cuerpo: Record<string, unknown> = {
    contacto: { nombre, email, whatsapp, ...(empresa ? { empresa } : {}) },
    consentimiento: true,
    perfil: estado.perfil,
    reto: estado.reto,
  };
  if (estado.perfil === "padre_madre_next") {
    cuerpo.edad_hijo = estado.edad_hijo;
  } else {
    cuerpo.etapa = estado.etapa;
  }
  const r = await api<RespuestaCreacion & { token?: string; error?: { message: string } }>(
    "/api/diagnosticos",
    cuerpo,
  );
  if (r.estado === 201) {
    mostrarConfirmacion(contenedor, r.cuerpo, alTerminar);
  } else if (r.estado === 502) {
    pantallaError(contenedor, r.cuerpo.token ?? null, "Tuvimos un problema al analizar tu reto");
  } else if (r.estado === 429) {
    pantallaError(
      contenedor,
      null,
      r.cuerpo.error?.message ?? "Espera un minuto y vuelve a intentarlo.",
    );
  } else {
    pantallaError(contenedor, null, "Revisa los datos del formulario");
  }
}

function alTerminar(id: string, token: string): void {
  // El token queda solo en esta pestaña: es lo que habilita el botón de asesor en /r/<id>.
  sessionStorage.setItem(`diag:${id}`, token);
  location.assign(`/r/${id}`);
}

export function iniciar(): void {
  const raiz = document.getElementById("contenido");
  if (!raiz) {
    return;
  }
  const paso = el("div", { id: "paso", class: "paso" });
  raiz.replaceChildren(
    el("div", { id: "medidor-caja", class: "medidor-caja", hidden: true }, [
      el(
        "div",
        {
          id: "medidor",
          class: "medidor",
          role: "progressbar",
          "aria-valuemin": "0",
          "aria-valuenow": "0",
          "aria-valuemax": "5",
          "aria-label": "Avance",
        },
        [el("span", { class: "medidor__barra" })],
      ),
      el("p", { id: "medidor-texto", class: "suave" }),
    ]),
    paso,
  );
  pasoPerfil(paso);
}

iniciar();
