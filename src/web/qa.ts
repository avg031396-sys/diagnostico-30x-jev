import { api, el } from "./comun.ts";

type Fila = {
  id: string;
  tipo: string;
  esperado: string | null;
  top1: string | null;
  top3: string[];
  acierto_top1: boolean;
  acierto_top3: boolean;
  confianza_choice: number | null;
  latencia_ms: number;
  costo_usd: number;
};
type Run = {
  modo: string;
  modelo: string;
  umbrales: Record<string, number>;
  total: number;
  evaluables: number;
  aciertos_top1: number;
  aciertos_top3: number;
  latencia_p50: number;
  latencia_p95: number;
  costo_total: number;
  detalle: Fila[];
};

const raiz = document.getElementById("contenido") as HTMLElement;
raiz.classList.add("ancho-qa");
const estado = el("p", { "aria-live": "polite", class: "suave" });
const resultado = el("div", { class: "pila" });

const si = (v: boolean) => (v ? "Sí" : "No");
const celda = (t: string) => el("td", {}, [t]);

function pintar(run: Run | null): void {
  resultado.replaceChildren();
  if (!run) {
    resultado.append(el("p", {}, ["Todavía no hay corridas guardadas"]));
    return;
  }
  resultado.append(
    el("p", {}, ["Meta de calibración: ≥ 90 % top-1 y 100 % top-3 sobre los casos evaluables"]),
    el("p", {}, [
      `Top-1: ${run.aciertos_top1}/${run.evaluables} · Top-3: ${run.aciertos_top3}/${run.evaluables} · Casos: ${run.total}`,
    ]),
    el("p", { class: "suave" }, [
      `Latencia p50 ${run.latencia_p50} ms · p95 ${run.latencia_p95} ms · Costo USD ${run.costo_total.toFixed(4)} · Modelo ${run.modelo} · Modo ${run.modo}`,
    ]),
    el("p", { class: "suave" }, [`Umbrales: ${JSON.stringify(run.umbrales)}`]),
  );
  const encabezados = [
    "Id",
    "Tipo",
    "Esperado",
    "N.º 1",
    "Top 3",
    "Top-1",
    "Top-3",
    "Confianza",
    "Latencia ms",
    "Costo USD",
  ];
  const tabla = el("table", { class: "lista-qa" }, [
    el("thead", {}, [
      el(
        "tr",
        {},
        encabezados.map((h) => el("th", {}, [h])),
      ),
    ]),
    el(
      "tbody",
      {},
      run.detalle.map((f) =>
        el("tr", {}, [
          celda(f.id),
          celda(f.tipo),
          celda(f.esperado ?? "—"),
          celda(f.top1 ?? "—"),
          celda(f.top3.join(", ")),
          celda(si(f.acierto_top1)),
          celda(si(f.acierto_top3)),
          celda(f.confianza_choice === null ? "—" : String(f.confianza_choice)),
          celda(String(f.latencia_ms)),
          celda(f.costo_usd.toFixed(4)),
        ]),
      ),
    ),
  ]);
  resultado.append(el("div", { class: "desplazable" }, [tabla]));
}

async function cargar(): Promise<void> {
  const r = await api<{ run: Run | null }>("/api/qa/ultima");
  pintar(r.cuerpo.run ?? null);
}

// El token vive solo en esta variable local: nunca en localStorage ni sessionStorage.
async function correr(token: string): Promise<void> {
  const headers = { Authorization: `Bearer ${token}` };
  const llamar = async (ruta: string, cuerpo: unknown) => {
    const r = await fetch(ruta, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    return {
      estado: r.status,
      cuerpo: (await r.json().catch(() => ({}))) as Record<string, unknown>,
    };
  };
  estado.textContent = "Corriendo los casos…";
  let runId: string | undefined;
  let total = 1;
  for (let lote = 0; lote < total; lote++) {
    const r = await llamar("/api/qa/lote", { lote, ...(runId ? { run_id: runId } : {}) });
    if (r.estado === 401) {
      estado.textContent = "Token inválido";
      return;
    }
    if (r.estado !== 200) {
      estado.textContent = "No pudimos correr los casos.";
      return;
    }
    runId = r.cuerpo.run_id as string;
    total = r.cuerpo.lotes_total as number;
    estado.textContent = `Lote ${lote + 1} de ${total}…`;
  }
  await llamar(`/api/qa/${runId}/cerrar`, {});
  estado.textContent = "Listo";
  await cargar();
}

const campoToken = el("input", { id: "token-qa", type: "password", autocomplete: "off" });
const boton = el("button", { type: "button", class: "boton boton--secundario" }, [
  "Correr de nuevo",
]);
boton.addEventListener("click", async () => {
  const token = campoToken.value;
  campoToken.value = "";
  boton.disabled = true;
  await correr(token);
  boton.disabled = false;
});

raiz.replaceChildren(
  el("h1", {}, ["QA de ", el("em", { class: "acento" }, ["JEV"])]),
  el("p", {}, [
    "Hoy en 30X el programa lo elige la persona en 2,325 de 2,325 caminos; la etapa nunca cambia el resultado.",
  ]),
  resultado,
  el("div", { class: "campo" }, [el("label", { for: "token-qa" }, ["Token de QA"]), campoToken]),
  boton,
  estado,
);
cargar();
