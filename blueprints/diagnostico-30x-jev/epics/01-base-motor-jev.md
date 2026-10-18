# Epic 01: Base, motor de decisión y cliente JEV

> Existe un Worker que responde de verdad, una base D1 con su esquema, un motor de decisión puro probado con Vitest y un cliente JEV con sus tres adaptadores (mock, composio-proxy, composio-jev).

| | |
|---|---|
| **Epic id** | `01-base-motor-jev` |
| **Tasks** | `E1-T1` … `E1-T7` |
| **Depends on** | nada — empieza aquí |
| **Unlocks** | `02-api-interfaz`, `03-og-qa-entrega` |
| **Parallel with** | ninguna: todo el repositorio depende de esta épica |

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
migrations/
  0001_inicial.sql              # NUEVO (paso 1): tablas leads, resultados y qa_runs
src/
  worker/
    app.ts                      # NUEVO (paso 1): app Hono, tipo Bindings, GET /api/salud
    index.ts                    # NUEVO (paso 1): entry del Worker (main de wrangler.jsonc)
  motor/
    catalogo.ts                 # NUEVO (paso 2): programas, familias, dolores, metas
    tipos.ts requisitos.ts ranking.ts      # NUEVOS (paso 3)
    dolores.ts seguimientos.ts resultado.ts # NUEVOS (paso 4)
  jev/
    tipos.ts preguntas.ts       # NUEVOS (paso 2)
    cliente.ts mock.ts mock-keywords.ts    # NUEVOS (paso 5); cliente.ts se edita en el paso 6
    proxy.ts composio-jev.ts    # NUEVOS (paso 6)
  data/
    insumos-jev.json            # EXISTE (llegó con workspace/): SOLO LECTURA
    umbrales.json               # NUEVO (paso 2)
    seguimientos.json           # NUEVO (paso 4)
tests/
  seguridad/secretos.test.ts    # NUEVO (paso 1)
  e2e/salud.spec.ts             # NUEVO (paso 1)
  jev/preguntas.test.ts mock.test.ts adaptadores.test.ts   # NUEVOS (pasos 2, 5, 6)
  motor/ranking.test.ts flujo.test.ts                      # NUEVOS (pasos 3, 4)
  fixtures/openrouter-decision.json                        # NUEVO (paso 6)
docs/revisiones/
  02-motor-jev-abogado.md 02-motor-jev-cyber-neo.md        # NUEVOS (paso 7)
```

Todo lo que esté fuera de este árbol queda fuera de alcance. Si una tarea parece exigir editar un archivo que no aparece aquí, detente y repórtalo: el borde de la épica está mal.

## Data model touched here

| Entity | Fields this epic adds or reads | Notes |
|---|---|---|
| `leads` | se crea completa en el paso 1 | privada; ninguna ruta la lee todavía |
| `resultados` | se crea completa en el paso 1 | pública, sin datos de contacto |
| `qa_runs` | se crea completa en el paso 1 | la usa la épica 03 |

El esquema completo es el SQL del paso 1 (`migrations/0001_inicial.sql`). Una vez comiteado no se edita.

## Contracts

**Consumed** — ya existe, no lo reconstruyas:

| From | Interface | Guarantee |
|---|---|---|
| `workspace/` (Bootstrap) | `package.json` scripts, `wrangler.jsonc`, `playwright.config.ts`, `vite.config.ts`, tsconfig, `biome.json` | ya están en la raíz; no los escribes |
| `workspace/` (Bootstrap) | `src/data/insumos-jev.json` | 33 preguntas, 60 casos, 6 familias, requisitos por programa; solo lectura |

**Produced** — las épicas siguientes dependen exactamente de esto. Cambiarlo las rompe:

| Export | Signature | Used by |
|---|---|---|
| `src/worker/app.ts` → `app`, `Bindings` | `Hono<{ Bindings: Bindings }>` | `02-api-interfaz` |
| `src/jev/preguntas.ts` → `construirPreguntas`, `construirEstado` | `(perfil) => PreguntasJev` · `(entrada) => EstadoJev` | `02`, `03` |
| `src/jev/cliente.ts` → `crearClienteJev`, `evaluarConReintento` | `(config, fetchFn?) => JevClient` · `(cliente, estado, preguntas) => Promise<EvaluacionJev>` | `02`, `03` |
| `src/motor/resultado.ts` → `resolverResultado` | `(entrada, umbrales) => { pendiente: true, seguimientos } \| { pendiente: false, resultado, confianza_choice }` | `02`, `03` |
| `src/motor/dolores.ts` → `detectarDolores`, `necesitaAclaracion`, `doloresTrasAclaracion`, `familiasDe` | funciones puras sobre los Noul | `02` |
| `src/motor/catalogo.ts` | `PERFILES`, `ETAPAS`, `PROGRAMAS`, `FAMILIAS`, `DOLORES_CHIP`, `DOLORES_ACLARACION`, `METAS` | `02`, `03` |

## Conventions that bite in this area

- **El motor es puro.** `src/motor/` y `src/qa/` no usan `fetch`, `console`, `Date.now()`, `crypto`, D1 ni DOM. Los umbrales entran por parámetro.
- **Nunca viaja nada personal a JEV.** El estado sale solo de `construirEstado()` (7 claves). Nunca nombre, correo, WhatsApp ni empresa, ni el campo `evidencia` de los insumos.
- **Imports relativos con extensión `.ts`** y JSON con `with { type: "json" }`: así los resuelve Node al correr `scripts/`, y también wrangler, Vite, Vitest y tsc.
- **Sintaxis borrable.** Nada de `enum`, `namespace` ni propiedades de parámetro; los tipos se importan con `import type`.
- **Ninguna prueba hace red.** El `fetch` se inyecta (`vi.fn()`); el modo por defecto es `mock`.
- **Comparaciones de umbral:** `>=` para recomendar, mostrar y Choice; `>` estricto para dolor y vaga; `<` para `delta_hermanos`.

Reglas completas del proyecto: `CLAUDE.md`. Reglas por área: `.claude/rules/*.md`. Ambos están en la raíz del proyecto (el Bootstrap los copió desde `workspace/`).

---

## Tasks

En el mismo orden que `tasks.json`. Ese orden es el orden de construcción: no lo reordenes por prioridad ni por lo que se vea más rápido.

### `E1-T1` — Worker Hono con /api/salud, esquema D1 y test de secretos

**Depends on:** nada · **Priority:** p0 — metadato para recortar alcance, no un orden de ejecución · **Paso 01**

Primer paso con código. Deja el Worker corriendo de verdad desde el inicio: si `wrangler.jsonc`,
`vite.config.ts` y el entry no concuerdan, falla aquí y no siete pasos después. Todos los archivos de
configuración (`package.json`, `wrangler.jsonc`, `vite.config.ts`, `playwright.config.ts`, tsconfig, Biome) ya
llegaron con la copia de `workspace/` del Bootstrap: este paso NO los escribe ni los edita.

**1. `src/worker/app.ts`** — app Hono, tipo `Bindings`, `GET /api/salud` y 404 JSON en `/api/*`:
```ts
import { Hono } from "hono";

// Variables y secretos que lee el Worker. `Env` es global: lo genera `wrangler types` en
// worker-configuration.d.ts (D1 `DB`, `ASSETS`, `LIMITE_DIAGNOSTICO` y las variables de wrangler.jsonc).
// Los secretos de Composio y QA_TOKEN no están en wrangler.jsonc, por eso se declaran opcionales aquí.
export type Bindings = Env & {
  QA_TOKEN?: string;
  COMPOSIO_API_KEY?: string;
  COMPOSIO_OPENROUTER_ACCOUNT_ID?: string;
  COMPOSIO_JEV_ACCOUNT_ID?: string;
  JEV_MODEL_COMPOSIO?: string;
};

export const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/salud", (c) => c.json({ ok: true, modo: c.env.JEV_MODE }));

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json(
      { error: { code: "NO_ENCONTRADO", message: "No encontramos lo que buscas." } },
      404,
    );
  }
  return c.text("No encontrado", 404);
});
```

**2. `src/worker/index.ts`** — entry del Worker (es el `main` de `wrangler.jsonc`):
```ts
import { app } from "./app.ts";

export default app;
```

**3. `migrations/0001_inicial.sql`** — esquema D1 completo, escrito a mano. Cópialo tal cual. No uses `wrangler d1 migrations create`:
```sql
-- Esquema inicial de Diagnóstico 30X con JEV.
-- Escrito a mano. Una vez comiteado no se edita: un cambio de esquema es un archivo nuevo.
-- Las fechas son texto ISO 8601 en UTC. Los campos que guardan JSON son TEXT.

-- Tarjeta pública de resultado. NUNCA lleva datos de contacto.
CREATE TABLE resultados (
  id TEXT PRIMARY KEY CHECK (length(id) = 10),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  nombre_pila TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('recomendado', 'preliminar', 'conversacion')),
  requiere_revision INTEGER NOT NULL DEFAULT 0 CHECK (requiere_revision IN (0, 1)),
  programa_id TEXT,
  fit REAL,
  detalle TEXT NOT NULL
);

-- Lead privado: contacto, consentimiento, respuestas de JEV y resultado. Nunca se expone por HTTP.
CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE CHECK (length(token) = 22),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  estado TEXT NOT NULL DEFAULT 'en_curso' CHECK (estado IN ('en_curso', 'completo', 'error')),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  empresa TEXT,
  consentimiento INTEGER NOT NULL CHECK (consentimiento = 1),
  consentimiento_at TEXT NOT NULL,
  perfil TEXT NOT NULL,
  etapa TEXT,
  edad_hijo INTEGER,
  reto TEXT NOT NULL,
  dolores_elegidos TEXT,
  metas_elegidas TEXT,
  dolores_confirmados TEXT,
  respuestas_seguimiento TEXT,
  jev_modo TEXT,
  jev_modelo TEXT,
  jev_respuestas TEXT,
  jev_error TEXT,
  llamadas_jev INTEGER NOT NULL DEFAULT 0 CHECK (llamadas_jev BETWEEN 0 AND 2),
  latencia_ms INTEGER NOT NULL DEFAULT 0,
  costo_usd REAL NOT NULL DEFAULT 0,
  programa_top TEXT,
  fit_top REAL,
  confianza_choice REAL,
  requiere_revision INTEGER NOT NULL DEFAULT 0 CHECK (requiere_revision IN (0, 1)),
  quiere_asesor INTEGER NOT NULL DEFAULT 0 CHECK (quiere_asesor IN (0, 1)),
  resultado_id TEXT REFERENCES resultados (id)
);

CREATE INDEX idx_leads_creado ON leads (created_at);

-- Corridas de QA sobre los casos de prueba de insumos-jev.json.
CREATE TABLE qa_runs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  estado TEXT NOT NULL DEFAULT 'en_curso' CHECK (estado IN ('en_curso', 'cerrado')),
  modo TEXT NOT NULL,
  modelo TEXT NOT NULL,
  umbrales TEXT NOT NULL,
  lotes_total INTEGER NOT NULL,
  lotes_procesados TEXT NOT NULL DEFAULT '[]',
  total INTEGER,
  evaluables INTEGER,
  aciertos_top1 INTEGER,
  aciertos_top3 INTEGER,
  latencia_p50 INTEGER,
  latencia_p95 INTEGER,
  costo_total REAL,
  detalle TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_qa_runs_estado_fecha ON qa_runs (estado, created_at);
```

**4. `tests/seguridad/secretos.test.ts`** — Vitest en Node. Escanea `src/`, `public/`, `scripts/`, `migrations/` y los archivos sueltos de la raíz (salta `.dev.vars`, `.env*`, `worker-configuration.d.ts`, `package-lock.json` y binarios). Un `it` por patrón prohibido; si falla, el mensaje trae archivo y línea:
```ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Escanea el código que se publica y falla si aparece algo que nunca debe llegar al repo:
// el webhook de 30X, claves reales, cabeceras con valor literal o un teléfono de 30X.
const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const CARPETAS = ["src", "public", "scripts", "migrations"];
const BINARIOS = new Set([".png", ".jpg", ".jpeg", ".ico", ".woff", ".woff2"]);
const SALTAR_EN_RAIZ = new Set(["worker-configuration.d.ts", "package-lock.json"]);

const PATRONES: { nombre: string; regex: RegExp }[] = [
  { nombre: "webhook de Apps Script", regex: /script\.google\.com\/macros/i },
  { nombre: "clave de OpenRouter", regex: /sk-or-[A-Za-z0-9_-]{8,}/ },
  { nombre: "clave de Composio", regex: /\bak_[A-Za-z0-9_-]{8,}/ },
  {
    nombre: "x-api-key con valor literal",
    regex: /x-api-key["']?\s*[:=]\s*["'][^"'\s]{8,}["']/i,
  },
  { nombre: "Bearer literal", regex: /Bearer\s+[A-Za-z0-9._~+/=-]{20,}/ },
  { nombre: "teléfono +57 literal", regex: /\+57[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}/ },
];

function archivosDe(carpeta: string): string[] {
  if (!existsSync(carpeta)) {
    return [];
  }
  const salida: string[] = [];
  for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name !== "node_modules") {
        salida.push(...archivosDe(ruta));
      }
    } else if (!BINARIOS.has(extname(entrada.name).toLowerCase())) {
      salida.push(ruta);
    }
  }
  return salida;
}

function archivosSueltosDeLaRaiz(): string[] {
  return readdirSync(RAIZ, { withFileTypes: true })
    .filter((e) => e.isFile())
    .filter((e) => !e.name.startsWith(".env") && e.name !== ".dev.vars")
    .filter((e) => !SALTAR_EN_RAIZ.has(e.name))
    .filter((e) => !BINARIOS.has(extname(e.name).toLowerCase()))
    .map((e) => join(RAIZ, e.name));
}

const ARCHIVOS = [
  ...CARPETAS.flatMap((c) => archivosDe(join(RAIZ, c))),
  ...archivosSueltosDeLaRaiz(),
];

describe("secretos y datos que nunca deben llegar al repo", () => {
  it("revisa al menos un archivo", () => {
    expect(ARCHIVOS.length).toBeGreaterThan(0);
  });

  for (const { nombre, regex } of PATRONES) {
    it(`no hay ${nombre}`, () => {
      const coincidencias: string[] = [];
      for (const archivo of ARCHIVOS) {
        const lineas = readFileSync(archivo, "utf8").split(/\r?\n/);
        for (const [i, linea] of lineas.entries()) {
          if (regex.test(linea)) {
            coincidencias.push(`${relative(RAIZ, archivo)}:${i + 1}`);
          }
        }
      }
      expect(coincidencias).toEqual([]);
    });
  }
});
```

**5. `tests/e2e/salud.spec.ts`** — Playwright contra `wrangler dev`, que levanta el `webServer` de `playwright.config.ts` (build, migraciones locales y Worker en el puerto 8787 con `JEV_MODE=mock`):
```ts
import { expect, test } from "@playwright/test";

// Corre contra `wrangler dev` (lo arranca playwright.config.ts) con JEV_MODE=mock.
test("GET /api/salud responde ok y el modo mock", async ({ request }) => {
  const respuesta = await request.get("/api/salud");
  expect(respuesta.status()).toBe(200);
  expect(await respuesta.json()).toEqual({ ok: true, modo: "mock" });
});

test("la portada es un archivo estático con el título del sitio", async ({ request }) => {
  const respuesta = await request.get("/");
  expect(respuesta.status()).toBe(200);
  expect(await respuesta.text()).toContain("Diagnóstico 30X con JEV");
});

test("una ruta que no existe devuelve 404 con la página 404", async ({ request }) => {
  const respuesta = await request.get("/no-existe");
  expect(respuesta.status()).toBe(404);
  expect(await respuesta.text()).toContain("Esta página no existe");
});

test("una ruta /api inexistente devuelve el error JSON único", async ({ request }) => {
  const respuesta = await request.get("/api/no-existe");
  expect(respuesta.status()).toBe(404);
  expect(await respuesta.json()).toEqual({
    error: { code: "NO_ENCONTRADO", message: "No encontramos lo que buscas." },
  });
});
```

**6.** Corre `npm run format` una sola vez al final (deja todos los archivos al estilo de `biome.json`: 2 espacios, comillas dobles, ancho 100) y después los comandos de Verify.

**Plan B si wrangler rechaza `not_found_handling: "404-page"`** (con wrangler 4.151.1 funciona; esto es solo por si cambia la versión): `deploy:prueba` y `salud.spec.ts` fallan aquí. Es la única edición permitida de `wrangler.jsonc`: quita esa clave, pon `"run_worker_first": true` dentro de `assets` y agrega esto a `src/worker/app.ts` después de las rutas `/api`. Anótalo en el mensaje del commit.
```ts
// Plan B del paso 1: va en src/worker/app.ts, DESPUÉS de las rutas /api y /r (y antes de exportar la app).
// En wrangler.jsonc: quitar "not_found_handling" y poner "run_worker_first": true dentro de "assets".
app.get("*", async (c) => {
  const respuesta = await c.env.ASSETS.fetch(c.req.raw);
  if (respuesta.status !== 404) {
    return respuesta;
  }
  const pagina = await c.env.ASSETS.fetch(new URL("/404.html", c.req.url));
  return new Response(pagina.body, { status: 404, headers: pagina.headers });
});
```

**Files**
- `src/worker/app.ts` — nuevo — app Hono, tipo `Bindings`, `GET /api/salud`, 404 JSON en `/api/*`
- `src/worker/index.ts` — nuevo — entry del Worker que declara `wrangler.jsonc` (`main`)
- `migrations/0001_inicial.sql` — nuevo — esquema D1 completo, escrito a mano
- `tests/seguridad/secretos.test.ts` — nuevo — escaneo de patrones prohibidos
- `tests/e2e/salud.spec.ts` — nuevo — salud, portada y 404 contra `wrangler dev`

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** `npm run test:e2e -- tests/e2e/salud.spec.ts` pide `GET /api/salud` a `wrangler dev` **THE SYSTEM SHALL** responder 200 con el cuerpo `{"ok":true,"modo":"mock"}`.
2. **WHEN** esa misma suite pide `/` y `/no-existe` **THE SYSTEM SHALL** responder 200 con el texto `Diagnóstico 30X con JEV` y 404 con el texto `Esta página no existe`.
3. **WHEN** `npm run db:migrar` corre sobre la D1 local **THE SYSTEM SHALL** salir con 0 y dejar las tablas `leads`, `resultados` y `qa_runs` en `sqlite_master`.
4. **WHEN** `npm test -- tests/seguridad/secretos.test.ts` escanea `src/`, `public/`, `scripts/`, `migrations/` y los archivos de la raíz **THE SYSTEM SHALL** encontrar cero coincidencias de los patrones prohibidos y salir con 0.
5. **WHEN** `npm run typecheck`, `npm run lint` y `npm run build` corren **THE SYSTEM SHALL** salir con 0 cada uno.
6. **WHEN** `npm run deploy:prueba` corre (`wrangler deploy --dry-run`) **THE SYSTEM SHALL** empaquetar `src/worker/index.ts` con los assets de `./dist` y salir con 0.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0, sin errores ni avisos
npm run build   # expect: exit 0; existen dist/index.html y dist/404.html
npm run db:migrar   # expect: exit 0
npx wrangler d1 execute DB --local --json --command "SELECT name FROM sqlite_master WHERE type='table'" > .wrangler/tablas.json   # expect: exit 0
grep -Eq '"name": ?"leads"' .wrangler/tablas.json   # expect: exit 0 — la tabla existe
grep -Eq '"name": ?"resultados"' .wrangler/tablas.json   # expect: exit 0 — la tabla existe
grep -Eq '"name": ?"qa_runs"' .wrangler/tablas.json   # expect: exit 0 — la tabla existe
npm test -- tests/seguridad/secretos.test.ts   # expect: exit 0, 0 failed
npm run test:e2e -- tests/e2e/salud.spec.ts   # expect: exit 0, 0 failed — el Worker real corre y responde
npm run deploy:prueba   # expect: exit 0 — wrangler.jsonc, main y ./dist concuerdan
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 01: Worker Hono con /api/salud, esquema D1 y test de secretos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-01-base
git ls-files --error-unmatch package-lock.json   # expect: exit 0 — el lockfile quedó comiteado en este commit
# rollback target si el paso 02 sale mal: git reset --hard step-01-base
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E1-T2` — Catálogo, umbrales y armado de la llamada a JEV

**Depends on:** `E1-T1` · **Priority:** p0 — metadato para recortar alcance, no un orden de ejecución · **Paso 02**

Convierte los insumos en la llamada a JEV y fija el catálogo que usan el motor y la interfaz. Los cinco
archivos van completos aquí; `src/data/insumos-jev.json` ya está en el repo (llegó con `workspace/`) y no se toca.

**1. `src/motor/catalogo.ts`** — TypeScript escrito a mano, sin importar el JSON (la interfaz lo importa y no debe cargar 137 KB de insumos). Programas en el orden de las opciones del Choice; las 6 familias copian `familias_dolor`; los 10 dolores de chip; los botones de aclaración y las metas:
```ts
// Catálogo escrito a mano de lo que dicen los insumos (src/data/insumos-jev.json).
// No importa el JSON: la interfaz importa este archivo y no debe cargar 137 KB de insumos.
// tests/jev/preguntas.test.ts falla si este archivo y los insumos se separan.

export const PERFILES = [
  { id: "founder", etiqueta: "Fundador/a" },
  { id: "ejecutivo", etiqueta: "Ejecutivo/a" },
  { id: "corporativo", etiqueta: "Represento una empresa" },
  { id: "padre_madre_next", etiqueta: "Tengo un hijo/a adolescente (13-18)" },
  { id: "independiente", etiqueta: "Independiente / consultor" },
] as const;
export type Perfil = (typeof PERFILES)[number]["id"];

export const ETAPAS = [
  { id: "idea", etiqueta: "Tengo una idea", nivel: 0 },
  { id: "mvp", etiqueta: "MVP sin facturar", nivel: 1 },
  { id: "arrancando", etiqueta: "Ya factura, arrancando", nivel: 2 },
  { id: "creciendo", etiqueta: "Creciendo, quiero escalar", nivel: 3 },
  { id: "consolidada", etiqueta: "Empresa consolidada", nivel: 4 },
] as const;
export type Etapa = (typeof ETAPAS)[number]["id"];

export const ETAPA_NIVEL: Record<Etapa, number> = {
  idea: 0,
  mvp: 1,
  arrancando: 2,
  creciendo: 3,
  consolidada: 4,
};

export type IdFamilia =
  | "ventas"
  | "inteligencia_artificial"
  | "operacion"
  | "capital"
  | "growth"
  | "escala_y_estrategia";

// Los 10 Noul de dolor que abren una familia. Etiqueta = texto del chip que ve la persona.
export const DOLORES_CHIP = [
  { id: "bloqueo_comercial", etiqueta: "Pocas ventas", familia: "ventas" },
  { id: "ventas_por_referidos", etiqueta: "Vendes solo por referidos", familia: "ventas" },
  { id: "quiere_adoptar_ia", etiqueta: "Quieres adoptar IA", familia: "inteligencia_artificial" },
  {
    id: "tareas_repetitivas_ia",
    etiqueta: "Tareas repetitivas que podría hacer la IA",
    familia: "inteligencia_artificial",
  },
  { id: "operacion_desordenada", etiqueta: "Operación desordenada", familia: "operacion" },
  { id: "busca_capital", etiqueta: "Buscas inversión", familia: "capital" },
  { id: "dolor_growth", etiqueta: "Tu negocio no crece", familia: "growth" },
  { id: "dependencia_fundador", etiqueta: "Todo depende de ti", familia: "escala_y_estrategia" },
  { id: "busca_expansion", etiqueta: "Quieres expandirte", familia: "escala_y_estrategia" },
  {
    id: "dolor_equipo_talento",
    etiqueta: "Te falta equipo o talento",
    familia: "escala_y_estrategia",
  },
] as const satisfies readonly { id: string; etiqueta: string; familia: IdFamilia }[];
export type IdDolor = (typeof DOLORES_CHIP)[number]["id"];

// Los 17 programas, en el orden de las opciones del Choice de los insumos.
export const PROGRAMAS = [
  {
    id: "Inmersion_Ejecutiva",
    nombre: "Inmersión Ejecutiva",
    url: "https://30x.com/inmersivo",
    familias: ["escala_y_estrategia"],
  },
  {
    id: "Multipliers",
    nombre: "Multipliers",
    url: "https://30x.com/multipliers",
    familias: ["escala_y_estrategia"],
  },
  {
    id: "AI_for_Executives",
    nombre: "AI for Executives",
    url: "https://30x.com/ai-for-executives",
    familias: ["inteligencia_artificial"],
  },
  {
    id: "Operaciones_con_AI",
    nombre: "Operaciones con AI",
    url: "https://30x.com/operacionesconai",
    familias: ["operacion"],
  },
  {
    id: "Sales_Machine",
    nombre: "Sales Machine",
    url: "https://30x.com/programas/sales-machine",
    familias: ["ventas"],
  },
  {
    id: "AI_Sales",
    nombre: "AI Sales",
    url: "https://30x.com/programas/ai-sales",
    familias: ["ventas", "inteligencia_artificial"],
  },
  {
    id: "Fundraising_Fundamentals",
    nombre: "Fundraising Fundamentals",
    url: "https://30x.com/fundraising-fundamentals",
    familias: ["capital"],
  },
  { id: "Next", nombre: "NEXT", url: "https://30x.com/next", familias: [] },
  {
    id: "Raise_your_round",
    nombre: "Raise your Round",
    url: "https://30x.com/raise-your-round",
    familias: ["capital"],
  },
  {
    id: "Instagram_TikTok",
    nombre: "Instagram & TikTok",
    url: "https://30x.com/instagram-tiktok",
    familias: ["ventas"],
  },
  {
    id: "LinkedIn_Sales",
    nombre: "LinkedIn Sales",
    url: "https://30x.com/linkedin-sales",
    familias: ["ventas"],
  },
  {
    id: "Second_Brain",
    nombre: "Second Brain",
    url: "https://30x.com/ai-second-brain",
    familias: ["inteligencia_artificial"],
  },
  {
    id: "AI_for_Developers",
    nombre: "AI for Developers",
    url: "https://30x.com/ai-for-developers",
    familias: ["inteligencia_artificial"],
  },
  {
    id: "Growth_Rockstar",
    nombre: "Growth Rockstar",
    url: "https://30x.com/programas/growth-rockstar",
    familias: ["growth"],
  },
  {
    id: "Advanced_Strategy",
    nombre: "Advanced Strategy",
    url: "https://30x.com/programas/advanced-strategy",
    familias: ["growth"],
  },
  {
    id: "Xtreme_Growth",
    nombre: "Xtreme Growth",
    url: "https://30x.com/programas/xtreme-growth",
    familias: ["growth"],
  },
  {
    id: "Planes_Corporativos",
    nombre: "Planes Corporativos",
    url: "https://30x.com/planes-corporativos",
    familias: [],
  },
] as const satisfies readonly {
  id: string;
  nombre: string;
  url: string;
  familias: readonly IdFamilia[];
}[];
export type IdPrograma = (typeof PROGRAMAS)[number]["id"];

// Las 6 familias de `familias_dolor`: `dolores` = `se_activa_con`.
export const FAMILIAS = [
  {
    id: "ventas",
    nombre: "Ventas",
    dolores: ["bloqueo_comercial", "ventas_por_referidos"],
    programas: ["Sales_Machine", "LinkedIn_Sales", "AI_Sales", "Instagram_TikTok"],
  },
  {
    id: "inteligencia_artificial",
    nombre: "Inteligencia artificial",
    dolores: ["quiere_adoptar_ia", "tareas_repetitivas_ia"],
    programas: ["AI_for_Executives", "Second_Brain", "AI_for_Developers", "AI_Sales"],
  },
  {
    id: "operacion",
    nombre: "Operación",
    dolores: ["operacion_desordenada"],
    programas: ["Operaciones_con_AI"],
  },
  {
    id: "capital",
    nombre: "Capital",
    dolores: ["busca_capital"],
    programas: ["Fundraising_Fundamentals", "Raise_your_round"],
  },
  {
    id: "growth",
    nombre: "Growth",
    dolores: ["dolor_growth"],
    programas: ["Growth_Rockstar", "Advanced_Strategy", "Xtreme_Growth"],
  },
  {
    id: "escala_y_estrategia",
    nombre: "Escala y estrategia",
    dolores: ["dependencia_fundador", "busca_expansion", "dolor_equipo_talento"],
    programas: ["Inmersion_Ejecutiva", "Multipliers"],
  },
] as const satisfies readonly {
  id: IdFamilia;
  nombre: string;
  dolores: readonly IdDolor[];
  programas: readonly IdPrograma[];
}[];

// Botones de la pantalla «Ayúdanos a entenderte mejor» (cada dolor abre una familia).
export const DOLORES_ACLARACION = [
  { etiqueta: "Vendo poco o sin proceso", familia: "ventas" },
  { etiqueta: "No sé cómo usar IA", familia: "inteligencia_artificial" },
  { etiqueta: "Mi operación es un caos", familia: "operacion" },
  { etiqueta: "Necesito inversión", familia: "capital" },
  { etiqueta: "Mi negocio no crece", familia: "growth" },
  { etiqueta: "Todo depende de mí", familia: "escala_y_estrategia" },
] as const satisfies readonly { etiqueta: string; familia: IdFamilia }[];

export const METAS = [
  { id: "vender_mas", etiqueta: "Vender más" },
  { id: "levantar_capital", etiqueta: "Levantar capital" },
  { id: "liderar_equipo", etiqueta: "Liderar a mi equipo" },
  { id: "expandirme", etiqueta: "Expandirme" },
  { id: "ser_referente", etiqueta: "Ser referente" },
] as const;
export type IdMeta = (typeof METAS)[number]["id"];

export const URL_TODOS_LOS_PROGRAMAS = "https://30x.com/programas";

export function programaPorId(id: IdPrograma) {
  const programa = PROGRAMAS.find((p) => p.id === id);
  if (!programa) {
    throw new Error(`programa desconocido: ${id}`);
  }
  return programa;
}
```

**2. `src/jev/tipos.ts`** — tipos de la llamada, la interfaz `JevClient` y `JevError`:
```ts
import type { Etapa, Perfil } from "../motor/catalogo.ts";

export type ModoJev = "mock" | "composio-proxy" | "composio-jev";

// Forma de las preguntas que viajan a JEV (una por cada pregunta de `preguntas_jev`).
export type PreguntaJev =
  | { type: "noul"; instructions: string }
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] };
export type PreguntasJev = Record<string, PreguntaJev>;

// Lo ÚNICO que puede viajar a JEV sobre la persona. Nunca nombre, correo, WhatsApp ni empresa.
export type EstadoJev = {
  perfil: Perfil;
  etapa?: Etapa;
  etapa_nivel?: number;
  edad_hijo?: number;
  reto_principal: string;
  dolores_elegidos?: string[];
  metas_elegidas?: string[];
};

export type RespuestasJev = {
  noul: Record<string, number>;
  choice: { valor: string; confianza: number } | null;
  score: { valor: number; confianza: number } | null;
};

export type EvaluacionJev = {
  answers: RespuestasJev;
  usage: { input_tokens: number; cost: number };
  latencia_ms: number;
  modelo: string;
};

export interface JevClient {
  evaluar(estado: EstadoJev, preguntas: PreguntasJev): Promise<EvaluacionJev>;
}

export type CodigoJevError = "JEV_CONFIG" | "JEV_HTTP" | "JEV_TIMEOUT" | "JEV_FORMATO";

export class JevError extends Error {
  codigo: CodigoJevError;

  constructor(codigo: CodigoJevError, mensaje: string) {
    super(mensaje);
    this.name = "JevError";
    this.codigo = codigo;
  }
}
```

**3. `src/jev/preguntas.ts`** — arma las preguntas desde los insumos (nunca copia `evidencia`, `fuente_pagina`, `mide` ni `programa`) y arma el estado de la persona con solo 7 claves:
```ts
import insumos from "../data/insumos-jev.json" with { type: "json" };
import type { Etapa, Perfil } from "../motor/catalogo.ts";
import { ETAPA_NIVEL } from "../motor/catalogo.ts";
import type { EstadoJev, PreguntasJev } from "./tipos.ts";

type PreguntaInsumo = {
  id: string;
  tipo: "noul" | "choice" | "score";
  afirmacion?: string;
  pregunta?: string;
  opciones?: { id: string; descripcion: string }[];
  niveles?: { nivel: number; descripcion: string }[];
};

// El JSON se lee como datos: aquí solo se toman id, texto, opciones y niveles.
// `evidencia`, `fuente_pagina`, `mide` y `programa` NUNCA se copian a la llamada.
const PREGUNTAS_INSUMO = insumos.preguntas_jev as unknown as PreguntaInsumo[];

// Regla de `reglas_codigo`: a una empresa solo se le ofrecen estas tres salidas.
const OPCIONES_CORPORATIVO = new Set(["Planes_Corporativos", "Multipliers", "requiere_revision"]);

export function construirPreguntas(perfil: Perfil): PreguntasJev {
  const salida: PreguntasJev = {};
  for (const p of PREGUNTAS_INSUMO) {
    if (p.tipo === "noul") {
      salida[p.id] = { type: "noul", instructions: p.afirmacion ?? "" };
    } else if (p.tipo === "choice") {
      const criteria: Record<string, string> = {};
      for (const opcion of p.opciones ?? []) {
        if (perfil === "corporativo" && !OPCIONES_CORPORATIVO.has(opcion.id)) {
          continue;
        }
        criteria[opcion.id] = opcion.descripcion;
      }
      salida[p.id] = { type: "choice", instructions: p.pregunta ?? "", criteria };
    } else {
      const niveles = [...(p.niveles ?? [])].sort((a, b) => a.nivel - b.nivel);
      salida[p.id] = {
        type: "score",
        instructions: p.pregunta ?? "",
        criteria: niveles.map((n) => n.descripcion),
      };
    }
  }
  return salida;
}

export type EntradaEstado = {
  perfil: Perfil;
  etapa?: Etapa;
  edad_hijo?: number;
  reto: string;
  dolores_elegidos?: string[];
  metas_elegidas?: string[];
};

// Devuelve SOLO las 7 claves permitidas. Si la entrada trae `contacto` u otra clave, se ignora.
export function construirEstado(entrada: EntradaEstado): EstadoJev {
  const estado: EstadoJev = { perfil: entrada.perfil, reto_principal: entrada.reto };
  if (entrada.etapa !== undefined) {
    estado.etapa = entrada.etapa;
    estado.etapa_nivel = ETAPA_NIVEL[entrada.etapa];
  }
  if (entrada.edad_hijo !== undefined) {
    estado.edad_hijo = entrada.edad_hijo;
  }
  if (entrada.dolores_elegidos && entrada.dolores_elegidos.length > 0) {
    estado.dolores_elegidos = entrada.dolores_elegidos;
  }
  if (entrada.metas_elegidas && entrada.metas_elegidas.length > 0) {
    estado.metas_elegidas = entrada.metas_elegidas;
  }
  return estado;
}
```

**4. `src/data/umbrales.json`** — umbrales iniciales (se recalibran con `npm run calibrar`, paso 18):
```json
{
  "umbral_recomendar": 0.6,
  "umbral_mostrar": 0.4,
  "umbral_choice": 0.5,
  "umbral_dolor": 0.6,
  "umbral_vaga": 0.6,
  "delta_hermanos": 0.15
}
```

**5. `tests/jev/preguntas.test.ts`** — un grupo de pruebas por criterio. La paridad compara contra el JSON (longitudes e ids leídos del archivo), no contra números escritos a mano:
```ts
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
```

**6.** Corre `npm run format` y después los comandos de Verify.

**Files**
- `src/motor/catalogo.ts` — nuevo — perfiles, etapas, 17 programas, 6 familias, 10 dolores de chip, metas
- `src/jev/tipos.ts` — nuevo — tipos de JEV, `JevClient`, `JevError`
- `src/jev/preguntas.ts` — nuevo — `construirPreguntas()` y `construirEstado()` desde los insumos
- `src/data/umbrales.json` — nuevo — umbrales iniciales
- `tests/jev/preguntas.test.ts` — nuevo — preguntas, estado y paridad catálogo/insumos

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** `construirPreguntas("founder")` corre **THE SYSTEM SHALL** devolver una entrada por cada pregunta de `preguntas_jev` en `src/data/insumos-jev.json` (hoy 33), con clave igual al `id` de cada pregunta.
2. **WHEN** se serializa ese resultado con `JSON.stringify` **THE SYSTEM SHALL** no contener la clave `evidencia` ni el texto `youtube.com`.
3. **WHEN** el perfil no es `corporativo` **THE SYSTEM SHALL** dar a `programa_recomendado` un `criteria` con los 19 ids de opciones del JSON (17 programas + `requiere_revision` + `no_aplica`); **WHEN** el perfil es `corporativo` **THE SYSTEM SHALL** dejar solo `Planes_Corporativos`, `Multipliers` y `requiere_revision`.
4. **WHEN** `construirEstado` recibe una entrada que incluye `contacto` **THE SYSTEM SHALL** devolver solo claves de {`perfil`, `etapa`, `etapa_nivel`, `edad_hijo`, `reto_principal`, `dolores_elegidos`, `metas_elegidas`}, con `etapa_nivel` idea 0, mvp 1, arrancando 2, creciendo 3, consolidada 4.
5. **WHEN** `tests/jev/preguntas.test.ts` compara `src/motor/catalogo.ts` con los insumos **THE SYSTEM SHALL** encontrar los mismos 17 programas en el orden de las opciones del Choice, las mismas 6 familias con sus `se_activa_con` y `programas`, y una URL que empieza con `https://30x.com/` por programa.
6. **WHEN** se lee `src/data/umbrales.json` **THE SYSTEM SHALL** contener `umbral_recomendar` 0.6, `umbral_mostrar` 0.4, `umbral_choice` 0.5, `umbral_dolor` 0.6, `umbral_vaga` 0.6 y `delta_hermanos` 0.15.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm test -- tests/jev/preguntas.test.ts   # expect: exit 0, 0 failed
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 02: Catálogo, umbrales y armado de la llamada a JEV" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-02-preguntas
# rollback target si el paso 03 sale mal: git reset --hard step-02-preguntas
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E1-T3` — Motor: requisitos en código, ranking y etiquetas

**Depends on:** `E1-T2` · **Priority:** p0 — metadato para recortar alcance, no un orden de ejecución · **Paso 03**

Primera mitad del motor puro. Sin I/O: recibe Noul, contexto y umbrales; devuelve filas.

1. `src/motor/tipos.ts`:
   - `Umbrales` (las 6 claves de `src/data/umbrales.json`).
   - `Facturacion = "<100k" | "100k-1M" | "1M-20M" | ">20M"`.
   - `ContextoRequisitos = { perfil: Perfil; etapa_nivel: number | null; edad_hijo: number | null; facturacion: Facturacion | null }`.
   - `FilaRanking = { programa: IdPrograma; fit_jev: number; fit: number; prioridad: number; cumple: boolean; condicion: string | null; bloqueado_como_top: boolean }`.
   - `Etiqueta = "Muy recomendado" | "Recomendado" | "Podría servirte"`.
   - `FilaVisible = { id: IdPrograma; nombre: string; url: string; fit: number; etiqueta: Etiqueta | null; cumple_requisito: boolean; condicion_pendiente: string | null }`.
   - `ResultadoMotor = { tipo: "recomendado" | "preliminar" | "conversacion"; programa_top: FilaVisible | null; requiere_revision: boolean; ranking: FilaVisible[]; familias: { id: IdFamilia; nombre: string; valor: number }[]; chips: string[]; orden: IdPrograma[] }`
     (`ranking` = la escala SIN el programa n.º 1; `orden` = los 17 ids ordenados, lo usa QA).
2. `src/motor/requisitos.ts` — leídos de `requisitos_programas` de los insumos. Sin etapa
   (`etapa_nivel` null) todo requisito de etapa cuenta como no cumplido.

   | Programa | Tipo | Regla en código | Condición pendiente (texto para la persona) |
   |---|---|---|---|
   | Inmersion_Ejecutiva | codigo | etapa_nivel ≥ 3 y, si se preguntó, facturación `1M-20M` o `>20M` | tener un negocio en etapa Creciendo o Consolidada con facturación desde USD 1 millón al año |
   | Multipliers | codigo | cumple el requisito de Inmersion_Ejecutiva | cumplir primero el requisito de la Inmersión Ejecutiva |
   | AI_for_Executives | texto | cumplido siempre | — |
   | Operaciones_con_AI | codigo | etapa_nivel ≥ 3 | tener un negocio en etapa Creciendo o Consolidada |
   | Sales_Machine | codigo | etapa_nivel ≥ 2 | tener un negocio que ya factura (etapa Arrancando o más) |
   | AI_Sales | codigo | etapa_nivel ≥ 3 | tener un negocio en etapa Creciendo o Consolidada con proceso comercial |
   | Fundraising_Fundamentals | codigo | ninguno | — |
   | Raise_your_round | codigo | etapa_nivel ≥ 1 | tener al menos un MVP |
   | Next | codigo | perfil `padre_madre_next` y 13 ≤ edad_hijo ≤ 18 | ser madre o padre de un hijo/a de 13 a 18 años |
   | Instagram_TikTok | codigo | etapa_nivel ≥ 2 | tener un negocio que ya vende |
   | LinkedIn_Sales | codigo | etapa_nivel ≥ 2 | tener un negocio que ya vende |
   | Second_Brain | codigo | etapa_nivel ≥ 2 (la parte «delega a diario» no es calculable y se omite) | tener un negocio o proyecto en marcha (etapa Arrancando o más) |
   | AI_for_Developers | texto | cumplido siempre | — |
   | Growth_Rockstar | codigo | ninguno | — |
   | Advanced_Strategy | texto | cumplido siempre | — |
   | Xtreme_Growth | codigo | etapa_nivel ≥ 3 | tener tracción (etapa Creciendo o Consolidada) |
   | Planes_Corporativos | codigo | perfil `corporativo` | representar a una empresa |

   `evaluarRequisito(programa, ctx): { cumple: boolean; condicion: string | null }` (condición null si cumple).
3. `src/motor/ranking.ts`:
   - `fitsDesdeNoul(noul)`: fit de cada programa = `noul["fit_" + id.toLowerCase()]` o 0 si falta.
   - `calcularRanking(fits, opciones, umbrales): FilaRanking[]` con
     `opciones = { ctx: ContextoRequisitos; familiasConfirmadas: IdFamilia[]; prioridades: Partial<Record<IdPrograma, number>>; degradados: IdPrograma[]; bloqueadosComoTop: IdPrograma[] }`.
     `fit` = `fit_jev`, por 0.5 si (a) hay al menos una familia confirmada y ninguna familia del
     programa está confirmada (los programas sin familia, Next y Planes_Corporativos, nunca se
     degradan por esto), o (b) el programa está en `degradados`. Las dos causas no se acumulan: 0.5 una vez.
     Orden: `prioridad` desc, luego `fit` desc, luego orden de `PROGRAMAS`.
   - `etiquetaDe(fit)`: ≥ 0.80 «Muy recomendado» · ≥ 0.60 «Recomendado» · ≥ 0.40 «Podría servirte» · si no, null.
   - `primerRecomendable(filas, umbrales)`: primera fila con `fit ≥ umbral_recomendar`, `cumple` y no `bloqueado_como_top`; o null.
   - `visibles(filas, umbrales)`: filas con `fit ≥ umbral_mostrar`, en el mismo orden.
   - `aFilaVisible(fila)`: agrega nombre, URL y etiqueta desde el catálogo.
4. `tests/motor/ranking.test.ts`: un `it` por criterio. Los ejemplos 1 y 2 vienen de
   `resultado_final` de los insumos.

**Files**
- `src/motor/tipos.ts` — nuevo — `Umbrales`, `ContextoRequisitos`, `FilaRanking`, `FilaVisible`, `ResultadoMotor`
- `src/motor/requisitos.ts` — nuevo — tabla de requisitos y `evaluarRequisito()`
- `src/motor/ranking.ts` — nuevo — `fitsDesdeNoul()`, `calcularRanking()`, `etiquetaDe()`, `visibles()`
- `tests/motor/ranking.test.ts` — nuevo — requisitos y ranking

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** `evaluarRequisito` recibe etapa `arrancando` (etapa_nivel 2) **THE SYSTEM SHALL** marcar `Sales_Machine` como cumplido y `Operaciones_con_AI` como no cumplido con la condición `tener un negocio en etapa Creciendo o Consolidada`.
2. **WHEN** la facturación respondida es `100k-1M` **THE SYSTEM SHALL** marcar `Inmersion_Ejecutiva` y `Multipliers` como no cumplidos aunque la etapa sea `consolidada`.
3. **WHEN** el perfil es `padre_madre_next` **THE SYSTEM SHALL** marcar `Next` como cumplido con `edad_hijo` 15 y como no cumplido con `edad_hijo` 12.
4. **WHEN** los fits son Sales_Machine 0.85, LinkedIn_Sales 0.80, AI_Sales 0.45 e Instagram_TikTok 0.15 con etapa `creciendo` **THE SYSTEM SHALL** ordenarlos así, etiquetarlos `Muy recomendado`, `Muy recomendado` y `Podría servirte`, y dejar a Instagram_TikTok fuera de `visibles()` por tener fit menor que 0.40.
5. **WHEN** Sales_Machine tiene el fit más alto (0.85) con etapa `idea` y Fundraising_Fundamentals tiene 0.70 **THE SYSTEM SHALL** dejar a Sales_Machine visible con su condición pendiente y elegir a Fundraising_Fundamentals como primer programa recomendable.
6. **WHEN** todas las familias de un programa quedan fuera de las confirmadas y hay al menos una familia confirmada **THE SYSTEM SHALL** usar 0.5 × fit para ese programa; **WHEN** no hay ninguna familia confirmada **THE SYSTEM SHALL** no degradar a ningún programa.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm test -- tests/motor/ranking.test.ts   # expect: exit 0, 0 failed
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 03: Motor: requisitos en código, ranking y etiquetas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-03-ranking
# rollback target si el paso 04 sale mal: git reset --hard step-03-ranking
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E1-T4` — Motor: dolores, aclaración, seguimientos y Choice

**Depends on:** `E1-T3` · **Priority:** p0 — metadato para recortar alcance, no un orden de ejecución · **Paso 04**

Segunda mitad del motor. Todo lo que decide sin volver a llamar a JEV vive aquí.

1. `src/motor/dolores.ts`:
   - `detectarDolores(noul, umbrales)`: los `DOLORES_CHIP` con `noul[id] > umbral_dolor`, como
     `{ id, etiqueta, valor, familia }`, ordenados por `valor` desc.
   - `familiasDe(doloresIds)`: familias únicas de esos dolores, en el orden de `FAMILIAS`.
   - `necesitaAclaracion(noul, umbrales)`: `noul.respuesta_vaga > umbral_vaga` o ninguna familia abierta.
   - `doloresTrasAclaracion(noul, familiasElegidas, umbrales)`: los detectados, más, por cada familia
     elegida sin ningún dolor detectado, su primer `se_activa_con` (con el valor que traiga el Noul).
   - `valoresFamilias(noul)`: las 6 familias con `valor` = máximo de sus Noul de dolor (0 si faltan).
2. `src/data/seguimientos.json` (literal; `npm run format` le da formato):

   ```json
   {
     "bloques": [
       { "id": "inmersion", "familia": "escala_y_estrategia", "preguntas": [
         { "id": "formato", "texto": "¿Presencial u online?", "opciones": [
           { "id": "presencial", "etiqueta": "Presencial" }, { "id": "online", "etiqueta": "Online" },
           { "id": "indiferente", "etiqueta": "Me da igual" } ] },
         { "id": "facturacion", "texto": "Facturación anual", "opciones": [
           { "id": "<100k", "etiqueta": "Menos de USD 100 mil" }, { "id": "100k-1M", "etiqueta": "De USD 100 mil a 1 millón" },
           { "id": "1M-20M", "etiqueta": "De USD 1 a 20 millones" }, { "id": ">20M", "etiqueta": "Más de USD 20 millones" } ] } ] },
       { "id": "ventas", "familia": "ventas", "preguntas": [
         { "id": "cliente", "texto": "¿Le vendes a empresas o a personas?", "opciones": [
           { "id": "b2b", "etiqueta": "A empresas" }, { "id": "b2c", "etiqueta": "A personas" } ] },
         { "id": "reuniones", "texto": "¿Cuántas reuniones de venta tienes por semana?", "solo_si": { "cliente": "b2b" }, "opciones": [
           { "id": "menos_20", "etiqueta": "Menos de 20" }, { "id": "20_o_mas", "etiqueta": "20 o más" } ] } ] },
       { "id": "ia", "familia": "inteligencia_artificial", "preguntas": [
         { "id": "uso_ia", "texto": "¿La IA es para ti, para tu equipo o para construir producto?", "opciones": [
           { "id": "personal", "etiqueta": "Para mí" }, { "id": "equipo", "etiqueta": "Para mi equipo" },
           { "id": "producto", "etiqueta": "Para construir producto" } ] } ] },
       { "id": "capital", "familia": "capital", "preguntas": [
         { "id": "inversion_previa", "texto": "¿Ya levantaste inversión antes?", "opciones": [
           { "id": "no", "etiqueta": "Todavía no" }, { "id": "si", "etiqueta": "Sí" } ] } ] },
       { "id": "growth", "familia": "growth", "preguntas": [
         { "id": "rol_growth", "texto": "¿Diriges el área o la ejecutas?", "opciones": [
           { "id": "dirijo", "etiqueta": "La dirijo" }, { "id": "ejecuto", "etiqueta": "La ejecuto" } ] } ] }
     ]
   }
   ```

3. `src/motor/seguimientos.ts`:
   - `elegirSeguimientos(entrada)` con `{ filas, familiasConfirmadas, choice, etapa_nivel, umbrales }`.
     "Visibles" = filas con fit ≥ `umbral_mostrar`. Un bloque se dispara si:
     `inmersion`: Inmersion_Ejecutiva está entre las 3 primeras visibles y etapa_nivel ≥ 3 ·
     `ventas`: familia `ventas` confirmada y las dos visibles de mayor fit entre Sales_Machine,
     LinkedIn_Sales, AI_Sales e Instagram_TikTok difieren en menos de `delta_hermanos` ·
     `ia`: familia `inteligencia_artificial` confirmada y lo mismo entre AI_for_Executives, Second_Brain,
     AI_for_Developers y AI_Sales · `capital`: familia `capital` confirmada · `growth`: familia `growth` confirmada.
     Discrepancia: si el Choice no es el n.º 1, está entre las 3 primeras visibles y su fit difiere del
     n.º 1 en menos de `delta_hermanos`, el bloque de su familia se dispara y va primero.
     Orden de los demás: fit máximo visible de su familia, desc. Se agregan bloques completos mientras
     el total de preguntas (las `solo_si` cuentan) sea ≤ 2. Un bloque que no cabe entero se omite.
   - `efectosDeSeguimiento(respuestas, noul, etapa_nivel, umbrales)` → `{ prioridades, degradados, bloqueadosComoTop, facturacion }`:
     `formato` presencial → prioridad +1 a Inmersion_Ejecutiva; online → Inmersion_Ejecutiva a
     `bloqueadosComoTop` · `facturacion` → `ctx.facturacion` (con `<100k` o `100k-1M` Inmersión y
     Multipliers no cumplen) · `cliente` b2b → degrada Instagram_TikTok; b2c → degrada Sales_Machine,
     LinkedIn_Sales y AI_Sales y prioridad +1 a Instagram_TikTok · `reuniones` menos_20 → prioridad +2
     a Sales_Machine (regla de Andrés) · `uso_ia` personal → +1 Second_Brain; equipo → +1
     Operaciones_con_AI si `operacion_desordenada > umbral_dolor`, si no +1 AI_for_Executives; producto →
     +1 AI_for_Developers · `inversion_previa` no → +1 Fundraising_Fundamentals; si → +1 Raise_your_round ·
     `rol_growth` ejecuto → +1 Growth_Rockstar; dirijo → +1 Xtreme_Growth si etapa_nivel ≥ 3, si no +1
     Advanced_Strategy.
4. `src/motor/resultado.ts` — `resolverResultado(entrada, umbrales)` con
   `entrada = { respuestas: RespuestasJev; perfil; etapa_nivel; edad_hijo; dolores_confirmados: IdDolor[]; respuestas_seguimiento: Record<string, string> | null }`.
   Devuelve `{ pendiente: true; seguimientos }` o `{ pendiente: false; resultado: ResultadoMotor; confianza_choice: number | null }`.
   1. Familias confirmadas = `familiasDe(dolores_confirmados)`.
   2. Regla NEXT (de `reglas_codigo`): perfil `padre_madre_next` con 13 ≤ edad_hijo ≤ 18 → prioridad
      +3 a Next y su fit sube a `max(fit_next, umbral_recomendar)`.
   3. Ranking sin seguimiento. Si `respuestas_seguimiento` es null y `elegirSeguimientos` devuelve
      algo, responde `pendiente`. Si es un objeto (aunque esté vacío), aplica los efectos y recalcula.
   4. n.º 1 = `primerRecomendable`. Si no hay, el primero visible que cumple, o el primero visible;
      si no hay visibles, tipo `conversacion` con `programa_top` null.
   5. `requiere_revision` = true si: no hubo `primerRecomendable`; Choice ausente, `requiere_revision`
      o `no_aplica`; Choice distinto del n.º 1; confianza < `umbral_choice`; o `datos_incoherentes > 0.5`.
   6. tipo: `recomendado` si hay n.º 1 y no `requiere_revision`; `preliminar` si hay n.º 1 y sí;
      `conversacion` si no hay n.º 1. `ranking` = visibles sin el n.º 1. `chips` = etiquetas de
      `dolores_confirmados`. `familias` = `valoresFamilias`. `orden` = ids de todas las filas.
5. `tests/motor/flujo.test.ts`: un `it` por criterio más el caso NEXT y el caso «online quita la
   Inmersión del n.º 1».

**Files**
- `src/motor/dolores.ts` — nuevo — chips, familias abiertas, aclaración, valores por familia
- `src/motor/seguimientos.ts` — nuevo — selección de bloques y efectos de las respuestas
- `src/motor/resultado.ts` — nuevo — `resolverResultado()`: decisión final
- `src/data/seguimientos.json` — nuevo — banco de preguntas de seguimiento
- `tests/motor/flujo.test.ts` — nuevo — flujo completo del motor

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** los Noul son bloqueo_comercial 0.85 y ventas_por_referidos 0.85 y los otros 8 Noul de dolor valen 0.10 **THE SYSTEM SHALL** detectar los chips `Pocas ventas` y `Vendes solo por referidos` y abrir solo la familia `ventas`.
2. **WHEN** respuesta_vaga es mayor que 0.60 o ninguna familia se abre **THE SYSTEM SHALL** marcar `necesita_aclaracion` true.
3. **WHEN** Sales_Machine y LinkedIn_Sales quedan a menos de 0.15 de fit con la familia `ventas` confirmada y `respuestas_seguimiento` es null **THE SYSTEM SHALL** devolver `pendiente` true con la pregunta `cliente` (y `reuniones` solo si cliente es `b2b`), nunca más de 2 preguntas en total.
4. **WHEN** `respuestas_seguimiento` es `{cliente: "b2b", reuniones: "menos_20"}` y el Choice es `Sales_Machine` con confianza 0.7 **THE SYSTEM SHALL** devolver `programa_top.id` `Sales_Machine`, tipo `recomendado` y `requiere_revision` false.
5. **WHEN** la confianza del Choice es menor que 0.50, o el Choice es distinto del n.º 1 después del seguimiento, o datos_incoherentes es mayor que 0.50 **THE SYSTEM SHALL** devolver `requiere_revision` true y tipo `preliminar` con el mismo n.º 1.
6. **WHEN** ningún programa llega a fit 0.40 **THE SYSTEM SHALL** devolver tipo `conversacion` con `programa_top` null.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm test -- tests/motor/flujo.test.ts   # expect: exit 0, 0 failed
npm test -- tests/motor   # expect: exit 0, 0 failed — ranking.test.ts sigue en verde
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 04: Motor: dolores, aclaración, seguimientos y Choice" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-04-flujo-motor
# rollback target si el paso 05 sale mal: git reset --hard step-04-flujo-motor
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E1-T5` — Cliente JEV: fábrica, reintento y mock determinista

**Depends on:** `E1-T2` · **Priority:** p0 — metadato para recortar alcance, no un orden de ejecución · **Paso 05**

El mock es el modo por defecto en dev, pruebas, CI y e2e. Debe ser determinista para que las e2e
puedan esperar textos exactos.

1. `src/jev/mock-keywords.ts`: `PALABRAS_DOLOR: Record<IdDolor | "objecion_tiempo_o_precio", string[]>`
   y `SENALES_FIT: Record<IdPrograma, { dolores: IdDolor[]; palabras: string[] }>`. Todo en minúsculas
   y sin acentos; la comparación es «el texto contiene la cadena».

   | Noul | Palabras |
   |---|---|
   | dependencia_fundador | `depende de mi`, `todo pasa por mi`, `horas a la semana`, `no delego`, `sin mi` |
   | bloqueo_comercial | `vendo poco`, `no vendo`, `ventas`, `vender`, `proceso comercial`, `clientes nuevos` |
   | quiere_adoptar_ia | `inteligencia artificial`, `usar ia`, `adoptar ia`, `con ia` |
   | tareas_repetitivas_ia | `tareas repetitivas`, `repetitiv`, `correos`, `pierdo horas` |
   | operacion_desordenada | `caos`, `apagar incendios`, `apago incendios`, `desorden`, `operacion` |
   | busca_capital | `inversion`, `inversionista`, `capital`, `levantar`, `ronda` |
   | dolor_growth | `no crece`, `crecer`, `usuarios`, `retencion`, `adquisicion`, `growth` |
   | busca_expansion | `expandir`, `otros paises`, `internacional`, `expansion` |
   | dolor_equipo_talento | `contratar`, `talento`, `cultura`, `mi equipo no`, `retener` |
   | ventas_por_referidos | `referido`, `boca a boca`, `recomendacion` |
   | objecion_tiempo_o_precio | `caro`, `precio`, `no tengo tiempo` |

   | Programa | Dolores que lo activan | Palabras propias |
   |---|---|---|
   | Inmersion_Ejecutiva | dependencia_fundador, busca_expansion | — |
   | Multipliers | — | `mentor`, `acompanamiento`, `mastermind` |
   | AI_for_Executives | quiere_adoptar_ia | — |
   | Operaciones_con_AI | operacion_desordenada | — |
   | Sales_Machine | bloqueo_comercial | — |
   | AI_Sales | — | `prospect`, `ventas con ia`, `automatizar ventas` |
   | Fundraising_Fundamentals | busca_capital | — |
   | Next | — | `hijo`, `hija`, `adolescente` |
   | Raise_your_round | busca_capital | — |
   | Instagram_TikTok | — | `instagram`, `tiktok`, `redes sociales` |
   | LinkedIn_Sales | ventas_por_referidos | `linkedin` |
   | Second_Brain | tareas_repetitivas_ia | — |
   | AI_for_Developers | — | `desarrollador`, `programador`, `programar`, `codigo` |
   | Growth_Rockstar | dolor_growth | — |
   | Advanced_Strategy | — | `equipo de growth`, `vp de`, `head de` |
   | Xtreme_Growth | — | `escalar agresiv`, `traccion` |
   | Planes_Corporativos | — | `colaboradores`, `programa corporativo`, `formar equipos`, `formar a mis equipos` |

2. `src/jev/mock.ts` — `crearMockJev(): JevClient`. `evaluar(estado, preguntas)`:
   1. Texto = `reto_principal` + `dolores_elegidos` + `metas_elegidas`, en minúsculas, sin acentos
      (`normalize("NFD")` y quitar `\p{M}`).
   2. Si contiene `simular falla de jev` → lanza `JevError("JEV_HTTP", "falla simulada del mock")`.
   3. Cada Noul de dolor: 0.85 si alguna palabra aparece; si no, 0.10. `objecion_tiempo_o_precio`
      igual. `respuesta_vaga`: 0.85 si ningún Noul de dolor llegó a 0.85; si no, 0.10.
      `datos_incoherentes` 0.05. `enamorado_de_solucion` 0.10.
   4. Cada `fit_<programa>`: 0.85 si alguno de sus dolores llegó a 0.85 o aparece una palabra propia; si no, 0.10.
   5. Choice: entre los ids del `criteria` recibido que son programas, el de mayor fit; empate → orden
      de `PROGRAMAS`. Si ese fit es 0.10: `requiere_revision` si está en el `criteria`, si no `no_aplica`.
      Confianza 0.7.
   6. Score `madurez_negocio`: `estado.etapa_nivel ?? 0`, confianza 0.7.
   7. Solo responde las claves presentes en `preguntas`. `usage { input_tokens: 0, cost: 0 }`,
      `latencia_ms: 0`, `modelo: "mock"`.
3. `src/jev/cliente.ts`:
   - `ConfigJev = { modo: ModoJev; modelo: string; modeloComposio?: string; composioApiKey?: string; cuentaOpenrouter?: string; cuentaJev?: string }`.
   - `crearClienteJev(config, fetchFn: typeof fetch = fetch): JevClient`. En este paso solo `mock`;
     los otros modos lanzan `JevError("JEV_CONFIG", "modo no disponible: <modo>")` hasta el paso 6.
   - `evaluarConReintento(cliente, estado, preguntas)`: un intento y, si lanza, un reintento; si
     vuelve a lanzar, propaga un `JevError` (convierte errores desconocidos a `JEV_HTTP`).
4. `tests/jev/mock.test.ts`: un `it` por criterio. El `fetch` es un `vi.fn()`.

**Files**
- `src/jev/cliente.ts` — nuevo — `crearClienteJev()` y `evaluarConReintento()`
- `src/jev/mock.ts` — nuevo — adaptador mock sin red
- `src/jev/mock-keywords.ts` — nuevo — palabras clave del mock por Noul
- `tests/jev/mock.test.ts` — nuevo — mock, fábrica y reintento

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** el mock evalúa el reto `Vendo por referidos y no tengo un proceso comercial ordenado. Ya facturo unos USD 300 mil al año.` **THE SYSTEM SHALL** devolver 0.85 en bloqueo_comercial, ventas_por_referidos, fit_sales_machine y fit_linkedin_sales, 0.10 en los otros 8 Noul de dolor, y Choice `Sales_Machine` con confianza 0.7.
2. **WHEN** el mock evalúa dos veces la misma entrada **THE SYSTEM SHALL** devolver respuestas idénticas, `latencia_ms` 0, `usage.cost` 0 y `modelo` `mock`.
3. **WHEN** el reto no tiene ninguna palabra clave **THE SYSTEM SHALL** devolver respuesta_vaga 0.85 y Choice `no_aplica`; **WHEN** el reto contiene `simular falla de jev` **THE SYSTEM SHALL** lanzar `JevError` con código `JEV_HTTP`.
4. **WHEN** `crearClienteJev` recibe modo `mock` **THE SYSTEM SHALL** no llamar nunca al `fetch` inyectado (el espía registra 0 llamadas).
5. **WHEN** el cliente inyectado falla una vez y luego responde **THE SYSTEM SHALL** hacer que `evaluarConReintento` devuelva la segunda respuesta; **WHEN** falla dos veces **THE SYSTEM SHALL** lanzar `JevError`.
6. **WHEN** las preguntas vienen restringidas para `corporativo` **THE SYSTEM SHALL** responder solo las preguntas recibidas y elegir el Choice dentro de sus `criteria`, con `requiere_revision` si ningún programa permitido coincide.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm test -- tests/jev/mock.test.ts   # expect: exit 0, 0 failed
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 05: Cliente JEV: fábrica, reintento y mock determinista" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-05-jev-mock
# rollback target si el paso 06 sale mal: git reset --hard step-05-jev-mock
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E1-T6` — Adaptadores composio-proxy y composio-jev con fixtures

**Depends on:** `E1-T5` · **Priority:** p0 — metadato para recortar alcance, no un orden de ejecución · **Paso 06**

Los dos caminos reales a JEV. Ninguna prueba sale a la red: `fetch` siempre inyectado.

1. `src/jev/proxy.ts` — `crearProxyJev(config, fetchFn): JevClient`. Exige `composioApiKey` y
   `cuentaOpenrouter` (si faltan: `JevError("JEV_CONFIG", "falta COMPOSIO_API_KEY o COMPOSIO_OPENROUTER_ACCOUNT_ID")` al crear). `evaluar`:
   - `POST https://backend.composio.dev/api/v3.1/tools/execute/proxy`, cabeceras
     `x-api-key: <composioApiKey>` y `Content-Type: application/json`, cuerpo
     `{ connected_account_id: cuentaOpenrouter, endpoint: "https://openrouter.ai/api/alpha/decisions", method: "POST", body: { model: config.modelo, state, questions } }`.
     El `endpoint` es URL absoluta a propósito (la base URL de la conexión de Composio es UNVERIFIED).
   - `AbortController` con 8000 ms; al abortar → `JEV_TIMEOUT`. HTTP no 2xx → `JEV_HTTP`.
   - Respuesta de Composio `{ data, status, headers }`: `status` fuera de 200-299 → `JEV_HTTP`.
     `data` es la respuesta de OpenRouter `{ id, model, provider, answers, usage: { input_tokens, output_tokens, cost } }`.
   - `normalizarAnswers(answers)` (exportada, la reutiliza composio-jev): `{type:"noul", noul}` →
     `noul[k] = noul`; `{type:"choice", choice, confidence}` → `choice = { valor, confianza }`;
     `{type:"score", score, confidence}` → `score = { valor, confianza }`. Sin `answers` → `JEV_FORMATO`.
   - `latencia_ms` medido con `Date.now()` antes y después; `modelo` = `data.model ?? config.modelo`;
     `usage = { input_tokens: usage.input_tokens ?? 0, cost: usage.cost ?? 0 }`.
2. `src/jev/composio-jev.ts` — `crearComposioJev(config, fetchFn)`. Exige `composioApiKey` y `cuentaJev`.
   `POST https://backend.composio.dev/api/v3.1/tools/execute/JEV_EVALUATE_STATE` con
   `{ connected_account_id: cuentaJev, arguments: { model: config.modeloComposio ?? config.modelo, state, questions } }`.
   Respuesta `{ data, error, successful }`: `successful` false → `JEV_HTTP` con `error`. Si `data` es
   texto, `JSON.parse` dentro de try (falla → `JEV_FORMATO`). Busca `answers` en `data`,
   `data.data`, `data.response_data` y `data.result`, en ese orden; ninguno → `JEV_FORMATO` con el
   mensaje `composio-jev: respuesta no reconocida`. Mismo timeout y misma normalización.
3. `src/jev/cliente.ts`: `crearClienteJev` devuelve `crearProxyJev` para `composio-proxy` y
   `crearComposioJev` para `composio-jev`.
4. `tests/fixtures/openrouter-decision.json`: un objeto `{ id, model: "typesafe/jev-1.14", provider,
   answers, usage: { input_tokens, output_tokens, cost } }` con una respuesta por cada id de
   `preguntas_jev` (31 `noul` con `noul` numérico, `programa_recomendado` como `choice` con
   `choice: "Sales_Machine"`, `confidence` y `probabilities`, `madurez_negocio` como `score` con
   `score`, `confidence`, `probabilities` y `legend`). Es la forma oficial que describe OpenRouter;
   los valores son de ejemplo.
5. `tests/jev/adaptadores.test.ts`: un `it` por criterio. El timeout se prueba con
   `vi.useFakeTimers()` y un `fetch` que solo resuelve al recibir `abort`.

**Files**
- `src/jev/proxy.ts` — nuevo — adaptador `composio-proxy` (producción)
- `src/jev/composio-jev.ts` — nuevo — adaptador `composio-jev` (respaldo, UNVERIFIED)
- `src/jev/cliente.ts` — editar — la fábrica conecta los dos modos nuevos
- `tests/fixtures/openrouter-decision.json` — nuevo — respuesta de OpenRouter con la forma oficial
- `tests/jev/adaptadores.test.ts` — nuevo — adaptadores con fetch inyectado

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** el adaptador composio-proxy evalúa con un `fetch` inyectado **THE SYSTEM SHALL** hacer un solo POST a `https://backend.composio.dev/api/v3.1/tools/execute/proxy` con cabecera `x-api-key`, `connected_account_id` igual a la cuenta configurada, `endpoint` `https://openrouter.ai/api/alpha/decisions`, `method` `POST` y `body` con `model` `typesafe/jev-1.14`, `state` y `questions`.
2. **WHEN** el `fetch` responde `{data: <tests/fixtures/openrouter-decision.json>, status: 200}` **THE SYSTEM SHALL** normalizar los Noul a números, el Choice a `{valor, confianza}`, el Score a `{valor, confianza}` y el costo desde `usage.cost`.
3. **WHEN** Composio responde `status` 500 dentro de su cuerpo o el HTTP es 401 **THE SYSTEM SHALL** lanzar `JevError` con código `JEV_HTTP`.
4. **WHEN** el `fetch` inyectado no responde en 8000 ms **THE SYSTEM SHALL** abortar y lanzar `JevError` con código `JEV_TIMEOUT` (probado con temporizadores falsos de Vitest).
5. **WHEN** composio-jev recibe `data` como texto JSON o como objeto con `answers` **THE SYSTEM SHALL** normalizar a la misma forma; **WHEN** no reconoce la estructura **THE SYSTEM SHALL** lanzar `JevError` con código `JEV_FORMATO`.
6. **WHEN** se inspecciona el cuerpo serializado de la petición **THE SYSTEM SHALL** no contener las claves `evidencia`, `nombre`, `email`, `whatsapp` ni `empresa`.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
npm test -- tests/jev   # expect: exit 0, 0 failed — preguntas, mock y adaptadores
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 06: Adaptadores composio-proxy y composio-jev con fixtures" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-06-jev-remotos
# rollback target si el paso 07 sale mal: git reset --hard step-06-jev-remotos
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

### `E1-T7` — Revisión del bloque motor y JEV (compuerta)

**Depends on:** `E1-T4`, `E1-T6` · **Priority:** p0 — metadato para recortar alcance, no un orden de ejecución · **Paso 07**

Compuerta pedida por Alonso. Sigue la skill de proyecto `.claude/skills/revision-seguridad/SKILL.md`.

1. `mkdir -p docs/revisiones`.
2. Alcance: `src/motor/`, `src/jev/`, `src/data/umbrales.json`, `src/data/seguimientos.json`,
   `tests/motor/`, `tests/jev/`.
3. Invoca con la herramienta Skill `anthropic-skills:abogado-del-diablo`: puntos ciegos del motor
   (umbrales, empates, familias sin dolor, Choice contradictorio, NEXT, corporativo, paráfrasis) y
   del armado de la llamada (que no viaje nada personal ni `evidencia`).
4. Invoca con la herramienta Skill `cyber-neo` sobre la raíz, excluyendo `blueprints/`: secretos,
   cabecera `x-api-key`, manejo de errores de red, parseo de `data` como texto, timeouts.
5. Guarda cada salida con la plantilla de la skill de proyecto. Corrige todo hallazgo crítico o
   alto (con su prueba). Cierra cada archivo con `Hallazgos críticos abiertos: 0` solo cuando sea verdad.

**Files**
- `docs/revisiones/02-motor-jev-abogado.md` — nuevo — salida de anthropic-skills:abogado-del-diablo
- `docs/revisiones/02-motor-jev-cyber-neo.md` — nuevo — salida de cyber-neo
- `src/motor/**` — editar solo si un hallazgo crítico o alto lo exige
- `src/jev/**` — editar solo si un hallazgo crítico o alto lo exige

**Acceptance**

Copiado literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada criterio lo decide un comando de abajo, en esta máquina, durante la construcción.

1. **WHEN** el paso termina **THE SYSTEM SHALL** tener `docs/revisiones/02-motor-jev-abogado.md` con la línea `Herramienta: anthropic-skills:abogado-del-diablo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
2. **WHEN** el paso termina **THE SYSTEM SHALL** tener `docs/revisiones/02-motor-jev-cyber-neo.md` con la línea `Herramienta: cyber-neo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
3. **WHEN** se lee cada documento **THE SYSTEM SHALL** contener la tabla de hallazgos con la cabecera `| # | Severidad | Hallazgo | Estado | Corrección |`.
4. **WHEN** `npm run typecheck`, `npm run lint` y `npm test` corren después de las correcciones **THE SYSTEM SHALL** salir con 0, con 0 pruebas fallidas.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está bien; el último en salir con 0 deja la tarea hecha.

```bash
test -f docs/revisiones/02-motor-jev-abogado.md   # expect: exit 0
test -f docs/revisiones/02-motor-jev-cyber-neo.md   # expect: exit 0
grep -Eq '^Herramienta: (anthropic-skills:abogado-del-diablo|revisión manual \(skill no disponible\))$' docs/revisiones/02-motor-jev-abogado.md   # expect: exit 0
grep -Eq '^Herramienta: (cyber-neo|revisión manual \(skill no disponible\))$' docs/revisiones/02-motor-jev-cyber-neo.md   # expect: exit 0
grep -qF '| # | Severidad | Hallazgo | Estado | Corrección |' docs/revisiones/02-motor-jev-abogado.md   # expect: exit 0
grep -qF '| # | Severidad | Hallazgo | Estado | Corrección |' docs/revisiones/02-motor-jev-cyber-neo.md   # expect: exit 0
grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/02-motor-jev-abogado.md   # expect: exit 0
grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/02-motor-jev-cyber-neo.md   # expect: exit 0
npm run typecheck   # expect: exit 0
npm run lint   # expect: exit 0
npm test   # expect: exit 0, 0 failed
```

**Checkpoint**

```bash
git add -A && git commit -m "paso 07: Revisión del bloque motor y JEV (compuerta)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag step-07-revision-motor-jev
# rollback target si el paso 08 sale mal: git reset --hard step-07-revision-motor-jev
```

Corre esto después de que el último Verify salga con 0 y antes de empezar la siguiente tarea. El tag es el punto de retorno de esta tarea y lo que cuenta la compuerta final.

---

## Epic acceptance

La épica está hecha cuando cada tarea está `done` **y**:

1. **WHEN** `npm test` corre sobre `tests/seguridad`, `tests/jev` y `tests/motor` **THE SYSTEM SHALL** salir con 0 y con 0 pruebas fallidas.
2. **WHEN** `npm run test:e2e -- tests/e2e/salud.spec.ts` corre contra `wrangler dev` **THE SYSTEM SHALL** responder 200 en `/api/salud` y dejar la D1 local con las tablas `leads`, `resultados` y `qa_runs`.

```bash
npm run typecheck && npm run lint && npm test
npm run test:e2e -- tests/e2e/salud.spec.ts
```

Corre desde la raíz del proyecto. Ambos criterios los deciden estos comandos.

## Pitfalls

- **`not_found_handling: "404-page"` funciona con wrangler 4.151.1.** Si una versión futura lo rechaza, `salud.spec.ts` y `deploy:prueba` fallan en el paso 1: aplica el plan B que trae el paso 1 (quitar esa clave, `run_worker_first: true` y la ruta comodín en `app.ts`).
- **TypeScript 7 y Vitest 5 son versiones mayores nuevas.** El paso 1 corre typecheck y Vitest a propósito para descubrir aquí cualquier incompatibilidad, no en el paso 15.
- **`npm run format` va al final de cada paso**, después de escribir los archivos, porque `npm run lint` falla con cualquier diferencia de formato.
- **El mock tiene empates.** Con dos programas al mismo fit gana el primero en el orden de `PROGRAMAS`; las pruebas dependen de eso.
- **El puerto 8787 es único.** Si hay un `npm run dev` abierto, `npm run test:e2e` no puede arrancar su propio servidor.

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
