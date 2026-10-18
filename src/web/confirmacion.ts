import { DOLORES_ACLARACION, DOLORES_CHIP, METAS } from "../motor/catalogo.ts";
import { anunciar, api, el, medidor, pantallaError, transicion } from "./comun.ts";

type Dolor = { id: string; etiqueta: string; valor: number };
type Pregunta = {
  id: string;
  texto: string;
  solo_si?: Record<string, string>;
  opciones: { id: string; etiqueta: string }[];
};
export type RespuestaCreacion = {
  token: string;
  dolores_detectados: Dolor[];
  necesita_aclaracion: boolean;
};

type Finalizado = { pendiente: boolean; seguimientos?: Pregunta[]; resultado_id?: string };

const ETIQUETA = new Map<string, string>(DOLORES_CHIP.map((d) => [d.id, d.etiqueta]));
const TITULO_ERROR = "Tuvimos un problema al analizar tu reto";

async function finalizar(
  contenedor: HTMLElement,
  token: string,
  dolores: string[],
  alTerminar: (id: string, token: string) => void,
  respuestas?: Record<string, string>,
): Promise<void> {
  const cuerpo: Record<string, unknown> = { dolores_confirmados: dolores };
  if (respuestas) {
    cuerpo.respuestas_seguimiento = respuestas;
  }
  const r = await api<Finalizado>(`/api/diagnosticos/${token}/finalizar`, cuerpo);
  if (r.estado !== 200) {
    pantallaError(contenedor, token, TITULO_ERROR);
    return;
  }
  if (!r.cuerpo.pendiente && r.cuerpo.resultado_id) {
    alTerminar(r.cuerpo.resultado_id, token);
    return;
  }
  medidor(5, 5);
  preguntar(contenedor, r.cuerpo.seguimientos ?? [], {}, token, dolores, alTerminar);
}

// Una pregunta por pantalla; las que tienen `solo_si` aparecen solo si la respuesta previa coincide.
function preguntar(
  contenedor: HTMLElement,
  preguntas: Pregunta[],
  respuestas: Record<string, string>,
  token: string,
  dolores: string[],
  alTerminar: (id: string, token: string) => void,
): void {
  const siguiente = preguntas.find(
    (p) =>
      respuestas[p.id] === undefined &&
      Object.entries(p.solo_si ?? {}).every(([k, v]) => respuestas[k] === v),
  );
  if (!siguiente) {
    finalizar(contenedor, token, dolores, alTerminar, respuestas);
    return;
  }
  transicion(contenedor, () => {
    const opciones = siguiente.opciones.map((o) =>
      el(
        "button",
        {
          type: "button",
          class: "opcion",
          onclick: () => {
            respuestas[siguiente.id] = o.id;
            preguntar(contenedor, preguntas, respuestas, token, dolores, alTerminar);
          },
        },
        [o.etiqueta],
      ),
    );
    contenedor.append(el("h2", {}, [siguiente.texto]), el("div", { class: "pila" }, opciones));
  });
}

function pantallaChips(
  contenedor: HTMLElement,
  token: string,
  detectados: Dolor[],
  alTerminar: (id: string, token: string) => void,
): void {
  const elegidos = new Set(detectados.map((d) => d.id));
  let desplegado = false;
  const pintar = () =>
    transicion(contenedor, () => {
      const chips = [...elegidos].map((id) =>
        el("span", { class: "chip" }, [
          ETIQUETA.get(id) ?? id,
          el(
            "button",
            {
              type: "button",
              class: "chip__quitar",
              "aria-label": `Quitar ${ETIQUETA.get(id) ?? id}`,
              onclick: () => {
                elegidos.delete(id);
                pintar();
              },
            },
            ["×"],
          ),
        ]),
      );
      const faltantes = DOLORES_CHIP.filter((d) => !elegidos.has(d.id));
      const mas = desplegado
        ? faltantes.map((d) =>
            el(
              "button",
              {
                type: "button",
                class: "chip chip--sumar",
                onclick: () => {
                  elegidos.add(d.id);
                  pintar();
                },
              },
              [d.etiqueta],
            ),
          )
        : [];
      contenedor.append(
        el("h2", {}, ["Esto entendí de tu reto"]),
        el("p", { class: "suave" }, ["Quita lo que no te represente o suma lo que falte."]),
        el("div", { class: "fila" }, chips),
        el(
          "button",
          {
            type: "button",
            class: "chip chip--sumar",
            "aria-expanded": String(desplegado),
            onclick: () => {
              desplegado = !desplegado;
              pintar();
            },
          },
          ["+ agregar"],
        ),
        el("div", { class: "fila" }, mas),
        el(
          "button",
          {
            type: "button",
            class: "boton boton--primario",
            onclick: () => finalizar(contenedor, token, [...elegidos], alTerminar),
          },
          ["Confirmar"],
        ),
      );
    });
  pintar();
}

function pantallaAclaracion(
  contenedor: HTMLElement,
  token: string,
  alTerminar: (id: string, token: string) => void,
): void {
  const dolores = new Set<string>();
  const metas = new Set<string>();
  const interruptor = (conjunto: Set<string>, id: string, etiqueta: string, boton: HTMLElement) =>
    el(
      "button",
      {
        type: "button",
        class: "opcion",
        "aria-pressed": "false",
        onclick: (e) => {
          const b = e.currentTarget as HTMLButtonElement;
          const activo = !conjunto.has(id);
          conjunto[activo ? "add" : "delete"](id);
          b.setAttribute("aria-pressed", String(activo));
          boton.toggleAttribute("disabled", dolores.size === 0);
        },
      },
      [etiqueta],
    );
  transicion(contenedor, () => {
    const continuar = el(
      "button",
      { type: "button", class: "boton boton--primario", disabled: true },
      ["Continuar"],
    );
    continuar.addEventListener("click", async () => {
      continuar.disabled = true;
      anunciar("JEV está leyendo tus respuestas…");
      const r = await api<{ dolores_detectados: Dolor[] }>(`/api/diagnosticos/${token}/aclarar`, {
        dolores: [...dolores],
        metas: [...metas],
      });
      if (r.estado !== 200) {
        pantallaError(contenedor, token, TITULO_ERROR);
        return;
      }
      const ids = r.cuerpo.dolores_detectados.map((d) => d.id);
      await finalizar(contenedor, token, ids, alTerminar);
    });
    contenedor.append(
      el("h2", {}, ["Ayúdanos a entenderte mejor"]),
      el("h3", {}, ["¿Qué te duele hoy?"]),
      el(
        "div",
        { class: "pila" },
        DOLORES_ACLARACION.map((d) => interruptor(dolores, d.familia, d.etiqueta, continuar)),
      ),
      el("h3", {}, ["¿Qué quieres lograr en 12 meses?"]),
      el(
        "div",
        { class: "pila" },
        METAS.map((m) => interruptor(metas, m.id, m.etiqueta, continuar)),
      ),
      continuar,
    );
  });
}

export function mostrarConfirmacion(
  contenedor: HTMLElement,
  respuesta: RespuestaCreacion,
  alTerminar: (id: string, token: string) => void,
): void {
  medidor(4, 5);
  if (respuesta.necesita_aclaracion) {
    pantallaAclaracion(contenedor, respuesta.token, alTerminar);
  } else {
    pantallaChips(contenedor, respuesta.token, respuesta.dolores_detectados, alTerminar);
  }
}
