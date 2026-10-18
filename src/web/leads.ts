import { el } from "./comun.ts";

type Lead = {
  created_at: string;
  nombre: string;
  email: string;
  whatsapp: string;
  empresa: string | null;
  perfil: string;
  etapa: string | null;
  estado: string;
  programa_top: string | null;
  fit_top: number | null;
  quiere_asesor: number;
  calificacion: "caliente" | "tibio" | "frio";
};

const ETIQUETA = { caliente: "Caliente", tibio: "Tibio", frio: "Frío" } as const;

const raiz = document.getElementById("contenido") as HTMLElement;
raiz.classList.add("ancho-qa");
const form = document.getElementById("form-leads") as HTMLFormElement;
const estado = document.getElementById("leads-estado") as HTMLElement;
const tabla = document.getElementById("leads-tabla") as HTMLElement;

const celda = (t: string) => el("td", {}, [t]);

function pintar(leads: Lead[]): void {
  const resumen = (c: Lead["calificacion"]) => leads.filter((l) => l.calificacion === c).length;
  estado.textContent = `${leads.length} leads · ${resumen("caliente")} calientes · ${resumen("tibio")} tibios · ${resumen("frio")} fríos`;
  const encabezados = [
    "Calificación",
    "Fecha",
    "Nombre",
    "Correo",
    "WhatsApp",
    "Empresa",
    "Perfil",
    "Etapa",
    "Programa n.º 1",
    "Afinidad",
    "Pidió asesor",
  ];
  tabla.replaceChildren(
    el("div", { class: "desplazable" }, [
      el("table", { class: "lista-qa" }, [
        el("thead", {}, [
          el(
            "tr",
            {},
            encabezados.map((h) => el("th", { scope: "col" }, [h])),
          ),
        ]),
        el(
          "tbody",
          {},
          leads.map((l) =>
            el("tr", {}, [
              celda(ETIQUETA[l.calificacion]),
              celda(l.created_at.slice(0, 16).replace("T", " ")),
              celda(l.nombre),
              celda(l.email),
              celda(l.whatsapp),
              celda(l.empresa ?? ""),
              celda(l.perfil),
              celda(l.etapa ?? ""),
              celda(l.programa_top ?? ""),
              celda(l.fit_top === null ? "" : `${Math.round(l.fit_top * 100)} %`),
              celda(l.quiere_asesor === 1 ? "Sí" : "No"),
            ]),
          ),
        ),
      ]),
    ]),
  );
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const token = String(new FormData(form).get("token") ?? "");
  tabla.replaceChildren();
  try {
    const r = await fetch("/api/leads", { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 401) {
      estado.textContent = "Token inválido.";
      return;
    }
    if (!r.ok) {
      estado.textContent = "No pudimos cargar los leads. Intenta de nuevo.";
      return;
    }
    pintar(((await r.json()) as { leads: Lead[] }).leads);
  } catch {
    estado.textContent = "No pudimos cargar los leads. Intenta de nuevo.";
  }
});
