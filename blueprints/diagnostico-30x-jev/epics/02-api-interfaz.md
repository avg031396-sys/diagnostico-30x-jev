# Epic 02: API del diagnóstico e interfaz pública

> La persona puede recorrer el diagnóstico completo en el navegador (contacto, perfil, etapa, reto, chips, seguimientos) y llegar a una tarjeta de resultado compartible en `/r/<id>`, con la API, la seguridad y las pruebas de punta a punta.

| | |
|---|---|
| **Epic id** | `02-api-interfaz` |
| **Tasks** | `E2-T1` … `E2-T7` |
| **Depends on** | `01-base-motor-jev` |
| **Unlocks** | `03-og-qa-entrega` |
| **Parallel with** | ninguna (comparte `src/worker/app.ts` con `03-og-qa-entrega`) |

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
src/
  worker/
    esquemas.ts repositorio.ts diagnosticos.ts   # NUEVOS (paso 8)
    resultados.ts                                # NUEVO (paso 9)
    seguridad.ts                                 # NUEVO (paso 10): CSP, límite, errores, compararSeguro
    app.ts                                       # EDITA en 8, 9 y 10
  web/
    estilos.css comun.ts diagnostico.ts          # NUEVOS (paso 12)
    confirmacion.ts                              # NUEVO (paso 13); diagnostico.ts se edita
    resultado-vista.ts compartir.ts resultado.ts # NUEVOS (paso 14)
public/
  _headers                                       # NUEVO (paso 10)
index.html resultado.html                        # EDITAN (pasos 12 y 14)
tests/
  worker/seguridad.test.ts                       # NUEVO (paso 10)
  e2e/api-diagnosticos.spec.ts api-resultados.spec.ts       # NUEVOS (pasos 8, 9)
  e2e/inicio.spec.ts confirmacion.spec.ts resultado.spec.ts # NUEVOS (pasos 12, 13, 14)
docs/revisiones/
  03-api-abogado.md 03-api-cyber-neo.md          # NUEVOS (paso 11)
```

Todo lo que esté fuera de este árbol queda fuera de alcance. Si una tarea parece exigir editar un archivo que no aparece aquí, detente y repórtalo: el borde de la épica está mal.

## Data model touched here

| Entity | Fields this epic adds or reads | Notes |
|---|---|---|
| `leads` | escribe: `token`, contacto, `consentimiento`, `perfil`, `etapa`, `edad_hijo`, `reto`, `jev_*`, `llamadas_jev`, `dolores_*`, `respuestas_seguimiento`, `programa_top`, `fit_top`, `requiere_revision`, `quiere_asesor`, `resultado_id`, `estado` | `token` es único (22 caracteres); `llamadas_jev` va de 0 a 2 |
| `resultados` | escribe y lee: `id` (10 caracteres), `nombre_pila`, `tipo`, `requiere_revision`, `programa_id`, `fit`, `detalle` (JSON) | pública; NUNCA lleva correo, WhatsApp ni empresa |

Solo `src/worker/repositorio.ts` toca estas dos tablas.

## Contracts

**Consumed** — ya existe, no lo reconstruyas:

| From | Interface | Guarantee |
|---|---|---|
| `01-base-motor-jev` | `resolverResultado(entrada, umbrales)` | devuelve `pendiente` con preguntas, o el resultado final; nunca lanza por datos del usuario |
| `01-base-motor-jev` | `crearClienteJev`, `evaluarConReintento`, `construirPreguntas`, `construirEstado` | un solo cliente por `JEV_MODE`; el reintento no cuenta como llamada |
| `01-base-motor-jev` | `detectarDolores`, `necesitaAclaracion`, `doloresTrasAclaracion` | puras |
| `01-base-motor-jev` | `PERFILES`, `ETAPAS`, `PROGRAMAS`, `DOLORES_CHIP`, `DOLORES_ACLARACION`, `METAS` | textos visibles de la interfaz |

**Produced** — las épicas siguientes dependen exactamente de esto. Cambiarlo las rompe:

| Export | Signature | Used by |
|---|---|---|
| `POST /api/diagnosticos` | 201 `{ token, dolores_detectados, necesita_aclaracion, seguimientos, ranking_preliminar }` · 400 `VALIDACION` · 429 `LIMITE_EXCEDIDO` · 502 `JEV_NO_DISPONIBLE` | `web`, `03` |
| `POST /api/diagnosticos/:token/aclarar` | 200 (misma forma) · 404 · 409 `YA_HUBO_ACLARACION` | `web` |
| `POST /api/diagnosticos/:token/finalizar` | 200 `{ pendiente: true, seguimientos }` o `{ pendiente: false, resultado_id, resultado }` | `web` |
| `POST /api/diagnosticos/:token/asesor` | 204 | `web` |
| `GET /api/resultados/:id` | 200 `{ id, nombre_pila, tipo, requiere_revision, programa_top, ranking, familias, chips, created_at }` | `web`, `/r` |
| `GET /r/:id` | HTML de `resultado.html` con meta OG por programa | redes sociales |
| `src/worker/seguridad.ts` → `compararSeguro`, `CSP` | `(a, b) => boolean` | `03` (token de QA) |

## Conventions that bite in this area

- **Una sola forma de error:** `{ error: { code, message } }`. Códigos: `VALIDACION` 400, `NO_AUTORIZADO` 401, `NO_ENCONTRADO` 404, `YA_HUBO_ACLARACION` 409, `LIMITE_EXCEDIDO` 429, `ERROR_INTERNO` 500, `JEV_NO_DISPONIBLE` 502 al crear o 409 al finalizar un lead en error. Nunca un stack ni el nombre de una excepción.
- **Toda entrada pasa por zod** (`src/worker/esquemas.ts`) antes de tocar lógica. SQL solo con `prepare` y `bind`.
- **Datos personales:** nunca en logs, nunca a JEV, nunca en `/api/resultados` ni en `/r/<id>`. Del token se loguean como mucho 4 caracteres.
- **Máximo 2 llamadas lógicas a JEV por diagnóstico** (`leads.llamadas_jev`). `aclarar` se puede usar una sola vez.
- **Nada de scripts inline ni `style=""` en el HTML** (la CSP los bloquea). Todo texto que viene del servidor entra con `textContent`, nunca con `innerHTML`.
- **La persona nunca ve un error técnico ni la palabra «revisión».** Si JEV falla: mensaje amable y botón «Habla con un asesor de 30X».
- **Las e2e corren con `LIMITE_ACTIVO=0`** (lo pasa `playwright.config.ts`) para que la suite no se bloquee a sí misma.

Reglas completas del proyecto: `CLAUDE.md`. Reglas por área: `.claude/rules/*.md`. Ambos están en la raíz del proyecto (el Bootstrap los copió desde `workspace/`).

---

## Tasks

En el mismo orden que `tasks.json`. Ese orden es el orden de construcción: no lo reordenes por prioridad ni por lo que se vea más rápido.

### `E2-T1` — API POST /api/diagnosticos y /aclarar con D1 y JEV

**Depends on:** `E1-T7` · **Priority:** p0 — metadato para recortar alcance, no un orden de ejecución · **Paso 08**

Primera mitad de la API. Todo el contrato está en este bloque.

Contrato común de errores: toda respuesta de error es `{ error: { code, message } }`, sin stack ni nombre de excepción. Códigos y estado HTTP: `VALIDACION` 400 (con `campos`), `NO_AUTORIZADO` 401, `NO_ENCONTRADO` 404, `YA_HUBO_ACLARACION` 409, `LIMITE_EXCEDIDO` 429, `ERROR_INTERNO` 500, `JEV_NO_DISPONIBLE` 502 (al crear) o 409 (al finalizar un lead en error). Las respuestas de éxito son el objeto descrito en cada ruta, sin envoltura. Un diagnóstico hace como máximo 2 llamadas lógicas a JEV (`leads.llamadas_jev`); el reintento interno no cuenta.

1. `src/worker/esquemas.ts` (zod 4):
   - `crearDiagnostico`: `contacto { nombre: 2-80, email: email ≤ 120, whatsapp: /^\+?[0-9 ()-]{7,20}$/, empresa?: ≤ 120 }`,
     `consentimiento: z.literal(true)`, `perfil` (5), `etapa?` (5), `edad_hijo?` entero 10-25,
     `reto` texto recortado de 40 a 1200. Refinamiento: con `padre_madre_next` exige `edad_hijo` y
     prohíbe `etapa`; con cualquier otro perfil exige `etapa`.
   - `aclarar`: `dolores` (1 a 6 ids de familia, únicos) y `metas` (0 a 5 ids de `METAS`, únicos).
   - `finalizar`: `dolores_confirmados` (0 a 10 ids de `DOLORES_CHIP`, únicos) y
     `respuestas_seguimiento?` (objeto; cada clave es un id de pregunta de `seguimientos.json` y cada
     valor un id de sus opciones).
   - `token`: `/^[A-Za-z0-9_-]{22}$/`; `resultado_id`: `/^[0-9A-Za-z]{10}$/`.
   - Validación fallida → 400 `{ error: { code: "VALIDACION", message: "Revisa los datos del formulario.", campos: [rutas] } }`.
     Cada ruta valida con `zValidator("json", esquema, alFallar)` de `@hono/zod-validator` (y `zValidator("param", esquemaToken)` para `:token`),
     con un `alFallar` común que devuelve ese 400.
2. `src/worker/repositorio.ts`: `crearLead`, `obtenerLead`, `guardarAclaracion`, `guardarConfirmacion`,
   `completarLead` (inserta en `resultados` y actualiza `leads` en un solo `db.batch`), `marcarAsesor`,
   `obtenerResultado`. Todas con `prepare` y `bind`. `obtenerResultado` selecciona columnas
   explícitas de `resultados` solamente.
3. `src/worker/diagnosticos.ts` (sub-app Hono montada en `/api/diagnosticos`):
   - `configJevDesdeEnv(env)` → `ConfigJev` (una variable vacía cuenta como ausente: usa `valor || undefined`; `JEV_MODE`, `JEV_MODEL`, `JEV_MODEL_COMPOSIO`,
     `COMPOSIO_API_KEY`, `COMPOSIO_OPENROUTER_ACCOUNT_ID`, `COMPOSIO_JEV_ACCOUNT_ID`).
   - `POST /`: valida → `construirEstado` (sin contacto) → `construirPreguntas(perfil)` →
     `evaluarConReintento`. Token = 16 bytes de `crypto.getRandomValues` en base64url sin relleno
     (22 caracteres). Si JEV falla: guarda el lead con `estado` `error`, `llamadas_jev` 1,
     `jev_error` = código del `JevError`, y responde 502
     `{ error: { code: "JEV_NO_DISPONIBLE", message: "Tuvimos un problema al analizar tu reto." }, token }`.
     Si responde: guarda el lead `en_curso`, `llamadas_jev` 1, `jev_respuestas` (JSON de
     `RespuestasJev`), `jev_modo`, `jev_modelo`, `latencia_ms`, `costo_usd` y responde 201
     `{ token, dolores_detectados: [{ id, etiqueta, valor }], necesita_aclaracion, seguimientos, ranking_preliminar }`
     (con todos los dolores detectados como confirmados: `seguimientos` = las preguntas que devuelve
     `resolverResultado` con `respuestas_seguimiento: null`, o `[]` si no hay pendiente; `ranking_preliminar` =
     `{ programa_top, ranking }` de `resolverResultado` con `respuestas_seguimiento: {}`).
   - `POST /:token/aclarar`: 404 si no existe; 409 `YA_HUBO_ACLARACION` si `llamadas_jev` ≥ 2.
     Segunda llamada con `dolores_elegidos` (etiquetas de `DOLORES_ACLARACION` de las familias
     elegidas) y `metas_elegidas` (etiquetas de `METAS`). Guarda `llamadas_jev` 2, reemplaza
     `jev_respuestas`, suma `latencia_ms` y `costo_usd`, guarda `dolores_elegidos`/`metas_elegidas`
     (ids). Responde 200 con la misma forma que el 201, con `dolores_detectados` =
     `doloresTrasAclaracion` y `necesita_aclaracion` false siempre (no hay tercera llamada).
   - Log por diagnóstico: `console.log(JSON.stringify({ evento, token: token.slice(0, 4), modo, latencia_ms, costo_usd }))`.
     Nada de contacto ni reto.
4. `src/worker/app.ts`: `app.route("/api/diagnosticos", diagnosticos)` y un `app.onError` que
   responde 500 `{ error: { code: "ERROR_INTERNO", message: "Algo salió mal. Intenta de nuevo." } }`.
5. `tests/e2e/api-diagnosticos.spec.ts`: fixture `request`; un `test` por criterio. Correos
   `prueba-<n>@example.com`. Reto de ventas: `Vendo por referidos y no tengo un proceso comercial ordenado. Ya facturo unos USD 300 mil al año.`
   con `perfil` `founder` y `etapa` `arrancando`. Reto vago:
   `Quiero mejorar en general y que todo vaya mejor el próximo año con mi negocio actual.` con `etapa` `mvp`.

**Files**
- `src/worker/esquemas.ts` — nuevo — esquemas zod de todas las entradas
- `src/worker/repositorio.ts` — nuevo — consultas D1 de `leads` y `resultados`
- `src/worker/diagnosticos.ts` — nuevo — rutas `/api/diagnosticos` y `/:token/aclarar`
- `src/worker/app.ts` — editar — monta las rutas y el `onError` básico
- `tests/e2e/api-diagnosticos.spec.ts` — nuevo — API contra `wrangler dev` en mock

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** `POST /api/diagnosticos` recibe un cuerpo válido con el reto de ventas en modo mock **THE SYSTEM SHALL** responder 201 con un `token` de 22 caracteres base64url, `dolores_detectados` que incluye `{id: "bloqueo_comercial", etiqueta: "Pocas ventas"}` y `necesita_aclaracion` false.
2. **WHEN** el cuerpo no trae `consentimiento: true` o el `reto` tiene menos de 40 caracteres **THE SYSTEM SHALL** responder 400 con `error.code` `VALIDACION`.
3. **WHEN** el reto es vago (sin palabras clave del mock) **THE SYSTEM SHALL** responder `necesita_aclaracion` true; **WHEN** después llega `POST /api/diagnosticos/:token/aclarar` con dolores `["capital"]` y metas `["levantar_capital"]` **THE SYSTEM SHALL** responder 200 con `dolores_detectados` que incluye `busca_capital`.
4. **WHEN** `aclarar` se llama por segunda vez con el mismo token **THE SYSTEM SHALL** responder 409 con `error.code` `YA_HUBO_ACLARACION`; **WHEN** el token no existe **THE SYSTEM SHALL** responder 404 con `error.code` `NO_ENCONTRADO`.
5. **WHEN** el reto contiene `simular falla de jev` **THE SYSTEM SHALL** responder 502 con `error.code` `JEV_NO_DISPONIBLE` y un `token`, y guardar el lead con `estado` `error` y `jev_error` no nulo.
6. **WHEN** las pruebas terminan **THE SYSTEM SHALL** tener en la D1 local al menos un lead con `llamadas_jev` 2 y al menos un lead con `estado` `error` y `jev_error` no nulo.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
npm run test:e2e -- tests/e2e/api-diagnosticos.spec.ts   # expect: exit 0, 0 failed
npx wrangler d1 execute DB --local --json --command "SELECT CASE WHEN count(*) >= 1 THEN 'si' ELSE 'no' END AS hay FROM leads WHERE llamadas_jev = 2" > .wrangler/llamadas.json   # expect: exit 0
grep -Eq '"hay": ?"si"' .wrangler/llamadas.json   # expect: exit 0 — hubo una segunda llamada guardada
npx wrangler d1 execute DB --local --json --command "SELECT CASE WHEN count(*) >= 1 THEN 'si' ELSE 'no' END AS hay FROM leads WHERE estado = 'error' AND jev_error IS NOT NULL" > .wrangler/errores.json   # expect: exit 0
grep -Eq '"hay": ?"si"' .wrangler/errores.json   # expect: exit 0 — la falla de JEV quedó registrada
npm run test:e2e -- tests/e2e/salud.spec.ts   # expect: exit 0 — el gate del paso 1 sigue en verde
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 08: API POST /api/diagnosticos y /aclarar con D1 y JEV" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-08-api-diagnosticos
# rollback target si el paso 09 sale mal: git reset --hard step-08-api-diagnosticos
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E2-T2` — API finalizar, asesor, resultados públicos y /r con meta OG

**Depends on:** `E2-T1` · **Priority:** p0 — metadato para recortar alcance, no un orden de ejecución · **Paso 09**

Segunda mitad de la API: la decisión final, el clic de asesor y la tarjeta pública.

1. `POST /api/diagnosticos/:token/finalizar` (`src/worker/diagnosticos.ts`): 404 si no existe.
   Si el lead ya está `completo`: 200 con el mismo `{ resultado_id, resultado }` (idempotente).
   Si está `error`: 409 `{ error: { code: "JEV_NO_DISPONIBLE", message: "Tuvimos un problema al analizar tu reto." } }`. Si no: guarda
   `dolores_confirmados`, corre `resolverResultado` con las `jev_respuestas` guardadas.
   - `pendiente` → 200 `{ pendiente: true, seguimientos }` (cada pregunta con `id`, `texto`,
     `opciones` y `solo_si` si aplica). No crea resultado.
   - final → `resultado_id` = 10 caracteres base62 (`crypto.getRandomValues` con rechazo de bytes
     ≥ 248), `nombre_pila` = primera palabra de `nombre` (máx. 40 caracteres). En un `db.batch`:
     inserta `resultados` y actualiza el lead (`estado` `completo`, `respuestas_seguimiento`,
     `programa_top`, `fit_top`, `confianza_choice`, `requiere_revision`, `resultado_id`).
     Responde 200 `{ pendiente: false, resultado_id, resultado }` con `resultado` en la forma pública de abajo.
2. `POST /api/diagnosticos/:token/asesor`: 404 si no existe; `quiere_asesor = 1`; 204 sin cuerpo.
   Sirve también para leads en `error`. Nunca llama a nada externo.
3. `src/worker/resultados.ts`:
   - `GET /api/resultados/:id` → 200
     `{ id, nombre_pila, tipo, requiere_revision, programa_top, ranking, familias, chips, created_at }`
     (`programa_top` y cada fila de `ranking` con `id`, `nombre`, `url`, `fit`, `etiqueta`,
     `cumple_requisito`, `condicion_pendiente`). 404 `NO_ENCONTRADO` si no existe o el id no es válido.
   - `GET /r/:id` → busca el resultado; si no existe, `env.ASSETS.fetch(new URL("/404", c.req.url))`
     con estado 404. Si existe, `env.ASSETS.fetch(new URL("/resultado", c.req.url))` y un
     `HTMLRewriter` que cambia `<title>` y agrega al final de `<head>`:
     `og:title` «Mi ruta en 30X: <Programa>» (o «Hablemos de tu caso en 30X» si tipo `conversacion`),
     `og:description` «Diagnóstico 30X con JEV · <etiqueta o «ruta preliminar»>», `og:image`
     `<origen>/og/<id del programa>.png` (o `<origen>/og/default.png`), `og:url` `<origen>/r/<id>`,
     `og:type` `website`, `twitter:card` `summary_large_image`. Todo valor pasa por un escape de
     atributo HTML (`&`, `"`, `<`, `>`). Con `html_handling: "auto-trailing-slash"`, `/resultado`
     sirve `resultado.html` sin redirección.
4. `src/worker/app.ts`: `app.route("/api/resultados", resultados)` y `app.get("/r/:id", paginaResultado)`.
5. `tests/e2e/api-resultados.spec.ts`: crea un diagnóstico con el reto de ventas (`founder`,
   `arrancando`, nombre `Alonso Valdés`), recorre los seis criterios y verifica `nombre_pila` `Alonso`.
   El sexto criterio incluye el lead en error: se crea con el reto `simular falla de jev`, la API
   responde 502 con `token`, y `finalizar` con ese token responde 409 con `error.code` `JEV_NO_DISPONIBLE`.

**Files**
- `src/worker/diagnosticos.ts` — editar — `/:token/finalizar` y `/:token/asesor`
- `src/worker/resultados.ts` — nuevo — `GET /api/resultados/:id` y `GET /r/:id` con HTMLRewriter
- `src/worker/repositorio.ts` — editar — consultas de finalizar, asesor y resultado público
- `src/worker/app.ts` — editar — monta `/api/resultados` y `/r`
- `tests/e2e/api-resultados.spec.ts` — nuevo — finalizar, asesor, resultado y /r

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** `POST /api/diagnosticos/:token/finalizar` llega sin `respuestas_seguimiento` para el reto de ventas **THE SYSTEM SHALL** responder 200 `{pendiente: true, seguimientos}` (arreglo de preguntas) cuya primera pregunta tiene id `cliente`.
2. **WHEN** se vuelve a llamar con `respuestas_seguimiento` `{cliente: "b2b", reuniones: "menos_20"}` **THE SYSTEM SHALL** responder 200 con un `resultado_id` de 10 caracteres base62 distinto del token y `resultado.programa_top.id` `Sales_Machine`.
3. **WHEN** se pide `GET /api/resultados/:id` **THE SYSTEM SHALL** responder 200 con `nombre_pila` y sin las claves `email`, `whatsapp`, `empresa` ni `token`; **WHEN** el id no existe **THE SYSTEM SHALL** responder 404.
4. **WHEN** se pide `GET /r/:id` **THE SYSTEM SHALL** responder 200 en HTML con `og:title`, `og:description`, `og:image` igual a `<origen>/og/Sales_Machine.png`, `og:url` y `twitter:card` `summary_large_image`; **WHEN** el id no existe **THE SYSTEM SHALL** responder 404.
5. **WHEN** se llama `POST /api/diagnosticos/:token/asesor` **THE SYSTEM SHALL** responder 204 y dejar `quiere_asesor` en 1 para ese lead.
6. **WHEN** `finalizar` se llama otra vez después de completado **THE SYSTEM SHALL** devolver el mismo `resultado_id`; **WHEN** se llama sobre un lead con `estado` `error` (reto con `simular falla de jev`) **THE SYSTEM SHALL** responder 409 con `error.code` `JEV_NO_DISPONIBLE`.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
npm run test:e2e -- tests/e2e/api-resultados.spec.ts   # expect: exit 0, 0 failed
npx wrangler d1 execute DB --local --json --command "SELECT CASE WHEN count(*) >= 1 THEN 'si' ELSE 'no' END AS hay FROM leads WHERE quiere_asesor = 1 AND resultado_id IS NOT NULL" > .wrangler/asesor.json   # expect: exit 0
grep -Eq '"hay": ?"si"' .wrangler/asesor.json   # expect: exit 0 — el clic de asesor quedó guardado
npx wrangler d1 execute DB --local --json --command "PRAGMA table_info(resultados)" > .wrangler/columnas.json   # expect: exit 0
grep -Eq '"name": ?"nombre_pila"' .wrangler/columnas.json   # expect: exit 0 — la salida del PRAGMA es real
grep -Eq '"name": ?"(email|whatsapp|empresa)"' .wrangler/columnas.json; test $? -eq 1   # expect: código 1 = sin columnas de contacto; 2 = archivo ilegible y falla
npm run test:e2e -- tests/e2e/api-diagnosticos.spec.ts   # expect: exit 0 — el gate del paso 8 sigue en verde
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 09: API finalizar, asesor, resultados públicos y /r con meta OG" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-09-api-resultados
# rollback target si el paso 10 sale mal: git reset --hard step-09-api-resultados
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E2-T3` — Cabeceras de seguridad, CSP, límite y errores sin stack

**Depends on:** `E2-T2` · **Priority:** p0 — metadato para recortar alcance, no un orden de ejecución · **Paso 10**

Endurece el Worker sin romper ningún gate anterior: las e2e corren con `LIMITE_ACTIVO:0`.

1. `src/worker/seguridad.ts` (importa de `hono` solo tipos y `type { Bindings } from "./app.ts"`):
   - `export const CSP = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";`
     Va en UNA sola línea, entre comillas dobles. `'unsafe-inline'` en estilos solo porque html-to-image
     clona estilos en línea al generar la imagen; los scripts siguen siendo solo `'self'`.
   - Middleware `cabeceras` que pone en toda respuesta: `Content-Security-Policy: CSP`,
     `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
     `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`.
   - Middleware `limitarDiagnosticos`: actúa solo si `c.req.method === "POST"` y
     `c.req.path.startsWith("/api/diagnosticos")`. Si `c.env.LIMITE_ACTIVO !== "0"`:
     `await c.env.LIMITE_DIAGNOSTICO.limit({ key: c.req.header("CF-Connecting-IP") ?? "sin-ip" })`;
     `success` false → 429 `{ error: { code: "LIMITE_EXCEDIDO", message: "Recibimos muchas solicitudes desde tu conexión. Espera un minuto y vuelve a intentarlo." } }`.
   - `manejarError(err, c)`: `console.error(JSON.stringify({ evento: "error", ruta: c.req.path, tipo: err.name }))`
     y 500 `{ error: { code: "ERROR_INTERNO", message: "Algo salió mal. Intenta de nuevo." } }`.
   - `compararSeguro(a, b)`: codifica ambos con `TextEncoder`, recorre `max(largo)` bytes acumulando
     XOR y la diferencia de largo; devuelve `diferencia === 0`. Puro: lo prueba Vitest en Node.
2. `src/worker/app.ts`: `app.use("*", cabeceras)`, luego `app.use("*", limitarDiagnosticos)`, luego
   las rutas; `app.onError(manejarError)` reemplaza el del paso 8.
3. `public/_headers` (la línea `Content-Security-Policy:` lleva literalmente la cadena de `CSP`;
   Static Assets aplica este archivo a los estáticos, incluida la página 404, y `tests/e2e/salud.spec.ts` lo exige):

   ```
   /*
     Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin
     Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
   ```

4. `tests/worker/seguridad.test.ts` (proyecto `tsconfig.json`, sin `node:fs`): `app.request(ruta, init, env)`
   con env falso `{ JEV_MODE: "mock", JEV_MODEL: "typesafe/jev-1.14", LIMITE_ACTIVO, LIMITE_DIAGNOSTICO: { limit: vi.fn() } }`
   (con `as unknown as Bindings`). Un `it` por criterio salvo el de `_headers`.
5. `tests/e2e/salud.spec.ts` (se edita): agrega un `test` que pide `GET /`, `GET /no-existe` y `GET /api/salud`
   y comprueba que las tres respuestas traen la cabecera `content-security-policy` con exactamente el mismo
   valor (la de `/` y `/no-existe` sale de `public/_headers`; la de `/api/salud`, de la constante `CSP`) y que
   `x-content-type-options` es `nosniff`. Esto prueba la copia en `_headers` en el runtime real, sin leer archivos.

**Files**
- `src/worker/seguridad.ts` — nuevo — constante `CSP`, cabeceras, límite de peticiones, `manejarError`, `compararSeguro()`
- `src/worker/app.ts` — editar — registra cabeceras, límite y el `onError` definitivo
- `public/_headers` — nuevo — mismas cabeceras para los archivos estáticos
- `tests/worker/seguridad.test.ts` — nuevo — cabeceras, límite, errores y comparación segura
- `tests/e2e/salud.spec.ts` — editar — los estáticos y la API devuelven la misma `CSP`

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** `app.request("/api/salud")` corre en Vitest **THE SYSTEM SHALL** incluir `Content-Security-Policy` igual a la constante `CSP`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`.
2. **WHEN** `npm run test:e2e -- tests/e2e/salud.spec.ts` pide `GET /`, `GET /no-existe` y `GET /api/salud` a `wrangler dev` **THE SYSTEM SHALL** recibir en las tres la cabecera `content-security-policy` con exactamente la misma cadena, tomada de `public/_headers` en las dos primeras y de la constante `CSP` en la tercera.
3. **WHEN** el binding `LIMITE_DIAGNOSTICO` responde `{success: false}` y `LIMITE_ACTIVO` es `1` **THE SYSTEM SHALL** responder a `POST /api/diagnosticos` con 429, `error.code` `LIMITE_EXCEDIDO` y el mensaje `Recibimos muchas solicitudes desde tu conexión. Espera un minuto y vuelve a intentarlo.`, sin llamar a JEV ni a D1.
4. **WHEN** `LIMITE_ACTIVO` es `0` **THE SYSTEM SHALL** no consultar el binding `LIMITE_DIAGNOSTICO`.
5. **WHEN** un handler lanza una excepción (env de prueba sin `DB`) **THE SYSTEM SHALL** responder 500 con `error.code` `ERROR_INTERNO` y sin `TypeError`, `Error:` ni líneas que empiecen con `at ` en el cuerpo.
6. **WHEN** `compararSeguro` compara cadenas iguales, distintas del mismo largo y de distinto largo **THE SYSTEM SHALL** devolver true, false y false.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm test -- tests/worker/seguridad.test.ts   # expect: exit 0, 0 failed
npm test   # expect: exit 0, 0 failed — todas las unitarias
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
npm run test:e2e -- tests/e2e/salud.spec.ts   # expect: exit 0 — incluye que `/`, `/no-existe` y `/api/salud` devuelvan la misma CSP
npm run test:e2e -- tests/e2e/api-diagnosticos.spec.ts   # expect: exit 0 — LIMITE_ACTIVO:0 en e2e, el límite no la bloquea
npm run test:e2e -- tests/e2e/api-resultados.spec.ts   # expect: exit 0 — la CSP no rompe /r
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 10: Cabeceras de seguridad, CSP, límite y errores sin stack" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-10-api-seguridad
# rollback target si el paso 11 sale mal: git reset --hard step-10-api-seguridad
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E2-T4` — Revisión del bloque API (compuerta)

**Depends on:** `E2-T3` · **Priority:** p0 — metadato para recortar alcance, no un orden de ejecución · **Paso 11**

Compuerta pedida por Alonso. Sigue `.claude/skills/revision-seguridad/SKILL.md`.

1. Alcance: `src/worker/`, `migrations/`, `public/_headers`, `wrangler.jsonc`, `tests/e2e/api-*.spec.ts`.
2. `anthropic-skills:abogado-del-diablo`: abuso del endpoint público (costo de JEV), máximo de 2
   llamadas, idempotencia de `finalizar`, leads en `error`, qué pasa si D1 falla a mitad del `batch`,
   datos personales que pudieran filtrarse a `/r` o a logs.
3. `cyber-neo`: OWASP sobre la API — validación, inyección SQL, XSS en la meta OG, CSP, tokens
   predecibles, rate limit con `CF-Connecting-IP`, mensajes de error, secretos.
4. Guarda, corrige críticos y altos con su prueba, y cierra con `Hallazgos críticos abiertos: 0`.

**Files**
- `docs/revisiones/03-api-abogado.md` — nuevo — salida de anthropic-skills:abogado-del-diablo
- `docs/revisiones/03-api-cyber-neo.md` — nuevo — salida de cyber-neo
- `src/worker/**` — editar solo si un hallazgo crítico o alto lo exige
- `migrations/**` — solo un archivo nuevo si un hallazgo lo exige (nunca editar 0001)

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** el paso termina **THE SYSTEM SHALL** tener `docs/revisiones/03-api-abogado.md` con la línea `Herramienta: anthropic-skills:abogado-del-diablo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
2. **WHEN** el paso termina **THE SYSTEM SHALL** tener `docs/revisiones/03-api-cyber-neo.md` con la línea `Herramienta: cyber-neo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
3. **WHEN** se lee cada documento **THE SYSTEM SHALL** contener la tabla de hallazgos con la cabecera `| # | Severidad | Hallazgo | Estado | Corrección |`.
4. **WHEN** `npm run typecheck`, `npm run lint`, `npm test` y `npm run test:e2e` corren después de las correcciones **THE SYSTEM SHALL** salir con 0, con 0 pruebas fallidas.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
test -f docs/revisiones/03-api-abogado.md   # expect: exit 0
test -f docs/revisiones/03-api-cyber-neo.md   # expect: exit 0
grep -Eq '^Herramienta: (anthropic-skills:abogado-del-diablo|revisión manual \(skill no disponible\))$' docs/revisiones/03-api-abogado.md   # expect: exit 0
grep -Eq '^Herramienta: (cyber-neo|revisión manual \(skill no disponible\))$' docs/revisiones/03-api-cyber-neo.md   # expect: exit 0
grep -qF '| # | Severidad | Hallazgo | Estado | Corrección |' docs/revisiones/03-api-abogado.md   # expect: exit 0
grep -qF '| # | Severidad | Hallazgo | Estado | Corrección |' docs/revisiones/03-api-cyber-neo.md   # expect: exit 0
grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/03-api-abogado.md   # expect: exit 0
grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/03-api-cyber-neo.md   # expect: exit 0
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
npm test   # expect: exit 0, 0 failed
npm run test:e2e   # expect: exit 0, 0 failed — todas las e2e escritas hasta aquí
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 11: Revisión del bloque API (compuerta)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-11-revision-api
# rollback target si el paso 12 sale mal: git reset --hard step-11-revision-api
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E2-T5` — Interfaz: tokens, contacto y pasos 1 a 3 con el medidor

**Depends on:** `E2-T4` · **Priority:** p0 — metadato para recortar alcance, no un orden de ejecución · **Paso 12**

Primera mitad de la interfaz. TypeScript sin framework; una pregunta por pantalla.

1. `src/web/estilos.css`: empieza con este bloque, tal cual (variables de diseño, regla de movimiento reducido y foco visible). Ningún hex ni px suelto fuera de él:
```css
:root {
  /* Colores: un solo tema oscuro */
  --bg: #000000;
  --primary: #E9FF7B;
  --primary-fg: #000000;
  --surface: #272917;
  --fg: #FAFAFA;
  --fg-muted: #999999;
  --fg-muted-claro: #5C5C5C;
  --border: #999999;
  --divider: #3A3B2A;
  --destructive: #FF6B6B;
  --white: #FFFFFF;

  /* Tipografía */
  --font-titulo: "Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-cuerpo: "Inter Tight Variable", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-acento: "Instrument Serif", Georgia, serif;
  --texto-12: 12px;
  --texto-14: 14px;
  --texto-16: 16px;
  --texto-20: 20px;
  --texto-24: 24px;
  --texto-32: 32px;
  --texto-40: 40px;
  --texto-56: 56px;

  /* Espaciado (base 4 px) */
  --espacio-1: 4px;
  --espacio-2: 8px;
  --espacio-3: 12px;
  --espacio-4: 16px;
  --espacio-6: 24px;
  --espacio-8: 32px;
  --espacio-12: 48px;
  --espacio-16: 64px;

  /* Radios */
  --radio-pildora: 999px;
  --radio-tarjeta: 24px;
  --radio-campo: 12px;

  /* Anchos */
  --ancho-columna: 640px;
  --ancho-qa: 960px;

  /* Movimiento */
  --duracion-paso: 200ms;
  --duracion-hover: 150ms;
  --curva: cubic-bezier(0.2, 0, 0, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duracion-paso: 0ms;
    --duracion-hover: 0ms;
  }
}

:focus-visible {
  outline: 3px solid var(--primary);
  outline-offset: 2px;
}
```
   Después, los componentes: `.boton` (píldora; `.boton--primario` lima con texto negro; `.boton--secundario`
   borde crema), `.opcion` (píldora seleccionable de 48px de alto), `.chip` (con botón de quitar de
   24×24 px mínimo), `.tarjeta` (oliva `#272917`, radio 24px), `.campo` (radio 12px, borde `#999999`,
   etiqueta visible arriba, error en `#FF6B6B` debajo), `.medidor` (barra lima sobre `#3A3B2A`).
   Foco: `:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }`.
   Título con acento: `<h1>Diagnóstico 30X con <em class="acento">JEV</em></h1>`, `.acento` en
   Instrument Serif itálica lima.
2. `src/web/comun.ts`: importa `@fontsource-variable/inter`, `@fontsource-variable/inter-tight`,
   `@fontsource/instrument-serif/400-italic.css` y `./estilos.css`. Exporta `el(tag, attrs, hijos)`,
   `api(ruta, cuerpo)` (fetch JSON a la misma origen; devuelve `{ estado, cuerpo }` sin lanzar),
   `medidor(actual, total)` (actualiza `aria-valuenow`, `aria-valuemax` y el texto «Paso n de N»),
   `transicion(contenedor, render)` (opacidad + 8px, 200ms) y `anunciar(texto)` (región `aria-live="polite"`).
3. `src/web/diagnostico.ts`: estado en memoria `{ contacto, perfil, etapa, edad_hijo, reto, token, respuesta }`.
   - Paso 0 «Antes de empezar»: `Nombre`, `Correo`, `WhatsApp`, `Empresa (opcional)` y casilla
     «Acepto que guarden mis datos para recibir mi diagnóstico (lee el aviso de privacidad)» con
     enlace a `/privacidad.html`. `Empezar` valida en el navegador; nada sale al servidor.
   - Paso 1 «¿Cuál es tu punto de partida?»: los 5 `PERFILES` de `src/motor/catalogo.ts`.
   - Paso 2 «¿En qué etapa está tu negocio?»: las 5 `ETAPAS`; con `padre_madre_next`,
     «Edad de tu hijo/a» (`input type="number"` min 10 max 25).
   - Paso 3 «¿Qué te está frenando hoy y qué quieres lograr en 12 meses?»: `textarea` 40-1200,
     contador `n/1200`, tres ejemplos tocables:
     «Vendo por referidos y no tengo un proceso comercial ordenado. Quiero duplicar mis ventas este año.» ·
     «Mi operación es un caos: apago incendios todo el día y todo depende de mí. Quiero que el negocio funcione sin mí.» ·
     «Quiero que mi equipo adopte inteligencia artificial y no sé por dónde empezar ni cómo medirlo.»
     Botón `Analizar mi reto` → estado «JEV está leyendo tu reto…» → 1 `POST /api/diagnosticos`.
   - Medidor: pasos 1 a 3 visibles como «Paso n de 5» (el total baja a 4 cuando no hay seguimiento;
     lo ajusta el paso 13). El paso 0 no muestra medidor.
   - 201 → guarda `token` y respuesta y muestra el encabezado `Esto entendí de tu reto` (el paso 13
     completa esa pantalla). 502 → `Tuvimos un problema al analizar tu reto` + botón
     `Habla con un asesor de 30X` (`POST /api/diagnosticos/<token>/asesor`, luego
     «Listo, un asesor te contactará»). 429 → muestra el `message` del error. 400 → «Revisa los datos del formulario».
4. `index.html`: conserva título, meta y pie; `main#contenido` queda vacío para la app y agrega
   `<script type="module" src="/src/web/diagnostico.ts"></script>` al final del `body`.
5. `tests/e2e/inicio.spec.ts`: cuenta peticiones con `page.on("request")`; Tab con `page.keyboard`;
   lee `outline-style` y `outline-width` con `getComputedStyle`.

**Files**
- `src/web/estilos.css` — nuevo — tokens y componentes (píldoras, chips, tarjetas, medidor)
- `src/web/comun.ts` — nuevo — fuentes, helpers de DOM, `api()`, medidor, transiciones
- `src/web/diagnostico.ts` — nuevo — máquina de pasos 0 a 3 y envío a la API
- `index.html` — editar — monta la app y carga `src/web/diagnostico.ts`
- `tests/e2e/inicio.spec.ts` — nuevo — pasos 0 a 3, error de JEV, teclado

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** la persona pulsa `Empezar` con nombre, correo o WhatsApp vacíos o sin marcar el consentimiento **THE SYSTEM SHALL** mostrar un error en texto junto a cada campo faltante y no enviar ninguna petición a `/api/`.
2. **WHEN** el paso 0 es válido **THE SYSTEM SHALL** mostrar `¿Cuál es tu punto de partida?` con las 5 opciones `Fundador/a`, `Ejecutivo/a`, `Represento una empresa`, `Tengo un hijo/a adolescente (13-18)` e `Independiente / consultor`, y un `progressbar` con `aria-valuenow` 1.
3. **WHEN** se elige `Tengo un hijo/a adolescente (13-18)` **THE SYSTEM SHALL** pedir `Edad de tu hijo/a` (número de 10 a 25) en lugar de la etapa; **WHEN** se elige otro perfil **THE SYSTEM SHALL** mostrar las 5 etapas.
4. **WHEN** el reto tiene menos de 40 caracteres **THE SYSTEM SHALL** mantener deshabilitado `Analizar mi reto` y mostrar el contador con el formato `n/1200`; **WHEN** se toca un ejemplo **THE SYSTEM SHALL** copiar su texto al campo.
5. **WHEN** se envía el reto **THE SYSTEM SHALL** hacer exactamente 1 `POST /api/diagnosticos`; **WHEN** la API responde 502 (reto con `simular falla de jev`) **THE SYSTEM SHALL** mostrar `Tuvimos un problema al analizar tu reto` y el botón `Habla con un asesor de 30X`.
6. **WHEN** se navega con Tab **THE SYSTEM SHALL** dar al control enfocado un `outline-style` distinto de `none` y un `outline-width` de al menos 2px, y el pie `Prototipo para el Hackatón 30X · no oficial · código abierto en GitHub` SHALL estar visible.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
npm run build   # expect: exit 0
npm run test:e2e -- tests/e2e/inicio.spec.ts   # expect: exit 0, 0 failed
npm run test:e2e -- tests/e2e/salud.spec.ts   # expect: exit 0 — la portada conserva `Diagnóstico 30X con JEV`
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 12: Interfaz: tokens, contacto y pasos 1 a 3 con el medidor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-12-ui-inicio
# rollback target si el paso 13 sale mal: git reset --hard step-12-ui-inicio
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E2-T6` — Interfaz: chips, aclaración y seguimientos (pasos 4 y 5)

**Depends on:** `E2-T5` · **Priority:** p0 — metadato para recortar alcance, no un orden de ejecución · **Paso 13**

Lo que reemplaza la pregunta «elige tu programa» de 30X: confirmar lo que JEV entendió.

1. `src/web/confirmacion.ts` exporta `mostrarConfirmacion(contenedor, estado, alTerminar)`:
   - Si `necesita_aclaracion` es false: título `Esto entendí de tu reto`; un chip por
     `dolores_detectados` (botón con `aria-label` «Quitar <etiqueta>»); `+ agregar` despliega los
     demás `DOLORES_CHIP` como botones para sumar; `Confirmar` llama
     `POST /api/diagnosticos/<token>/finalizar` con `{ dolores_confirmados }` (sin `respuestas_seguimiento`).
   - Si es true: título `Ayúdanos a entenderte mejor`; grupo «¿Qué te duele hoy?» con los 6
     `DOLORES_ACLARACION` y grupo «¿Qué quieres lograr en 12 meses?» con las 5 `METAS`, todos
     `button` con `aria-pressed`. `Continuar` (exige al menos un dolor) → 1 `POST /api/diagnosticos/<token>/aclarar` →
     usa todos los `dolores_detectados` de la respuesta como confirmados → `finalizar`.
   - `finalizar` → `pendiente: true`: una pregunta por pantalla (paso 5), opciones como `.opcion`;
     una pregunta con `solo_si` aparece solo si la respuesta previa coincide. Al terminar,
     `finalizar` otra vez con `respuestas_seguimiento` (objeto, aunque quede vacío).
   - `pendiente: false` → `alTerminar(resultado_id)`.
2. `src/web/diagnostico.ts`: tras el 201 llama a `mostrarConfirmacion`. Medidor: paso 4 en la
   confirmación o aclaración; si `finalizar` pide seguimientos, total 5 y paso 5; si no, total 4.
   `alTerminar(id)`: `sessionStorage.setItem("diag:" + id, token)` y `location.assign("/r/" + id)`.
3. `tests/e2e/confirmacion.spec.ts`: reto de ventas con `Fundador/a` + `Ya factura, arrancando`;
   reto vago con `MVP sin facturar`: `Quiero mejorar en general y que todo vaya mejor el próximo año con mi negocio actual.`
   Cuenta peticiones con `page.on("request")`.

**Files**
- `src/web/confirmacion.ts` — nuevo — pantalla «Esto entendí», aclaración y seguimientos
- `src/web/diagnostico.ts` — editar — conecta los pasos 4 y 5 y la salida a `/r/<id>`
- `tests/e2e/confirmacion.spec.ts` — nuevo — chips, aclaración, seguimientos, navegación

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** se envía el reto de ventas **THE SYSTEM SHALL** mostrar `Esto entendí de tu reto` con los chips `Pocas ventas` y `Vendes solo por referidos`, cada uno con su botón de quitar, y `+ agregar` SHALL listar los otros 8 dolores.
2. **WHEN** se pulsa `Confirmar` **THE SYSTEM SHALL** llamar a `finalizar` sin respuestas de seguimiento y mostrar `¿Le vendes a empresas o a personas?`; **WHEN** se elige `A empresas` **THE SYSTEM SHALL** mostrar `¿Cuántas reuniones de venta tienes por semana?`.
3. **WHEN** se envía el reto vago **THE SYSTEM SHALL** mostrar `Ayúdanos a entenderte mejor` con los 6 botones de dolor y los 5 de meta como interruptores con `aria-pressed`.
4. **WHEN** la persona elige `Necesito inversión` y `Levantar capital` y continúa **THE SYSTEM SHALL** hacer exactamente 1 `POST` a `/aclarar` y ningún segundo `POST /api/diagnosticos`.
5. **WHEN** terminan los seguimientos **THE SYSTEM SHALL** navegar a `/r/<resultado_id>` con un id de 10 caracteres y guardar el token en `sessionStorage` bajo la clave `diag:<resultado_id>`.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
npm run build   # expect: exit 0
npm run test:e2e -- tests/e2e/confirmacion.spec.ts   # expect: exit 0, 0 failed
npm run test:e2e -- tests/e2e/inicio.spec.ts   # expect: exit 0 — el gate del paso 12 sigue en verde
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 13: Interfaz: chips, aclaración y seguimientos (pasos 4 y 5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-13-ui-confirmacion
# rollback target si el paso 14 sale mal: git reset --hard step-13-ui-confirmacion
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E2-T7` — Interfaz: tarjeta de resultado, escala, asesor y compartir

**Depends on:** `E2-T6` · **Priority:** p0 — metadato para recortar alcance, no un orden de ejecución · **Paso 14**

La tarjeta oscura estilo 30X (inspirada en hackathon.30x.com/ai-builder). Es la pantalla que se comparte.

1. `src/web/resultado-vista.ts` exporta `renderResultado(contenedor, resultado, { token })`:
   - tipo `recomendado`: `<h1>` «<Nombre>, tu programa es <Programa>»; círculo lima con
     `Math.round(fit * 100)` + `%` y `etiqueta`; «Te lo recomendamos porque mencionaste:» + chips;
     botón principal `Conocer <Programa>` (enlace a su URL, `target="_blank" rel="noopener"`) y
     secundario `Habla con un asesor de 30X`.
   - tipo `preliminar`: `<h1>` «Tu ruta preliminar: <Programa>», leyenda «Un asesor de 30X confirma
     tu ruta», el botón de asesor pasa a principal y `Conocer <Programa>` a secundario.
   - tipo `conversacion`: «Hablemos: tu caso merece una conversación», botón de asesor y enlace a
     `https://30x.com/programas`.
   - Escala: cada fila de `ranking` con nombre, %, barra (`style.setProperty("--ancho", porcentaje)`) y la
     leyenda de requisito si `cumple_requisito` es false. Barras por familia: las 6, con su valor en %.
   - El botón de asesor solo aparece si hay token. Pulsado: `POST /api/diagnosticos/<token>/asesor`; 204 → «Listo, un
     asesor de 30X te contactará» queda como «Listo, un asesor te contactará» (texto exacto) en
     `aria-live`. Nunca abre WhatsApp ni llama a nada de 30X.
   - Ningún texto visible contiene la palabra «revisión».
2. `src/web/compartir.ts`: `enlacesCompartir(url, programa)` → LinkedIn
   `https://www.linkedin.com/sharing/share-offsite/?url=<url>`, X
   `https://twitter.com/intent/tweet?text=<texto>&url=<url>`, WhatsApp `https://wa.me/?text=<texto + url>`
   (todo con `encodeURIComponent`; texto: «Mi ruta en 30X es <Programa>. Haz tu diagnóstico:»).
   `copiarEnlace(url)` con `navigator.clipboard.writeText` y aviso «Enlace copiado».
   `descargarImagen(nodo, programa)` con `toPng` de html-to-image y un `<a download="diagnostico-30x-<programa>.png">`.
3. `src/web/resultado.ts`: importa `./comun.ts`; toma el id de `location.pathname` (`/r/<id>`),
   `GET /api/resultados/<id>`; 404 → «No encontramos este resultado» + enlace a `/`. Token =
   `sessionStorage.getItem("diag:" + id)`. Sin token: en lugar del asesor, botón «Haz tu diagnóstico» a `/`.
4. `resultado.html`: agrega `<script type="module" src="/src/web/resultado.ts"></script>` al final del `body`.
5. `tests/e2e/resultado.spec.ts`: recorre el flujo por la interfaz con nombre `Alonso Valdés`;
   permisos de portapapeles con `context.grantPermissions(["clipboard-read", "clipboard-write"])`;
   la descarga con `page.waitForEvent("download")`; la vista pública con `browser.newContext()`.

**Files**
- `src/web/resultado-vista.ts` — nuevo — render de la tarjeta, escala y barras por familia
- `src/web/compartir.ts` — nuevo — enlaces de compartir, copiar y descargar imagen
- `src/web/resultado.ts` — nuevo — entrada de `resultado.html` (lee `/r/<id>`)
- `resultado.html` — editar — carga `src/web/resultado.ts`
- `tests/e2e/resultado.spec.ts` — nuevo — resultado, preliminar, compartir, vista pública

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** termina el flujo de ventas con `A empresas` y `Menos de 20` **THE SYSTEM SHALL** mostrar `Alonso, tu programa es Sales Machine`, un círculo con `85%`, la etiqueta `Muy recomendado` y bajo `Te lo recomendamos porque mencionaste:` los chips confirmados.
2. **WHEN** hay otros programas con fit de 0.40 o más **THE SYSTEM SHALL** listarlos en la escala de mayor a menor con nombre, %, barra y, si no cumplen el requisito, `tu reto coincide, pero aún no cumples: <condición>`; y SHALL mostrar una barra por cada una de las 6 familias.
3. **WHEN** se muestra `Conocer Sales Machine` **THE SYSTEM SHALL** enlazar a `https://30x.com/programas/sales-machine`; **WHEN** se pulsa `Habla con un asesor de 30X` **THE SYSTEM SHALL** hacer `POST /api/diagnosticos/<token>/asesor`, recibir 204 y mostrar `Listo, un asesor te contactará`.
4. **WHEN** se generan los enlaces de compartir **THE SYSTEM SHALL** usar `https://www.linkedin.com/sharing/share-offsite/?url=`, `https://twitter.com/intent/tweet?text=` con `url`, `https://wa.me/?text=` sin número y `Copiar enlace` con `<origen>/r/<id>`; **WHEN** se pulsa `Descargar imagen` **THE SYSTEM SHALL** disparar una descarga cuyo nombre termina en `.png`.
5. **WHEN** un perfil `corporativo` con etapa `consolidada` envía `Somos una empresa de logística y queremos vender más a clientes nuevos con un proceso claro este año.` **THE SYSTEM SHALL** mostrar `Tu ruta preliminar: Sales Machine`, la leyenda `Un asesor de 30X confirma tu ruta`, el botón de asesor como principal y ninguna aparición de la palabra `revisión`.
6. **WHEN** el mismo `/r/<id>` se abre en un contexto nuevo sin `sessionStorage` **THE SYSTEM SHALL** mostrar el nombre de pila y el programa, ocultar el botón de asesor y no contener el correo de la persona.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
npm run build   # expect: exit 0
npm run test:e2e -- tests/e2e/resultado.spec.ts   # expect: exit 0, 0 failed
npm run test:e2e -- tests/e2e/confirmacion.spec.ts   # expect: exit 0 — el gate del paso 13 sigue en verde
npm run test:e2e -- tests/e2e/api-resultados.spec.ts   # expect: exit 0 — /r sigue sirviendo meta OG
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 14: Interfaz: tarjeta de resultado, escala, asesor y compartir" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-14-ui-resultado
# rollback target si el paso 15 sale mal: git reset --hard step-14-ui-resultado
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

---

## Epic acceptance

La épica está hecha cuando cada tarea está `done` **y**:

1. **WHEN** la persona recorre en el navegador el flujo de ventas (contacto, `Fundador/a`, `Ya factura, arrancando`, reto, `Confirmar`, `A empresas`, `Menos de 20`) **THE SYSTEM SHALL** terminar en `/r/<id>` con el título `Alonso, tu programa es Sales Machine`.
2. **WHEN** JEV falla (reto con `simular falla de jev`) **THE SYSTEM SHALL** mostrar `Tuvimos un problema al analizar tu reto` con el botón `Habla con un asesor de 30X` y guardar el lead con `estado` `error`.

```bash
npm run typecheck && npm run lint && npm test
npm run test:e2e
```

Corre desde la raíz del proyecto. Ambos criterios los deciden estos comandos.

## Pitfalls

- **`/r/<id>` y `/api/*` corren primero en el Worker** (`run_worker_first`); todo lo demás lo sirven los archivos estáticos. Si `/r/<id>` devuelve el 404 estático, revisa ese arreglo en `wrangler.jsonc`.
- **`html_handling: "auto-trailing-slash"`** hace que `/privacidad.html` redirija a `/privacidad`; los enlaces y las pruebas deben tolerar esa redirección. El Worker pide `/resultado` (sin redirección) a `ASSETS`.
- **El estado local de D1 se acumula entre corridas.** Las pruebas e2e no cuentan filas: comprueban propiedades de lo que ellas mismas crearon.
- **La CSP prohíbe scripts inline.** Cualquier `<script>` sin `src` o atributo `onclick=` rompe la página en silencio; Playwright lo ve como un botón que no hace nada.
- **Los reintentos de JEV no cuentan para el tope de 2**, pero cada reintento alarga la respuesta; el tiempo máximo por intento es 8 s.

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
