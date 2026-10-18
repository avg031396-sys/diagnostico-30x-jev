import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Vite multipágina: cada HTML de la raíz es una entrada. La salida va a ./dist,
// el mismo directorio que wrangler.jsonc sirve como Static Assets.
const pagina = (nombre: string): string => fileURLToPath(new URL(`./${nombre}`, import.meta.url));

export default defineConfig({
  publicDir: "public",
  build: {
    outDir: "./dist",
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        index: pagina("index.html"),
        resultado: pagina("resultado.html"),
        qa: pagina("qa.html"),
        privacidad: pagina("privacidad.html"),
        leads: pagina("leads.html"),
        "404": pagina("404.html"),
      },
    },
  },
});
