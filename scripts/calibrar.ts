import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import insumos from "../src/data/insumos-jev.json" with { type: "json" };
import umbralesActuales from "../src/data/umbrales.json" with { type: "json" };
import type { Umbrales } from "../src/motor/tipos.ts";
import type { FilaCalibracion } from "../src/qa/calibrar.ts";
import { calibrar, porcentaje } from "../src/qa/calibrar.ts";
import type { CasoPrueba, FilaQa } from "../src/qa/evaluar.ts";

// Recalibra src/data/umbrales.json con una corrida guardada de /api/qa/ultima. Sin red.
// Uso: npm run calibrar -- <export-de-qa.json> [--escribir]

const RUTA_UMBRALES = "src/data/umbrales.json";
const CASOS = insumos.casos_prueba as unknown as CasoPrueba[];

export type OpcionesCalibrar = {
  args: string[];
  leer?: (ruta: string) => string | null;
  escribir?: (ruta: string, contenido: string) => void;
  imprimir?: (texto: string) => void;
  base?: Umbrales;
};

type Corrida = { modo?: string; modelo?: string; detalle?: FilaQa[] };

function leerArchivo(ruta: string): string | null {
  return existsSync(ruta) ? readFileSync(ruta, "utf8") : null;
}

function linea(etiqueta: string, f: FilaCalibracion): string {
  const c = f.combinacion;
  const pct = (n: number) => `${Math.round(n)}%`;
  return [
    etiqueta.padEnd(8),
    c.umbral_recomendar.toFixed(2).padStart(10),
    c.umbral_mostrar.toFixed(2).padStart(8),
    c.umbral_choice.toFixed(2).padStart(8),
    `${f.calibracion.top1}/${f.calibracion.evaluables} (${pct(porcentaje(f.calibracion, "top1"))})`.padStart(
      14,
    ),
    `${f.calibracion.top3}/${f.calibracion.evaluables}`.padStart(8),
    `${f.validacion.top1}/${f.validacion.evaluables} (${pct(porcentaje(f.validacion, "top1"))})`.padStart(
      14,
    ),
    `${f.validacion.top3}/${f.validacion.evaluables}`.padStart(8),
  ].join(" ");
}

export function ejecutar({
  args,
  leer = leerArchivo,
  escribir = (ruta, contenido) => writeFileSync(ruta, contenido),
  imprimir = console.log,
  base = umbralesActuales as Umbrales,
}: OpcionesCalibrar): number {
  const ruta = args.find((a) => !a.startsWith("--"));
  const debeEscribir = args.includes("--escribir");
  if (!ruta) {
    imprimir("Uso: npm run calibrar -- <export-de-qa.json> [--escribir]");
    return 2;
  }
  const texto = leer(ruta);
  if (texto === null) {
    imprimir(`No existe el archivo ${ruta}`);
    return 3;
  }
  let corrida: Corrida;
  try {
    const json = JSON.parse(texto) as { run?: Corrida } & Corrida;
    corrida = json.run ?? json;
  } catch {
    imprimir("El archivo no es JSON válido.");
    return 3;
  }
  if (!Array.isArray(corrida.detalle) || corrida.detalle.length === 0) {
    imprimir("La corrida no trae detalle por caso. Exporta /api/qa/ultima de una corrida cerrada.");
    return 3;
  }
  const reporte = calibrar(corrida.detalle, CASOS, base);
  imprimir(`Corrida: modo ${corrida.modo ?? "?"}, modelo ${corrida.modelo ?? "?"}`);
  imprimir(
    `${"".padEnd(8)} ${"recomendar".padStart(10)} ${"mostrar".padStart(8)} ${"choice".padStart(8)} ${"calib top1".padStart(14)} ${"top3".padStart(8)} ${"valid top1".padStart(14)} ${"top3".padStart(8)}`,
  );
  imprimir(linea("actual", reporte.actual));
  reporte.filas.slice(0, 10).forEach((f, i) => {
    imprimir(linea(`#${i + 1}`, f));
  });
  imprimir(linea("elegida", reporte.mejor));
  if (reporte.mejor === reporte.actual) {
    imprimir("Ninguna combinación mejora a los umbrales actuales. No hay nada que escribir.");
    return 0;
  }
  if (reporte.sobreajuste) {
    imprimir(
      "Sobreajuste: la validación cae más de 10 puntos frente a la calibración. No se escribe.",
    );
    return 4;
  }
  if (!debeEscribir) {
    imprimir("Prueba en seco. Agrega --escribir para guardar en src/data/umbrales.json.");
    return 0;
  }
  if (corrida.modo === "mock") {
    imprimir("La corrida es del modo mock: calibrar con ella no significa nada. No se escribe.");
    return 5;
  }
  const nuevos: Umbrales = { ...base, ...reporte.mejor.combinacion };
  escribir(RUTA_UMBRALES, `${JSON.stringify(nuevos, null, 2)}\n`);
  imprimir(`Escrito ${RUTA_UMBRALES}. Corre la compuerta y vuelve a correr QA en /qa.html.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = ejecutar({ args: process.argv.slice(2) });
}
