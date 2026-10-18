---
description: Convenciones de la interfaz (TypeScript sin framework, tokens, accesibilidad, copy)
paths:
  - "src/web/**"
  - "*.html"
  - "public/**"
  - "scripts/og.ts"
  - "scripts/og-plantilla.html"
---

# Interfaz

- Colores, tipografías, radios y tiempos solo como variables CSS de `src/web/estilos.css`.
  Ningún hex ni px suelto dentro de `.ts`.
- Sin scripts inline ni `style=""` escrito en el HTML: la CSP lo bloquea. Estilos dinámicos con
  `element.style.setProperty(...)` desde TS.
- Sin peticiones a terceros: fuentes por fontsource, nada de Google Fonts, analytics ni CDNs.
- Cada página conserva el pie exacto:
  `Prototipo para el Hackatón 30X · no oficial · código abierto en GitHub`.
- `index.html` conserva el texto `Diagnóstico 30X con JEV`; `404.html` conserva `Esta página no existe`.
  Las pruebas del paso 1 los buscan.
- Accesibilidad: `label` real en cada campo, error en texto junto al campo, foco visible lima,
  objetivos de 24×24 px mínimo, `aria-live="polite"` para estados, medidor con `role="progressbar"`
  y `aria-valuenow`/`aria-valuemax`, `prefers-reduced-motion` respetado.
- Copy en español de Colombia, frases cortas, tuteo. La palabra "revisión" nunca aparece en pantalla.
- El token del diagnóstico vive solo en `sessionStorage` (`diag:<resultado_id>`). El `QA_TOKEN`
  nunca se guarda: se lee del campo y se descarta.
- Compartir: LinkedIn share-offsite, X intent, `https://wa.me/?text=` sin número, copiar `/r/<id>`.
- Nada de datos de contacto en `/r/<id>`: solo el nombre de pila.
