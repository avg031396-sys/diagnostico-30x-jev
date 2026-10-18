# Epic 03: Imágenes OG, QA de JEV y entrega

> Existen las 18 imágenes para compartir, la página pública `/qa.html` con la corrida de los 60 casos, la herramienta de calibración, el script de la única llamada real a JEV, el aviso de privacidad y el README, todo cerrado con las compuertas de revisión.

| | |
|---|---|
| **Epic id** | `03-og-qa-entrega` |
| **Tasks** | `E3-T1` … `E3-T6` |
| **Depends on** | `01-base-motor-jev`, `02-api-interfaz` |
| **Unlocks** | la entrega: Alonso despliega y sube el código con sus cuentas, fuera de las tareas |
| **Parallel with** | ninguna |

No necesitas ningún otro archivo para completar esta épica. Todo lo de abajo se repite aquí a propósito.

---

## Stack

Cloudflare Workers (plan gratuito) con Static Assets · TypeScript sin framework · CSS propio con tokens · D1 (SQLite) con SQL directo · Hono + zod 4 · Vite 8 · Vitest 5 · Playwright · Biome. Gestor de paquetes: `npm`. Runtime fijado en `.nvmrc` (Node 24). Las versiones exactas están en `package.json` y `package-lock.json`: léelos, no adivines ninguna.

| Tarea | Comando |
|---|---|
| Dev | `npm run dev` (http://127.0.0.1:8787, JEV en mock) |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` (formato: `npm run format`) |
| Unitarias (un archivo) | `npm test -- <ruta>` |
| E2E (un archivo) | `npm run test:e2e -- <ruta>` |
| D1 local | `npm run db:migrar` |
| Prueba de despliegue | `npm run deploy:prueba` |

**Gate:** `npm run typecheck && npm run lint && npm test` pasa antes de marcar cualquier tarea de esta épica como hecha (y `npm run test:e2e` si tocaste el Worker o la interfaz).

No hay servicios externos que levantar: la D1 local y el Worker los arranca `playwright.config.ts` (`webServer`) y `npm run dev`. Los archivos de configuración llegaron con la copia de `workspace/` del Bootstrap; no los escribes. Nunca llames a Composio, OpenRouter ni a Cloudflare desde una prueba: `JEV_MODE=mock`.

## Directory subtree

Solo lo que toca esta épica:

```
scripts/
  og.ts og-plantilla.html        # NUEVOS (paso 15)
  calibrar.ts                    # NUEVO (paso 18)
  jev-en-vivo.ts                 # NUEVO (paso 19)
public/og/*.png                  # GENERADOS por npm run og (paso 15) y comiteados
src/
  qa/evaluar.ts                  # NUEVO (paso 17), puro
  worker/qa.ts                   # NUEVO (paso 17); app.ts se edita
  web/qa.ts                      # NUEVO (paso 18)
qa.html privacidad.html          # EDITAN (pasos 18 y 19)
README.md                        # NUEVO (paso 19)
tests/
  og/og.test.ts                  # NUEVO (paso 15)
  qa/evaluar.test.ts             # NUEVO (paso 17)
  scripts/calibrar.test.ts jev-en-vivo.test.ts   # NUEVOS (pasos 18, 19)
  e2e/api-qa.spec.ts qa-pagina.spec.ts privacidad.spec.ts   # NUEVOS (pasos 17, 18, 19)
docs/revisiones/
  04-interfaz-abogado.md 04-interfaz-cyber-neo.md             # NUEVOS (paso 16)
  05-qa-y-entrega-abogado.md 05-qa-y-entrega-cyber-neo.md     # NUEVOS (paso 20)
```

Todo lo que esté fuera de este árbol queda fuera de alcance. Si una tarea parece exigir editar un archivo que no aparece aquí, detente y repórtalo: el borde de la épica está mal.

## Data model touched here

| Entity | Fields this epic adds or reads | Notes |
|---|---|---|
| `qa_runs` | escribe y lee todas sus columnas: `id` (UUID), `estado` (`en_curso` o `cerrado`), `modo`, `modelo`, `umbrales`, `lotes_total`, `lotes_procesados`, totales, percentiles, `detalle` (JSON por caso) | solo `src/worker/qa.ts` la toca |

## Contracts

**Consumed** — ya existe, no lo reconstruyas:

| From | Interface | Guarantee |
|---|---|---|
| `01-base-motor-jev` | `resolverResultado`, `crearClienteJev`, `evaluarConReintento`, `construirPreguntas`, `construirEstado`, `PROGRAMAS` | puros o con `fetch` inyectado |
| `02-api-interfaz` | `compararSeguro(a, b)` en `src/worker/seguridad.ts` | tiempo constante |
| `02-api-interfaz` | `src/web/comun.ts` (`el`, `api`, `anunciar`) y `src/web/estilos.css` | helpers de DOM y tokens |

**Produced** — las épicas siguientes dependen exactamente de esto. Cambiarlo las rompe:

| Export | Signature | Used by |
|---|---|---|
| `POST /api/qa/lote` | `Authorization: Bearer <QA_TOKEN>`, cuerpo `{ run_id?, lote }`; 200 `{ run_id, lote, procesados, lotes_total }` | `/qa.html` |
| `POST /api/qa/:run_id/cerrar` | con token; 200 con los totales | `/qa.html` |
| `GET /api/qa/ultima` | público; 200 `{ run: { id, created_at, estado, modo, modelo, umbrales, total, evaluables, aciertos_top1, aciertos_top3, latencia_p50, latencia_p95, costo_total, detalle } }` o `{ run: null }` | `/qa.html`, `calibrar.ts` |
| `scripts/calibrar.ts` → `calibrar(exportacion, opciones)` | rejilla fuera de línea sobre `run.detalle` | skill `calibrar-umbrales` |
| `scripts/jev-en-vivo.ts` → `ejecutar({ env, fetchFn, imprimir })` | `Promise<number>` (código de salida) | lista de lanzamiento |

## Conventions that bite in this area

- **El `QA_TOKEN` nunca se guarda.** Se lee del campo `type="password"`, vive en una variable local y se descarta; ni `localStorage` ni `sessionStorage`.
- **`/qa` corre en lotes de 10 casos** por petición: el límite exacto de subrequests del plan gratuito es UNVERIFIED y 10 es conservador.
- **El script `jev-en-vivo.ts` hace UNA llamada** y solo con `JEV_MODE=composio-proxy`. En esta épica solo se prueba con `fetch` inyectado; la llamada real la hace Alonso.
- **La calibración usa los casos que NO empiezan con `parafrasis-`** y valida con los 30 que sí. Nunca al revés.
- **Los PNG de `public/og/` se generan una vez y se comitean.** El Worker solo los referencia en la meta OG.
- **La meta de calibración se expresa sobre los casos evaluables** (los que tienen `esperado.programa_recomendado`), no sobre los 60.

Reglas completas del proyecto: `CLAUDE.md`. Reglas por área: `.claude/rules/*.md`. Ambos están en la raíz del proyecto (el Bootstrap los copió desde `workspace/`).

---

## Tasks

En el mismo orden que `tasks.json`. Ese orden es el orden de construcción: no lo reordenes por prioridad ni por lo que se vea más rápido.

### `E3-T1` — Imágenes OG por programa generadas con Playwright

**Depends on:** `E1-T2` · **Priority:** p1 — metadato para recortar alcance, no un orden de ejecución · **Paso 15**

Imágenes estáticas: se generan una vez, se comitean y el Worker solo las referencia en la meta OG.

1. `scripts/og-plantilla.html`: HTML de 1200×630, fondo `#000000`, tarjeta `#272917` con radio 24px,
   arriba «Diagnóstico 30X con JEV», al centro «Mi ruta en 30X:» y `__PROGRAMA__` en Inter 600 crema
   con una palabra en Instrument Serif itálica lima, abajo «Haz el tuyo» y el pie
   «Prototipo para el Hackatón 30X · no oficial». Sin scripts. `__FUENTES__` marca dónde va el CSS de fuentes.
   Vive en `scripts/`, no en `public/`: así no se publica una página que la CSP rompería.
2. `scripts/og.ts` (Node con `--experimental-strip-types`; imports `.ts`):
   - Importa `PROGRAMAS` de `../src/motor/catalogo.ts` y `chromium` de `@playwright/test`.
   - Fuentes: resuelve `import.meta.resolve("@fontsource-variable/inter")` y
     `import.meta.resolve("@fontsource/instrument-serif/400-italic.css")`, lee el CSS, toma el primer
     `url(./files/…latin…woff2)` de cada uno, lee el `.woff2` y lo incrusta como
     un `data:` URI en base64 con tipo `font/woff2` en un `@font-face`. Si no encuentra el archivo, sigue con
     `system-ui` (la imagen se genera igual) y lo avisa por consola.
   - Por cada programa y una vez para `default` («tu programa de 30X»): reemplaza `__PROGRAMA__` y
     `__FUENTES__`, `page.setContent(html)`, viewport 1200×630, `page.screenshot({ path: "public/og/<id>.png" })`.
   - Crea `public/og/` si falta. Sale con 0.
3. `tests/og/og.test.ts`: para cada id de `PROGRAMAS` y `default`: el archivo existe; bytes 16-19 y
   20-23 (ancho y alto big-endian de IHDR) valen 1200 y 630; tamaño < 300 KB.

**Files**
- `scripts/og.ts` — nuevo — genera los PNG de 1200×630
- `scripts/og-plantilla.html` — nuevo — plantilla de la imagen OG
- `public/og/*.png` — generado por `npm run og` — un PNG por programa más `default.png`
- `tests/og/og.test.ts` — nuevo — tamaño y peso de cada PNG

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** `npm run og` corre **THE SYSTEM SHALL** escribir `public/og/<id>.png` para cada uno de los 17 programas de `src/motor/catalogo.ts` más `public/og/default.png`, y salir con 0.
2. **WHEN** `npm test -- tests/og/og.test.ts` lee la cabecera IHDR de cada PNG **THE SYSTEM SHALL** encontrar ancho 1200 y alto 630.
3. **WHEN** se mide cada PNG **THE SYSTEM SHALL** pesar menos de 300 KB.
4. **WHEN** `npm run build` corre **THE SYSTEM SHALL** copiar `public/og/Sales_Machine.png` y `public/og/default.png` a `dist/og/`.
5. **WHEN** `npm test -- tests/seguridad/secretos.test.ts` corre **THE SYSTEM SHALL** seguir en cero coincidencias (los PNG se saltan como binarios).

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm run og   # expect: exit 0
npm test -- tests/og/og.test.ts   # expect: exit 0, 0 failed
npm run build   # expect: exit 0
test -f dist/og/Sales_Machine.png   # expect: exit 0
test -f dist/og/default.png   # expect: exit 0
npm test -- tests/seguridad/secretos.test.ts   # expect: exit 0
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 15: Imágenes OG por programa generadas con Playwright" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-15-og
git ls-files --error-unmatch public/og/default.png   # expect: exit 0 — el PNG quedó comiteado
git ls-files --error-unmatch public/og/Sales_Machine.png   # expect: exit 0 — el PNG quedó comiteado
# rollback target si el paso 16 sale mal: git reset --hard step-15-og
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E3-T2` — Revisión del bloque interfaz (compuerta)

**Depends on:** `E2-T7`, `E3-T1` · **Priority:** p1 — metadato para recortar alcance, no un orden de ejecución · **Paso 16**

Compuerta pedida por Alonso. Sigue `.claude/skills/revision-seguridad/SKILL.md`.

1. Alcance: `src/web/`, `index.html`, `resultado.html`, `qa.html`, `privacidad.html`, `404.html`,
   `public/`, `scripts/og.ts`, `scripts/og-plantilla.html`.
2. `anthropic-skills:abogado-del-diablo`: claridad de cada pantalla, qué ve la persona si JEV falla,
   si nada aplica o si el resultado es preliminar (nunca la palabra «revisión»), accesibilidad
   (teclado, lector de pantalla, 200% de zoom, 360px), textos de compartir.
3. `cyber-neo`: XSS (todo texto del servidor entra con `textContent`, nunca `innerHTML`), CSP,
   token en `sessionStorage`, enlaces externos con `rel="noopener"`, datos personales en `/r`.
4. Guarda, corrige críticos y altos con su prueba, y cierra con `Hallazgos críticos abiertos: 0`.

**Files**
- `docs/revisiones/04-interfaz-abogado.md` — nuevo — salida de anthropic-skills:abogado-del-diablo
- `docs/revisiones/04-interfaz-cyber-neo.md` — nuevo — salida de cyber-neo
- `src/web/**` — editar solo si un hallazgo crítico o alto lo exige
- `*.html` — editar solo si un hallazgo crítico o alto lo exige

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** el paso termina **THE SYSTEM SHALL** tener `docs/revisiones/04-interfaz-abogado.md` con la línea `Herramienta: anthropic-skills:abogado-del-diablo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
2. **WHEN** el paso termina **THE SYSTEM SHALL** tener `docs/revisiones/04-interfaz-cyber-neo.md` con la línea `Herramienta: cyber-neo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
3. **WHEN** se lee cada documento **THE SYSTEM SHALL** contener la tabla de hallazgos con la cabecera `| # | Severidad | Hallazgo | Estado | Corrección |`.
4. **WHEN** `npm run typecheck`, `npm run lint`, `npm test` y `npm run test:e2e` corren después de las correcciones **THE SYSTEM SHALL** salir con 0, con 0 pruebas fallidas.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
test -f docs/revisiones/04-interfaz-abogado.md   # expect: exit 0
test -f docs/revisiones/04-interfaz-cyber-neo.md   # expect: exit 0
grep -Eq '^Herramienta: (anthropic-skills:abogado-del-diablo|revisión manual \(skill no disponible\))$' docs/revisiones/04-interfaz-abogado.md   # expect: exit 0
grep -Eq '^Herramienta: (cyber-neo|revisión manual \(skill no disponible\))$' docs/revisiones/04-interfaz-cyber-neo.md   # expect: exit 0
grep -qF '| # | Severidad | Hallazgo | Estado | Corrección |' docs/revisiones/04-interfaz-abogado.md   # expect: exit 0
grep -qF '| # | Severidad | Hallazgo | Estado | Corrección |' docs/revisiones/04-interfaz-cyber-neo.md   # expect: exit 0
grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/04-interfaz-abogado.md   # expect: exit 0
grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/04-interfaz-cyber-neo.md   # expect: exit 0
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
npm test   # expect: exit 0, 0 failed
npm run test:e2e   # expect: exit 0, 0 failed
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 16: Revisión del bloque interfaz (compuerta)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-16-revision-interfaz
# rollback target si el paso 17 sale mal: git reset --hard step-16-revision-interfaz
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E3-T3` — QA: evaluación por lotes de los 60 casos y API /api/qa

**Depends on:** `E3-T2` · **Priority:** p1 — metadato para recortar alcance, no un orden de ejecución · **Paso 17**

Mide JEV con los 60 casos de los insumos. En mock mide el mock; con `composio-proxy` mide JEV.

1. `src/qa/evaluar.ts` (puro):
   - `estadoDesdeCaso(caso)`: `perfil`, `etapa`, `edad_hijo` y `reto_principal` del caso para
     `construirEstado`; `respuestas_seguimiento` automáticas: `facturacion` = `rango_facturacion_anual_usd`
     si viene; si viene `reuniones_venta_semana`, `cliente: "b2b"` y `reuniones` = `menos_20` si es
     < 20, si no `20_o_mas`. Sin más respuestas.
   - `evaluarCaso(caso, evaluacion, resultadoMotor)` → fila `{ id, tipo, esperado, top1, top3,
     acierto_top1, acierto_top3, evaluable, confianza_choice, latencia_ms, costo_usd, respuestas, respuestas_seguimiento,
     perfil, etapa_nivel, edad_hijo, dolores_confirmados }`
     (`respuestas` = `RespuestasJev`; `perfil`, `etapa_nivel`, `edad_hijo` y `dolores_confirmados` son lo que necesita
     la calibración para volver a correr `resolverResultado`). `top1` = `programa_top?.id ?? null`;
     `top3` = los 3 primeros de `orden`. Esperado `requiere_revision`/`no_aplica`: acierto (top-1 y
     top-3) si `requiere_revision` es true. Si no: top-1 si `top1 === esperado`; top-3 si está en `top3`.
     `evaluable` = el caso tiene `esperado.programa_recomendado`.
   - `totalizar(filas)` → `{ total, evaluables, aciertos_top1, aciertos_top3, latencia_p50, latencia_p95, costo_total }`
     (aciertos solo sobre evaluables; percentiles por rango más cercano sobre `latencia_ms`).
2. `src/worker/qa.ts` (única otra puerta a D1, tabla `qa_runs`):
   - Autorización: `Authorization: Bearer <token>` comparado con `compararSeguro` contra
     `env.QA_TOKEN`; sin `QA_TOKEN` configurado → 401 siempre.
   - `POST /api/qa/lote` `{ run_id?, lote }`: `lotes_total = Math.ceil(casos.length / 10)`; `lote`
     fuera de rango → 400; `lote > 0` sin `run_id` → 400; `lote` 0 sin `run_id` crea el run
     (`crypto.randomUUID()`, `estado` `en_curso`, `modo`, `modelo`, `umbrales`). Si el lote ya está en
     `lotes_procesados`, no lo repite. Procesa sus 10 casos con `Promise.all` (cada uno:
     `construirPreguntas` → `evaluarConReintento` → `resolverResultado` con los dolores detectados
     como confirmados y las respuestas automáticas → `evaluarCaso`). Un caso cuyo JEV falla queda
     con `top1` null y `acierto_*` false. Responde `{ run_id, lote, procesados, lotes_total }`.
   - `POST /api/qa/:run_id/cerrar` (con token): `totalizar(detalle)`, `estado` `cerrado`. Responde los totales.
   - `GET /api/qa/ultima` (público): último run `cerrado` por `created_at`, o `{ run: null }`.
     Responde `{ run: { id, created_at, estado, modo, modelo, umbrales, total, evaluables, aciertos_top1, aciertos_top3, latencia_p50, latencia_p95, costo_total, detalle } }`.
3. `src/worker/app.ts`: `app.route("/api/qa", qa)`.
4. `tests/qa/evaluar.test.ts` y `tests/e2e/api-qa.spec.ts` (token `token-e2e-local`, el de
   `playwright.config.ts`). Las cuentas de casos se leen de `src/data/insumos-jev.json`, no se escriben a mano.

**Files**
- `src/qa/evaluar.ts` — nuevo — `evaluarCaso()` y `totalizar()`, puros
- `src/worker/qa.ts` — nuevo — rutas `/api/qa/*` y consultas de `qa_runs`
- `src/worker/app.ts` — editar — monta `/api/qa`
- `tests/qa/evaluar.test.ts` — nuevo — aciertos, casos especiales, totales
- `tests/e2e/api-qa.spec.ts` — nuevo — token, lotes, cierre, lectura pública

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** `POST /api/qa/lote` llega sin `Authorization: Bearer` válido **THE SYSTEM SHALL** responder 401 con `error.code` `NO_AUTORIZADO` y no crear filas en `qa_runs`.
2. **WHEN** se envía el lote 0 con el token válido **THE SYSTEM SHALL** crear un run `en_curso` y procesar los primeros 10 casos de `casos_prueba`, devolviendo `run_id`, `procesados` 10 y `lotes_total` igual a ceil(casos / 10) (hoy 6).
3. **WHEN** se envían los lotes restantes de ese `run_id` y luego `POST /api/qa/:run_id/cerrar` **THE SYSTEM SHALL** guardar `total` igual al número de casos (hoy 60), `estado` `cerrado`, `aciertos_top1`, `aciertos_top3`, `latencia_p50`, `latencia_p95` y `costo_total`.
4. **WHEN** se pide `GET /api/qa/ultima` sin token **THE SYSTEM SHALL** responder 200 con el último run cerrado, cuyo `detalle` trae por caso `id`, `tipo`, `esperado`, `top1`, `top3`, `acierto_top1`, `acierto_top3`, `confianza_choice`, `latencia_ms` y `costo_usd`.
5. **WHEN** `evaluarCaso` puntúa un caso cuyo esperado es `requiere_revision` o `no_aplica` **THE SYSTEM SHALL** contar acierto si el resultado trae `requiere_revision` true; y los casos sin `esperado.programa_recomendado` SHALL quedar fuera de `evaluables` (hoy 54).
6. **WHEN** el mismo lote se envía dos veces para un run **THE SYSTEM SHALL** no duplicar sus casos en `detalle`.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm test -- tests/qa/evaluar.test.ts   # expect: exit 0, 0 failed
npm run test:e2e -- tests/e2e/api-qa.spec.ts   # expect: exit 0, 0 failed
npx wrangler d1 execute DB --local --json --command "SELECT CASE WHEN count(*) >= 1 THEN 'si' ELSE 'no' END AS hay FROM qa_runs WHERE estado = 'cerrado'" > .wrangler/qa.json   # expect: exit 0
grep -Eq '"hay": ?"si"' .wrangler/qa.json   # expect: exit 0 — hay un run cerrado
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 17: QA: evaluación por lotes de los 60 casos y API /api/qa" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-17-qa-api
# rollback target si el paso 18 sale mal: git reset --hard step-17-qa-api
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E3-T4` — Página /qa.html y script de calibración de umbrales

**Depends on:** `E3-T3` · **Priority:** p1 — metadato para recortar alcance, no un orden de ejecución · **Paso 18**

La página pública de calidad y la herramienta para recalibrar fuera de línea.

1. `src/web/qa.ts` (importa `./comun.ts`): `GET /api/qa/ultima`.
   - Cabecera con el contexto del handoff: «hoy en 30X el programa lo elige la persona en 2,325 de
     2,325 caminos; la etapa nunca cambia el resultado».
   - Meta visible: «Meta de calibración: ≥ 90 % top-1 y 100 % top-3 sobre los casos evaluables»
     y los aciertos como `aciertos_top1/evaluables` y `aciertos_top3/evaluables`.
   - Totales, `latencia_p50`, `latencia_p95`, `costo_total` (USD con 4 decimales), `modelo`,
     `modo` y `umbrales`. Tabla: id, tipo, esperado, n.º 1 obtenido, top 3, acierto top-1, acierto
     top-3, confianza del Choice, latencia ms, costo USD. Columna de 960px máximo, con scroll horizontal
     propio en 360px.
   - Sin run: «Todavía no hay corridas guardadas».
   - «Correr de nuevo»: campo `type="password"` con su `label` «Token de QA». Recorre los lotes
     0…`lotes_total - 1` en serie con `Authorization: Bearer <token>`, luego `cerrar`, luego recarga
     la tabla. 401 → «Token inválido». El token vive solo en una variable local; nunca en
     `localStorage` ni `sessionStorage`.
2. `qa.html`: agrega `<script type="module" src="/src/web/qa.ts"></script>` al final del `body`.
3. `scripts/calibrar.ts` (Node, sin red): exporta `calibrar(exportacion, opciones)` y corre como CLI
   solo si `import.meta.url === pathToFileURL(process.argv[1]).href`.
   - Entrada: ruta al JSON de `GET /api/qa/ultima`; usa `run.detalle[].respuestas`, `esperado`,
     `perfil`, `etapa_nivel`, `edad_hijo`, `dolores_confirmados`,
     `respuestas_seguimiento` y vuelve a correr `resolverResultado` + `evaluarCaso` con cada combinación.
   - Rejilla: `umbral_recomendar` 0.50…0.80 paso 0.05, `umbral_mostrar` 0.30…0.50 paso 0.05,
     `umbral_choice` 0.30…0.60 paso 0.05; descarta combinaciones con `umbral_mostrar > umbral_recomendar`.
     Los otros tres umbrales se copian de `src/data/umbrales.json`.
   - Calibración = casos cuyo id NO empieza con `parafrasis-`; validación = los que sí. Mejor =
     mayor top-1 de calibración, luego mayor top-3, luego la más cercana a los umbrales actuales.
   - Imprime una tabla con las 10 mejores (calibración y validación) y la elegida.
   - `--escribir` escribe los 6 umbrales en `--salida <ruta>` (por defecto `src/data/umbrales.json`).
     Sin `--escribir` no escribe nada.
4. `tests/scripts/calibrar.test.ts`: arma en memoria una exportación de ejemplo con casos de los
   dos grupos y llama `calibrar()`; para `--escribir` usa un archivo en `os.tmpdir()`. Además deja escrito
   `.wrangler/qa-export-minimo.json` (crea la carpeta si falta): una exportación mínima válida de
   `GET /api/qa/ultima` con 4 filas en `run.detalle` (2 con id que no empieza con `parafrasis-` y 2 que sí),
   cada una con `id`, `tipo`, `esperado`, `respuestas`, `perfil`, `etapa_nivel`, `edad_hijo`,
   `dolores_confirmados` y `respuestas_seguimiento`. El Verify corre el CLI de verdad sobre ese archivo.
5. `tests/e2e/qa-pagina.spec.ts`: corre el botón con `token-e2e-local`; verifica `localStorage.length === 0`.

**Files**
- `qa.html` — editar — carga `src/web/qa.ts`
- `src/web/qa.ts` — nuevo — tabla de la última corrida y botón «Correr de nuevo»
- `tests/e2e/qa-pagina.spec.ts` — nuevo — tabla, token, error de token
- `scripts/calibrar.ts` — nuevo — búsqueda en rejilla fuera de línea
- `tests/scripts/calibrar.test.ts` — nuevo — rejilla, división calibración/validación, escritura

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** `/qa.html` carga después de un run cerrado **THE SYSTEM SHALL** mostrar una fila por caso, los totales, p50 y p95 de latencia, costo total, modelo, modo, umbrales y el texto `hoy en 30X el programa lo elige la persona en 2,325 de 2,325 caminos; la etapa nunca cambia el resultado`.
2. **WHEN** se pulsa `Correr de nuevo` con el token `token-e2e-local` **THE SYSTEM SHALL** enviar `Authorization: Bearer` en cada petición de lote, procesar todos los lotes, cerrar el run y refrescar la tabla, dejando `localStorage` vacío.
3. **WHEN** se usa un token equivocado **THE SYSTEM SHALL** mostrar `Token inválido` y no cambiar la tabla.
4. **WHEN** la página muestra la meta **THE SYSTEM SHALL** decir `Meta de calibración: ≥ 90 % top-1 y 100 % top-3 sobre los casos evaluables` junto a los aciertos como `n/evaluables`.
5. **WHEN** `npm test -- tests/scripts/calibrar.test.ts` corre **THE SYSTEM SHALL** elegir umbrales usando solo los casos cuyo id no empieza con `parafrasis-` y reportar la precisión de validación sobre los que sí empiezan con `parafrasis-`.
6. **WHEN** `node --experimental-strip-types scripts/calibrar.ts .wrangler/qa-export-minimo.json` corre (el archivo lo deja `tests/scripts/calibrar.test.ts`) **THE SYSTEM SHALL** salir con 0, imprimir la tabla de las 10 mejores combinaciones y no escribir ningún archivo; **WHEN** corre con `--escribir --salida <archivo temporal>` **THE SYSTEM SHALL** escribir ahí los umbrales elegidos con las 6 claves.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm test -- tests/scripts/calibrar.test.ts   # expect: exit 0, 0 failed — deja escrito .wrangler/qa-export-minimo.json
node --experimental-strip-types scripts/calibrar.ts .wrangler/qa-export-minimo.json   # expect: exit 0 — el CLI corre de verdad sobre la exportación mínima y no escribe ningún archivo
npm run build   # expect: exit 0
npm run test:e2e -- tests/e2e/qa-pagina.spec.ts   # expect: exit 0, 0 failed
npm run test:e2e -- tests/e2e/api-qa.spec.ts   # expect: exit 0 — el gate del paso 17 sigue en verde
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 18: Página /qa.html y script de calibración de umbrales" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-18-qa-pagina-calibrar
# rollback target si el paso 19 sale mal: git reset --hard step-18-qa-pagina-calibrar
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E3-T5` — Aviso de privacidad, script de JEV en vivo y README

**Depends on:** `E3-T4` · **Priority:** p1 — metadato para recortar alcance, no un orden de ejecución · **Paso 19**

Lo que falta para entregar sin tocar cuentas reales. La llamada real a JEV y el despliegue no son tareas: los hace Alonso con sus cuentas al lanzar, fuera de esta construcción.

1. `privacidad.html` (conserva título, meta y pie): qué se guarda (nombre, correo, WhatsApp, empresa
   opcional, el reto, las respuestas y el resultado), para qué (darte tu diagnóstico y, si lo pides,
   que un asesor de 30X te contacte), dónde (Cloudflare D1), qué se comparte (a JEV solo el texto del
   reto, perfil y etapa; nunca tus datos de contacto; la tarjeta pública muestra solo tu nombre de
   pila), que es un prototipo no oficial del Hackatón 30X sin relación formal con 30X, y el contacto
   «escríbenos desde el repositorio de GitHub (issues)» enlazado a
   `https://github.com/avg031396-sys/diagnostico-30x-jev/issues`. Sin direcciones de correo. Sin script.
2. `scripts/jev-en-vivo.ts` (Node, `--experimental-strip-types`): exporta
   `ejecutar({ env, fetchFn, imprimir }): Promise<number>` y corre como CLI solo si
   `import.meta.url === pathToFileURL(process.argv[1]).href` (sale con el código que devuelve).
   - Carga `.dev.vars` con un lector propio (`CLAVE=valor`, ignora líneas vacías y `#`) y le pone
     encima `process.env` (gana `process.env`).
   - `JEV_MODE !== "composio-proxy"` → imprime `JEV_MODE debe ser composio-proxy` y devuelve 2.
   - Falta `COMPOSIO_API_KEY` o `COMPOSIO_OPENROUTER_ACCOUNT_ID` → mensaje claro y 3.
   - Una sola llamada con `crearClienteJev(config).evaluar(estado, preguntas)` (sin reintento) para el reto de ventas
     de ejemplo (`founder`, `arrancando`). Imprime programa del Choice, confianza, `latencia_ms`,
     costo USD y modelo. `JevError` → imprime su código y devuelve 4. Éxito → 0.
3. `tests/scripts/jev-en-vivo.test.ts`: llama `ejecutar()` con env en memoria y un `fetch` falso que
   responde la fixture `tests/fixtures/openrouter-decision.json` envuelta en `{ data, status: 200 }`.
4. `README.md` en español: `## Qué es` (el pitch: «Su diagnóstico de hoy le pregunta a la persona qué
   programa quiere. El nuestro escucha su problema y decide como decide Andrés.»), `## Demo` (la URL
   se agrega al desplegar; ver la lista de lanzamiento), `## Correr local en modo mock` (clonar,
   bootstrap, `npm run dev`), `## Conectar JEV` (Composio «Proxy execute», `connected_account_id`,
   `.dev.vars`, `JEV_MODE=composio-proxy npm run jev:vivo`), `## Resultados de /qa` (enlace a `/qa.html`
   y cómo leer la meta) y el aviso «Este es un prototipo no oficial para el Hackatón 30X».
5. `tests/e2e/privacidad.spec.ts`: textos, enlace y ausencia de `@` seguido de dominio en el cuerpo.

**Files**
- `privacidad.html` — editar — aviso corto
- `scripts/jev-en-vivo.ts` — nuevo — UNA llamada real a JEV, protegida
- `tests/scripts/jev-en-vivo.test.ts` — nuevo — guardas y una llamada con fetch inyectado
- `README.md` — nuevo — qué es, demo, local en mock, conectar JEV, QA, aviso
- `tests/e2e/privacidad.spec.ts` — nuevo — contenido del aviso

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** `/privacidad.html` carga **THE SYSTEM SHALL** decir qué se guarda (nombre, correo, WhatsApp, empresa, reto y resultado), para qué, que es un prototipo no oficial del Hackatón 30X y `escríbenos desde el repositorio de GitHub (issues)` con enlace a `https://github.com/avg031396-sys/diagnostico-30x-jev/issues`, y SHALL no contener ninguna dirección de correo.
2. **WHEN** `JEV_MODE=mock node --experimental-strip-types scripts/jev-en-vivo.ts` corre **THE SYSTEM SHALL** salir con código 2 e imprimir `JEV_MODE debe ser composio-proxy` sin ninguna llamada de red.
3. **WHEN** `npm test -- tests/scripts/jev-en-vivo.test.ts` ejecuta `ejecutar()` con `JEV_MODE` `composio-proxy`, claves ficticias y un `fetch` inyectado **THE SYSTEM SHALL** hacer exactamente 1 petición e imprimir programa, confianza, latencia y costo; **WHEN** faltan las claves de Composio **THE SYSTEM SHALL** devolver código 3 sin llamar a `fetch`.
4. **WHEN** se lee `README.md` **THE SYSTEM SHALL** contener los títulos `## Qué es`, `## Demo`, `## Correr local en modo mock`, `## Conectar JEV` y `## Resultados de /qa`, y el texto `prototipo no oficial`.
5. **WHEN** `npm test` corre completo **THE SYSTEM SHALL** salir con 0, incluido el escaneo de secretos sobre los archivos nuevos.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm run test:e2e -- tests/e2e/privacidad.spec.ts   # expect: exit 0, 0 failed
JEV_MODE=mock node --experimental-strip-types scripts/jev-en-vivo.ts; test $? -eq 2   # expect: código 2 = guarda de modo; 1 = excepción y falla
npm test -- tests/scripts/jev-en-vivo.test.ts   # expect: exit 0, 0 failed
grep -qx '## Qué es' README.md   # expect: exit 0
grep -qx '## Demo' README.md   # expect: exit 0
grep -qx '## Correr local en modo mock' README.md   # expect: exit 0
grep -qx '## Conectar JEV' README.md   # expect: exit 0
grep -qx '## Resultados de /qa' README.md   # expect: exit 0
grep -q 'prototipo no oficial' README.md   # expect: exit 0
npm test   # expect: exit 0, 0 failed
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 19: Aviso de privacidad, script de JEV en vivo y README" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-19-entrega
git ls-files --error-unmatch README.md   # expect: exit 0 — el README quedó comiteado
# rollback target si el paso 20 sale mal: git reset --hard step-19-entrega
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E3-T6` — Revisión final de QA y entrega (compuerta global)

**Depends on:** `E3-T5` · **Priority:** p1 — metadato para recortar alcance, no un orden de ejecución · **Paso 20**

Última compuerta antes de que Alonso despliegue. Sigue `.claude/skills/revision-seguridad/SKILL.md`.

1. Alcance: `src/qa/`, `src/worker/qa.ts`, `src/web/qa.ts`, `qa.html`, `privacidad.html`,
   `scripts/`, `README.md`, y una pasada general sobre todo `src/` para lo que cambió desde la
   revisión 04.
2. `anthropic-skills:abogado-del-diablo`: sobreajuste de umbrales (calibración con no-paráfrasis,
   validación con paráfrasis), qué demuestra y qué no la corrida en mock, riesgos del día de la
   demo, que el README no prometa algo que no hay.
3. `cyber-neo`: `QA_TOKEN` (tiempo constante, nunca guardado), costo de `/api/qa/lote`,
   `jev-en-vivo.ts` (no imprime claves), aviso de privacidad, secretos en todo el repo.
4. Guarda, corrige críticos y altos con su prueba, y cierra con `Hallazgos críticos abiertos: 0`.
5. Corre la compuerta automática completa del Verify. Este es el estado que se despliega.

**Files**
- `docs/revisiones/05-qa-y-entrega-abogado.md` — nuevo — salida de anthropic-skills:abogado-del-diablo
- `docs/revisiones/05-qa-y-entrega-cyber-neo.md` — nuevo — salida de cyber-neo
- `src/**` — editar solo si un hallazgo crítico o alto lo exige
- `scripts/**` — editar solo si un hallazgo crítico o alto lo exige

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** el paso termina **THE SYSTEM SHALL** tener `docs/revisiones/05-qa-y-entrega-abogado.md` con la línea `Herramienta: anthropic-skills:abogado-del-diablo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
2. **WHEN** el paso termina **THE SYSTEM SHALL** tener `docs/revisiones/05-qa-y-entrega-cyber-neo.md` con la línea `Herramienta: cyber-neo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
3. **WHEN** se lee cada documento **THE SYSTEM SHALL** contener la tabla de hallazgos con la cabecera `| # | Severidad | Hallazgo | Estado | Corrección |`.
4. **WHEN** corre la compuerta automática completa (`npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`, `npm run deploy:prueba`) **THE SYSTEM SHALL** salir con 0 en cada comando.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
test -f docs/revisiones/05-qa-y-entrega-abogado.md   # expect: exit 0
test -f docs/revisiones/05-qa-y-entrega-cyber-neo.md   # expect: exit 0
grep -Eq '^Herramienta: (anthropic-skills:abogado-del-diablo|revisión manual \(skill no disponible\))$' docs/revisiones/05-qa-y-entrega-abogado.md   # expect: exit 0
grep -Eq '^Herramienta: (cyber-neo|revisión manual \(skill no disponible\))$' docs/revisiones/05-qa-y-entrega-cyber-neo.md   # expect: exit 0
grep -qF '| # | Severidad | Hallazgo | Estado | Corrección |' docs/revisiones/05-qa-y-entrega-abogado.md   # expect: exit 0
grep -qF '| # | Severidad | Hallazgo | Estado | Corrección |' docs/revisiones/05-qa-y-entrega-cyber-neo.md   # expect: exit 0
grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/05-qa-y-entrega-abogado.md   # expect: exit 0
grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/05-qa-y-entrega-cyber-neo.md   # expect: exit 0
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
npm test   # expect: exit 0, 0 failed
npm run test:e2e   # expect: exit 0, 0 failed
npm run build   # expect: exit 0
npm run deploy:prueba   # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 20: Revisión final de QA y entrega (compuerta global)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-20-revision-final
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

---

## Epic acceptance

La épica está hecha cuando cada tarea está `done` **y**:

1. **WHEN** la página `/qa.html` corre una evaluación con el token local **THE SYSTEM SHALL** procesar todos los lotes, cerrar el run y mostrar una fila por cada caso de `casos_prueba`.
2. **WHEN** corre la compuerta automática completa (`npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`, `npm run deploy:prueba`) **THE SYSTEM SHALL** salir con 0 en cada comando.

```bash
npm run typecheck && npm run lint && npm test
npm run test:e2e
npm run build && npm run deploy:prueba
```

Corre desde la raíz del proyecto. Ambos criterios los deciden estos comandos.

## Pitfalls

- **Con `JEV_MODE=mock` la matriz de `/qa` mide el mock, no a JEV.** El README y la página lo dicen; no presentes esos números como precisión de JEV.
- **No calibres con una corrida en mock**: los umbrales resultantes no significan nada. La skill `calibrar-umbrales` lo advierte.
- **Los lotes son idempotentes por `lote`:** reenviar el lote 3 de un run no duplica sus casos en `detalle`.
- **`npm run og` necesita Chromium** (`npx playwright install chromium` ya corrió en el Bootstrap). Si las fuentes no se encuentran, el script sigue con `system-ui` y avisa por consola: la imagen sale igual.
- **Las compuertas de revisión no son opcionales:** sin la línea exacta `Hallazgos críticos abiertos: 0` el paso 16 y el 20 no están hechos.

## Before moving on

- [ ] Cada tarea de esta épica está `done` en `tasks.json`; ninguna quedó `in_progress`.
- [ ] Todos los comandos de `verify` de cada tarea pasaron, no solo el primero.
- [ ] Ningún `verify` se editó y ninguno se saltó porque faltara un archivo.
- [ ] Cada tarea tiene su tag de checkpoint en git (`git tag -l 'step-*'`).
- [ ] La compuerta pasa limpia desde la raíz del proyecto.
- [ ] Cada contrato «Produced» existe con la firma indicada.
- [ ] Ningún archivo fuera del árbol se modificó.
- [ ] `.dev.vars.example` está al día si la épica agregó una variable (si no, esta épica no agrega ninguna).
- [ ] Un commit por tarea, con el id de la tarea en el mensaje y el tag después.
