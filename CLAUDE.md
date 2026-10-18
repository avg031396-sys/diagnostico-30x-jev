# Diagnóstico 30X con JEV

Sitio público del Hackatón 30X: la persona escribe su reto en texto libre y JEV (modelo de decisión
de TypeSafe, respuestas tipadas noul/choice/score) decide el programa de 30X más afín.

## Comandos

| Tarea | Comando |
|---|---|
| Instalar | `npm install` (CI y compuerta final: `npm ci`) |
| Dev | `npm run dev` — build + `wrangler dev` en http://127.0.0.1:8787 (JEV en mock) |
| Build | `npm run build` — Vite multipágina a `./dist` |
| Typecheck | `npm run typecheck` — `wrangler types` + `tsc` sobre `tsconfig.json` y `tsconfig.dom.json` |
| Lint / formato | `npm run lint` · `npm run format` (Biome, único linter y formateador) |
| Unitarias | `npm test` · un archivo o carpeta: `npm test -- tests/motor/ranking.test.ts` |
| E2E + API | `npm run test:e2e` · un archivo: `npm run test:e2e -- tests/e2e/salud.spec.ts` |
| D1 local | `npm run db:migrar` · inspeccionar: `npx wrangler d1 execute DB --local --command "SELECT ..."` |
| Imágenes OG | `npm run og` (Playwright; se comitean los PNG de `public/og/`) |
| Calibrar | `npm run calibrar -- <export-de-qa.json>` · escribir umbrales: agrega `--escribir` (motor en `src/qa/calibrar.ts`) |
| Prueba de despliegue | `npm run deploy:prueba` (`wrangler deploy --dry-run`, no toca la cuenta) |
| Llamada real a JEV | `JEV_MODE=openrouter npm run jev:vivo` (o `composio-proxy`) — solo Alonso, gasta saldo; el constructor no la corre |

**Compuerta:** `npm run typecheck && npm run lint && npm test` antes de marcar cualquier tarea.
Si la tarea toca el Worker o la interfaz, también `npm run test:e2e`.

Runtime en `.nvmrc` (Node 24). Versiones exactas en `package.json` y `package-lock.json`: léelas, no las adivines.
Los scripts de `scripts/` corren con `node --experimental-strip-types` (ya está en los scripts de npm).

**Lo que NO corres tú (requiere a Alonso):** `npm run deploy`, `npm run jev:vivo` con
`JEV_MODE=composio-proxy`, `npx wrangler login`, `wrangler secret put`, `wrangler d1 create`,
cualquier comando `--remote`, `git push`. Están en la lista de lanzamiento del blueprint (§20.1).

## Stack

Cloudflare Workers (plan gratuito) · Hono + zod 4 · D1 · Static Assets · Vite 8 + TypeScript sin
framework · CSS propio con tokens · fontsource · Vitest 5 · Playwright · Biome · npm.

## Arquitectura

**Recorrido de un diagnóstico.** `index.html` → `src/web/diagnostico.ts` junta contacto, perfil,
etapa y reto → `POST /api/diagnosticos` → `src/worker/diagnosticos.ts` valida con
`src/worker/esquemas.ts` → `src/jev/preguntas.ts` arma estado (sin datos personales) y preguntas →
`src/jev/cliente.ts` elige adaptador por `JEV_MODE` (`mock.ts`, `proxy.ts`, `composio-jev.ts`) →
`src/motor/*` detecta dolores y familias → `src/worker/repositorio.ts` guarda el lead en D1 →
la interfaz confirma chips (`src/web/confirmacion.ts`) → `POST .../finalizar` → `src/motor/resultado.ts`
decide (ranking, requisitos, control con Choice, seguimientos) → fila en `resultados` →
`/r/<id>` (`src/worker/resultados.ts` inyecta meta OG con HTMLRewriter) → `src/web/resultado.ts`.

**Fronteras.**

| Capa | Puede importar | Nunca |
|---|---|---|
| `src/motor/**`, `src/qa/**` | `src/motor`, `src/data` | `fetch`, D1, `Env`, DOM, `console`, `src/worker`, `src/web` |
| `src/jev/**` | `src/motor/catalogo.ts`, `src/data` | D1, `Env`, DOM, `src/worker`, `src/web` |
| `src/worker/**` | `src/motor`, `src/jev`, `src/qa`, `src/data`, hono, zod | DOM, `src/web` |
| `src/web/**` | `src/motor/catalogo.ts`, `src/motor/tipos.ts`, html-to-image | `src/worker`, `src/jev`, `src/data/insumos-jev.json` |
| `scripts/**` | `src/motor`, `src/jev`, `src/qa` | `src/worker` |
| `tests/e2e/**` | `@playwright/test` | cualquier cosa de `src/` |

**Dónde vive cada cosa.**

| Tema | Única fuente |
|---|---|
| Insumos de JEV (preguntas, casos, familias, requisitos) | `src/data/insumos-jev.json` — no se edita |
| Umbrales | `src/data/umbrales.json` (se recalibran con `npm run calibrar`) |
| Programas, familias, dolores, URLs | `src/motor/catalogo.ts` (prueba que coincide con los insumos) |
| Banco de seguimientos | `src/data/seguimientos.json` |
| Esquema D1 | `migrations/0001_inicial.sql` — escrito a mano, no se edita tras comitearlo |
| Acceso a D1 | `src/worker/repositorio.ts` (leads, resultados) y `src/worker/qa.ts` (qa_runs) |
| CSP y cabeceras | constante `CSP` en `src/worker/seguridad.ts`, copiada en `public/_headers` |
| Tokens de diseño | `src/web/estilos.css` |
| Palabras clave del mock | `src/jev/mock-keywords.ts` |

## Reglas de código

1. Imports relativos con extensión `.ts` explícita; JSON con `with { type: "json" }`; sin alias.
   Lo exige Node al correr `scripts/` y lo aceptan wrangler, Vite, Vitest y tsc.
2. Sintaxis borrable: nada de `enum`, `namespace` ni propiedades de parámetro. Tipos con `import type`.
3. Máximo 250 líneas por archivo. Más es dos archivos.
4. Toda entrada HTTP pasa por zod antes de tocar lógica. Error único: `{ error: { code, message } }`.
5. El motor recibe umbrales por parámetro y no hace I/O. Todo cambio del motor llega con su prueba.
6. Todo adaptador JEV recibe `fetch` inyectado; ninguna prueba hace red real.
7. Interfaz sin scripts inline ni `style=""` en HTML (CSP). Sin peticiones a terceros.
8. Sin dependencias nuevas sin razón escrita en el commit; versión exacta (`.npmrc` tiene `save-exact`).

## Diseño (de 30x.com)

| Rol | Valor | Uso |
|---|---|---|
| `--bg` | `#000000` | fondo principal |
| `--primary` | `#E9FF7B` | botón primario (texto negro), círculo de score, foco |
| `--primary-fg` | `#000000` | texto sobre lima |
| `--surface` | `#272917` | tarjetas sobre negro |
| `--fg` | `#FAFAFA` | texto sobre negro; fondo de secciones claras |
| `--fg-muted` | `#999999` | texto secundario sobre negro (`#5C5C5C` sobre crema) |
| `--border` | `#999999` | bordes de campos; divisores `#3A3B2A` |
| `--destructive` | `#FF6B6B` | errores de formulario |
| `--white` | `#FFFFFF` | texto de máximo énfasis |

- Títulos: Inter Variable 600, tracking −0.03em. UI y cuerpo: Inter Tight Variable 400/500, 16/24.
  Acento: Instrument Serif itálica en lima para UNA palabra clave del título.
- Escala: 12 / 14 / 16 / 20 / 24 / 32 / 40 / 56 px. Espaciado base 4: 4, 8, 12, 16, 24, 32, 48, 64.
- Radios: botones y chips 999px (píldora); tarjetas 24px; campos 12px. Sin sombras: bordes.
- Movimiento: 200ms `cubic-bezier(0.2, 0, 0, 1)` entre pasos (opacidad + 8px); 150ms en hover.
  `prefers-reduced-motion: reduce` → 0ms.
- Mobile-first 360px; columna máxima 640px (QA: 960px); cortes 768 y 1024.

## Entorno

| Variable | Obligatoria | Usada por | Fuente |
|---|---|---|---|
| `JEV_MODE` | sí (`mock`, `openrouter`, `composio-proxy`, `composio-jev`) | `src/jev/cliente.ts` | `wrangler.jsonc` vars (`openrouter` en producción); `.dev.vars` y e2e usan `mock` |
| `JEV_MODEL` | sí (default `typesafe/jev-1.14`) | adaptadores JEV | `wrangler.jsonc` vars |
| `LIMITE_ACTIVO` | sí (default `1`) | `src/worker/seguridad.ts` | `wrangler.jsonc` vars; e2e pasa `0` |
| `QA_TOKEN` | solo para `/api/qa/lote` y `cerrar` | `src/worker/qa.ts` | `.dev.vars` (local `token-e2e-local`); producción: secret |
| `OPENROUTER_API_KEY` | solo con `JEV_MODE=openrouter` | `src/jev/openrouter.ts` | OpenRouter; producción: secret |
| `COMPOSIO_API_KEY` | solo con `JEV_MODE=composio-*` | `proxy.ts`, `composio-jev.ts` | Composio, permiso "Proxy execute" |
| `COMPOSIO_OPENROUTER_ACCOUNT_ID` | solo con `composio-proxy` | `proxy.ts` | Composio, conexión OpenRouter |
| `COMPOSIO_JEV_ACCOUNT_ID` | opcional (`composio-jev`) | `composio-jev.ts` | Composio |
| `JEV_MODEL_COMPOSIO` | opcional (si falta, usa `JEV_MODEL`) | `composio-jev.ts` | `.dev.vars` / secret |

CI: `.github/workflows/ci.yml` corre typecheck, lint, unitarias y e2e (mock) en cada push a `main` y en cada PR.

`.dev.vars.example` se comitea con valores ficticios; `.dev.vars` nunca. Bindings: `DB` (D1),
`ASSETS`, `LIMITE_DIAGNOSTICO` (rate limit 10 por minuto por IP).

## Reglas por área

| Archivo | Aplica a |
|---|---|
| `.claude/rules/motor.md` | `src/motor/**`, `src/qa/**`, `src/data/**` |
| `.claude/rules/jev.md` | `src/jev/**`, `scripts/jev-en-vivo.ts`, `tests/jev/**`, `tests/fixtures/**` |
| `.claude/rules/worker.md` | `src/worker/**`, `migrations/**`, `wrangler.jsonc`, `public/_headers` |
| `.claude/rules/web.md` | `src/web/**`, `*.html`, `public/**`, `scripts/og*` |
| `.claude/rules/pruebas.md` | `tests/**`, `vitest.config.ts`, `playwright.config.ts` |

## Compuertas de revisión (obligatorias)

Al cerrar cada bloque (pasos 7, 11, 16 y 20) usa la skill de proyecto `revision-seguridad`:
corre `anthropic-skills:abogado-del-diablo` y `cyber-neo`, guarda
`docs/revisiones/<NN>-<bloque>-abogado.md` y `docs/revisiones/<NN>-<bloque>-cyber-neo.md`, corrige
todo hallazgo crítico o alto, y cierra cada archivo con la línea exacta
`Hallazgos críticos abiertos: 0`. Sin esa línea el paso no está hecho.

## Orden de construcción

`tasks.json` y `epics/` en `blueprints/diagnostico-30x-jev/` mandan. Cada tarea termina con un commit
en español que acaba en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` y su tag `step-NN-<slug>`.

## No negociable

1. Datos personales (nombre, correo, WhatsApp, empresa) nunca van a JEV, a logs, a `/r/<id>` ni a
   `/api/resultados`. Solo el nombre de pila sale en el resultado público.
2. Nunca se llama al webhook de 30X ni se usa su número de WhatsApp. Compartir usa `wa.me/?text=` sin número.
3. Máximo 2 llamadas a JEV por diagnóstico. El modelo es `typesafe/jev-1.14`, nunca el alias `latest`.
4. La persona nunca ve un error técnico ni la palabra "revisión": ve su ruta preliminar y el botón de asesor.
5. Nunca se comitean secretos, `.dev.vars`, `dist/` ni `worker-configuration.d.ts`.
6. `src/data/insumos-jev.json` y una migración ya comiteada no se editan.
7. Nunca se marca una tarea como hecha con una compuerta en rojo, y nunca se edita un Verify para que pase.
