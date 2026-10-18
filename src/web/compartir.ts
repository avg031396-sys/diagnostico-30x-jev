import { toPng } from "html-to-image";

export function enlacesCompartir(url: string, programa: string) {
  const texto = `Mi ruta en 30X es ${programa}. Haz tu diagnóstico:`;
  return {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`,
  };
}

export async function copiarEnlace(url: string): Promise<string> {
  try {
    await navigator.clipboard.writeText(url);
    return "Enlace copiado";
  } catch {
    return "No pudimos copiar el enlace. Cópialo de la barra del navegador.";
  }
}

export async function descargarImagen(nodo: HTMLElement, programa: string): Promise<void> {
  const datos = await toPng(nodo, { backgroundColor: "#000000", pixelRatio: 2 });
  const a = document.createElement("a");
  a.href = datos;
  a.download = `diagnostico-30x-${programa}.png`;
  a.click();
}
