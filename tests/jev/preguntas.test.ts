import { describe, expect, it } from "vitest";
import insumos from "../../src/data/insumos-jev.json" with { type: "json" };
import umbrales from "../../src/data/umbrales.json" with { type: "json" };
import { construirEstado, construirPreguntas } from "../../src/jev/preguntas.ts";
import type { Etapa } from "../../src/motor/catalogo.ts";
import { ETAPAS, FAMILIAS, PROGRAMAS } from "../../src/motor/catalogo.ts";

type Insumo = { id: string; tipo: string; opciones?: { id: string }[] };
const PREGUNTAS = insumos.preguntas_jev as unknown as Insumo[];
const CHOICE = PREGUNTAS.find((p) => p.tipo === "choice");
const IDS_OPCIONES = (CHOICE?.opciones ?? []).map((o) => o.id);
const ESPECIALES = ["requiere_revision", "no_aplica"];

describe("construirPreguntas", () => {
  it("devuelve una entrada por cada pregunta de los insumos, con clave igual al id", () => {
    const preguntas = construirPreguntas("founder");
    expect(Object.keys(preguntas)).toEqual(PREGUNTAS.map((p) => p.id));
    expect(Object.keys(preguntas)).toHaveLength(insumos.preguntas_jev.length);
  });

  it("no contiene la clave evidencia ni enlaces de YouTube", () => {
    const texto = JSON.stringify(construirPreguntas("founder"));
    expect(texto).not.toContain("evidencia");
    expect(texto).not.toContain("youtube.com");
  });

  it("da al Choice todas las opciones de los insumos, programas y las dos salidas especiales", () => {
    const choice = construirPreguntas("founder").programa_recomendado;
    expect(choice?.type).toBe("choice");
    if (choice?.type === "choice") {
      expect(Object.keys(choice.criteria)).toEqual(IDS_OPCIONES);
      expect(Object.keys(choice.criteria)).toHaveLength(PROGRAMAS.length + ESPECIALES.length);
    }
  });

  it("para un perfil corporativo deja solo Planes_Corporativos, Multipliers y requiere_revision", () => {
    const choice = construirPreguntas("corporativo").programa_recomendado;
    expect(choice?.type).toBe("choice");
    if (choice?.type === "choice") {
      expect(Object.keys(choice.criteria).sort()).toEqual(
        ["Multipliers", "Planes_Corporativos", "requiere_revision"].sort(),
      );
    }
  });
});

describe("construirEstado", () => {
  it("devuelve solo las claves permitidas y calcula etapa_nivel", () => {
    const entrada = {
      perfil: "founder" as const,
      etapa: "creciendo" as const,
      edad_hijo: 15,
      reto: "Texto de prueba para el reto principal del diagnóstico.",
      dolores_elegidos: ["Necesito inversión"],
      metas_elegidas: ["Levantar capital"],
      contacto: { nombre: "Ana", email: "ana@example.com", whatsapp: "+570000000000" },
      empresa: "Acme",
    };
    const estado = construirEstado(entrada);
    const permitidas = [
      "perfil",
      "etapa",
      "etapa_nivel",
      "edad_hijo",
      "reto_principal",
      "dolores_elegidos",
      "metas_elegidas",
    ];
    for (const clave of Object.keys(estado)) {
      expect(permitidas).toContain(clave);
    }
    expect(JSON.stringify(estado)).not.toContain("ana@example.com");
    expect(estado.etapa_nivel).toBe(3);
  });

  it("asigna etapa_nivel 0 a 4 en el orden idea, mvp, arrancando, creciendo, consolidada", () => {
    const orden: Etapa[] = ["idea", "mvp", "arrancando", "creciendo", "consolidada"];
    const niveles = orden.map((etapa) => {
      const estado = construirEstado({ perfil: "founder", etapa, reto: "x" });
      return estado.etapa_nivel;
    });
    expect(niveles).toEqual([0, 1, 2, 3, 4]);
    expect(ETAPAS.map((e) => e.nivel)).toEqual([0, 1, 2, 3, 4]);
  });

  it("omite las claves que no vienen", () => {
    const estado = construirEstado({ perfil: "padre_madre_next", edad_hijo: 16, reto: "x" });
    expect(Object.keys(estado).sort()).toEqual(["edad_hijo", "perfil", "reto_principal"]);
  });
});

describe("paridad entre el catálogo y los insumos", () => {
  it("tiene los mismos programas, en el orden de las opciones del Choice", () => {
    const esperados = IDS_OPCIONES.filter((id) => !ESPECIALES.includes(id));
    expect(PROGRAMAS.map((p) => p.id)).toEqual(esperados);
  });

  it("tiene las mismas familias con sus dolores y programas", () => {
    const esperadas = insumos.familias_dolor.map((f) => ({
      id: f.familia,
      dolores: f.se_activa_con,
      programas: f.programas,
    }));
    const actuales = FAMILIAS.map((f) => ({
      id: f.id,
      dolores: [...f.dolores],
      programas: [...f.programas],
    }));
    expect(actuales).toEqual(esperadas);
  });

  it("cada programa declara las familias que lo listan y trae una URL de 30x.com", () => {
    for (const programa of PROGRAMAS) {
      const familias = FAMILIAS.filter((f) =>
        (f.programas as readonly string[]).includes(programa.id),
      ).map((f) => f.id);
      expect([...programa.familias]).toEqual(familias);
      expect(programa.url.startsWith("https://30x.com/")).toBe(true);
    }
  });
});

describe("umbrales iniciales", () => {
  it("coinciden con los valores propuestos en los insumos", () => {
    expect(umbrales).toEqual({
      umbral_recomendar: 0.6,
      umbral_mostrar: 0.4,
      umbral_choice: 0.5,
      umbral_dolor: 0.6,
      umbral_vaga: 0.6,
      delta_hermanos: 0.15,
    });
  });
});
