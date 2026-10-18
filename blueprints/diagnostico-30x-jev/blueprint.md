# Diagnóstico 30X con JEV — Blueprint

> Generado por The Architect el 2026-10-18
> Forma (shape): marketing-site (embudo de lead público) con una API en un Worker · `knowledge/shapes/marketing-site.md`
> Pista de runtime (track): ts-node · `knowledge/runtime-tracks/ts-node.md` (con `npm` en lugar de `pnpm` y con los pins de §11, decisión aprobada)
> Modo de emisión: bundle (`blueprint.md` + `tasks.json` + `epics/` + `workspace/`)
> Versión del blueprint: 1
> Versiones verificadas por última vez: 2026-10-17 — procedencia por paquete en §11
> Idioma: español sencillo. Los comandos, rutas e identificadores de código quedan en el idioma original.

**Cómo usar este bundle.** El bundle vive dentro del proyecto, en `blueprints/diagnostico-30x-jev/` (se copia a la raíz del clon de `https://github.com/avg031396-sys/diagnostico-30x-jev`; el clon ya trae el commit inicial de GitHub con el `LICENSE`, y el primer commit propio es el Checkpoint del paso 1). Quien construye hace tres cosas: (1) corre el Bootstrap de §10, que copia `workspace/` a la raíz sin pisar nada; (2) abre `tasks.json`, toma la primera tarea pendiente cuyas dependencias estén hechas y ejecuta su bloque en `epics/`; (3) al terminar, corre la compuerta de §20.1. Los comandos se corren siempre desde la raíz del proyecto, nunca desde la carpeta del bundle.

**Resumen para Alonso, en simple.** Esto es un sitio donde alguien deja su contacto, elige su perfil y su etapa, y cuenta con sus palabras qué lo frena. Un modelo de TypeSafe llamado JEV lee el texto una sola vez; el resto lo decide código normal y probado. Al final la persona ve «Nombre, tu programa es X», con un porcentaje, los motivos, los otros programas posibles y botones para compartir o hablar con un asesor. Además hay una página `/qa` que corre los 60 casos de prueba y muestra cuántos acierta el sistema.

---

## 1. Visión y fuera de alcance (Project Overview & Non-Goals)

### Visión

Hoy el diagnóstico de 30X le pregunta a la persona qué programa quiere: en 2,325 de 2,325 caminos el resultado lo elige ella misma y la etapa de su negocio nunca cambia nada. **Diagnóstico 30X con JEV** hace lo contrario: la persona deja su contacto, elige su punto de partida y su etapa, y escribe en texto libre qué la frena hoy y qué quiere lograr en 12 meses. JEV (el modelo `typesafe/jev-1.14` de TypeSafe, que responde preguntas tipadas y no redacta) evalúa todas las preguntas en una sola llamada. El código arma el ranking de los 17 programas de 30X con una escala de afinidad, muestra los dolores que detectó como chips que la persona puede quitar o agregar, hace de 0 a 2 preguntas de seguimiento resueltas por reglas, y entrega un resultado compartible. Si JEV no está seguro, la persona ve «Tu ruta preliminar» y el botón de asesor pasa a ser el principal: nunca ve un error.

Es un prototipo para el Hackatón 30X (reto «JEV en 30X»), no un producto oficial de 30X. El diferencial es de calidad: una página pública `/qa` corre los 60 casos de prueba de los insumos (limpios, de frontera, incoherentes, adversos y 30 paráfrasis) y muestra aciertos, latencia y costo, y un script fuera de línea calibra los umbrales sin sobreajustar. La entrega es el domingo 2026-10-18 a las 12:00 hora Colombia: video de máximo 3 minutos, demo desplegada y repositorio público.

### Usuarios

| Persona | Qué viene a hacer | Frecuencia |
|---|---|---|
| Emprendedor/a o fundador/a que llega a 30X | Saber qué programa le conviene según lo que de verdad le frena | una vez |
| Ejecutivo/a o líder corporativo | Encontrar el programa de IA, ventas u operación que encaja con su rol y su etapa | una vez |
| Representante de una empresa | Pedir un programa a la medida (Planes Corporativos) | una vez |
| Madre o padre de un adolescente de 13 a 18 años | Llegar a NEXT | una vez |
| Persona independiente o consultora | Encontrar un programa aunque no encaje en las demás categorías | una vez |
| Equipo comercial de 30X (secundario) | Recibir un lead ya calificado con su contacto, su reto y su ruta | semanal (por consulta manual a D1: no hay panel) |
| Jurados del hackatón (secundario) | Probar la demo y revisar la matriz de `/qa` | una vez |

### Metas — alcance de la versión 1

1. El sitio recoge contacto con consentimiento, perfil, etapa y un reto de 40 a 1200 caracteres, y hace una sola llamada a JEV para evaluarlo.
2. El código arma el ranking de programas con requisitos de entrada (`etapa_nivel` de 0 a 4), escala de afinidad, chips de dolores editables y de 0 a 2 preguntas de seguimiento.
3. El resultado se comparte (descargar imagen, LinkedIn, X, WhatsApp sin número, copiar enlace `/r/<id>`) y muestra una tarjeta con meta OG por programa.
4. Los tres adaptadores de JEV (`composio-proxy`, `composio-jev`, `mock`) se eligen con `JEV_MODE`; todo el desarrollo, las pruebas y la demo de respaldo corren en `mock`.
5. La página `/qa` corre los casos de prueba por lotes de 10 con un token, y `scripts/calibrar.ts` recalibra los umbrales fuera de línea.
6. Todo queda cubierto por pruebas, por cuatro compuertas de revisión de seguridad y por una lista de lanzamiento que ejecuta Alonso.

### Fuera de alcance (Non-Goals) — versión 1

| No se construye | Por qué no ahora | Se revisa cuando |
|---|---|---|
| Panel de leads | El equipo comercial puede consultar D1 a mano; un panel agrega autenticación y superficie de ataque | 30X pide ver los leads sin tocar la base |
| Envío de leads a un CRM o webhook | Hay que usar cuentas de 30X que no tenemos, y llamar su webhook insertaría leads falsos en su hoja | 30X entrega un endpoint propio y una cuenta de pruebas |
| Versión en inglés | El público del hackatón y los insumos están en español | Aparecen casos de prueba en inglés |
| Dominio propio | El plazo es de horas; basta el subdominio `workers.dev` | 30X adopta el prototipo |
| Recalibración de umbrales en vivo | Sobreajusta a pocos datos y cambia la decisión sin que nadie la revise | Hay un volumen de diagnósticos reales con resultado conocido |
| Comparación lado a lado con la lógica actual de 30X | Exige reproducir su lógica en el sitio y confunde el mensaje | 30X comparte una exportación anonimizada de sus resultados |
| Borrado de leads a pedido | Necesita un flujo de verificación de identidad que no cabe en el plazo | Se publica fuera del hackatón |
| Imágenes OG generadas en el servidor | Sale caro y frágil en un Worker; los 18 PNG se generan una vez con Playwright y se comitean | Cambia el diseño de la tarjeta con frecuencia |
| Integración continua en la nube (GitHub Actions) | La compuerta local de §20.1 corre lo mismo; un workflow exige permisos extra del token de GitHub | El repositorio recibe contribuciones externas |

**El constructor no debe implementar nada de esta tabla**, aunque parezca una adición pequeña mientras trabaja en un paso vecino. Si un paso parece exigir algo de aquí, es un defecto del blueprint: detenerse y reportarlo, no ampliar el alcance.

### Métricas de éxito

| Métrica | Meta | Cómo se mide |
|---|---|---|
| Demo viva el domingo 2026-10-18 | `/api/salud` responde 200 antes de las 12:00 hora Colombia | `test "$(curl -s -o /dev/null -w '%{http_code}' https://<url>/api/salud)" = 200` |
| Aciertos de la matriz en el puesto 1 | al menos 90 % de los casos evaluables, con JEV real | `/qa.html`, campo `aciertos_top1/evaluables` de la última corrida |
| Aciertos en el top 3 | 100 % de los casos evaluables, con JEV real | `/qa.html`, campo `aciertos_top3/evaluables` |
| Costo por diagnóstico | alrededor de 0.0002 USD, nunca más de 0.001 USD | `costo_total` de `/qa.html` entre los casos del run |
| Privacidad de la tarjeta pública | 0 datos de contacto en `/r/<id>` y en `/api/resultados/<id>` | `tests/e2e/api-resultados.spec.ts` y `tests/e2e/resultado.spec.ts` |

Los casos «evaluables» son los que traen `esperado.programa_recomendado` en `insumos-jev.json` (hoy 54 de 60; los otros 6 prueban señales sueltas como `datos_incoherentes` y no tienen un programa esperado). La meta «54 de 60 en el puesto 1» del handoff equivale a 90 %; aquí se aplica a los casos evaluables, que es la base sobre la que se puede acertar.

---

## 2. Stack tecnológico (Tech Stack)

**Pista de runtime: ts-node.** Esta tabla nombra decisiones, no versiones. Toda versión vive en §11 y en ningún otro lugar de la prosa. Los pins vienen del reporte de versiones verificado el 2026-10-17 (`npm view <paquete> version`), que manda sobre el archivo de la pista; lo que el reporte no resolvió queda marcado como no verificado.

| Capa | Decisión | Por qué esta y no otra |
|---|---|---|
| Lenguaje / runtime | TypeScript (sintaxis borrable) sobre Node 24 LTS para herramientas y sobre el runtime de Cloudflare Workers para el servidor | Un solo lenguaje de punta a punta. Se rechaza JavaScript puro: los tipos del contrato con JEV evitan errores silenciosos. Node 24 corre los scripts `.ts` sin compilar |
| Framework del servidor | Hono sobre un Worker de Cloudflare | Hono corre sin cambios en Workers y en Node y pesa poco; se rechaza un framework completo (Next.js) porque el sitio no necesita servidor de React |
| Framework de la interfaz | Ninguno: Vite multipágina con TypeScript y HTML | El sitio tiene 5 páginas y una sola pantalla interactiva; un framework agregaría peso y una frontera de hidratación que la CSP complica |
| Estilos | CSS propio con variables (tokens) y fuentes alojadas con fontsource | Es lo que pide la regla del diseño: tokens una sola vez, sin Tailwind. Se rechaza Tailwind: con Biome obliga a activar su parser de CSS y no aporta en 5 páginas |
| Capa de componentes | Funciones de DOM propias (`el()` en `src/web/comun.ts`) | Una pantalla por paso no justifica una biblioteca; se rechaza React por la misma razón que el framework |
| Base de datos | Cloudflare D1 (SQLite administrado) | Viene incluida en el plan gratuito del Worker, se prueba en local con `wrangler dev` y no pide TCP. Se rechaza Postgres: exige un servicio aparte y un driver que Workers no soporta por TCP |
| ORM / acceso a datos | SQL directo con `prepare` y `bind` | Son 3 tablas y consultas simples; un ORM sumaría una herramienta de migraciones más. Se rechaza Drizzle/Prisma: dos sistemas de migraciones sobre la misma base es una combinación conocida como mala |
| Autenticación | NOT APPLICABLE — no hay cuentas ni sesiones; el acceso a cada diagnóstico es un token aleatorio y la corrida de QA pide `QA_TOKEN` (ver §8) | Pedir cuenta mataría la conversión del embudo |
| Trabajo en segundo plano | NOT APPLICABLE — todo ocurre dentro de la petición | La única llamada lenta es la de JEV, con límite de 8 s |
| Pagos | NOT APPLICABLE — el sitio no cobra | 30X vende sus programas en su propio sitio |
| Almacenamiento de archivos | NOT APPLICABLE — las 18 imágenes OG son archivos estáticos del repositorio | No se suben archivos |
| Correo / notificaciones | NOT APPLICABLE — v1 no envía correos; el equipo consulta D1 | Enviar a un CRM o correo es un Non-Goal |
| IA / decisión | JEV (`typesafe/jev-1.14`) vía Composio, con adaptador `mock` para desarrollo | JEV devuelve respuestas tipadas en una sola llamada y cuesta alrededor de 0.0002 USD por diagnóstico. Se rechaza un LLM de texto libre: no devuelve respuestas tipadas y no se puede calibrar |
| Hosting | Cloudflare Workers con Static Assets (plan gratuito) | Un solo despliegue sirve el sitio estático y la API; `wrangler dev` reproduce todo en la máquina |
| Pruebas | Vitest (lógica pura) y Playwright (API y navegador contra `wrangler dev`) | Vitest en Node es rápido para el motor; las pruebas del Worker real son e2e. Se rechaza `vitest-pool-workers` por decisión del equipo |
| Lint y formato | Biome | Una sola herramienta y una sola configuración, en lugar de ESLint más Prettier |
| Gestor de paquetes | npm | Decisión aprobada para este proyecto (la pista por defecto usa pnpm): el builder ya lo tiene y evita aprobar scripts de instalación |

### Verificación de compatibilidad

Revisado contra `knowledge/stack-compatibility.md`: ninguna de las filas de la tabla de combinaciones malas aplica. Casos revisados a mano: el microframework portátil corre en el runtime de Workers porque el código de `src/worker/`, `src/motor/`, `src/jev/` y `src/qa/` no importa módulos de Node (`node:fs` aparece solo en pruebas y scripts); la base es D1 por binding, no un driver TCP; hay un solo sistema de migraciones (los `.sql` de `migrations/`); no hay dos proveedores de identidad ni dos paradigmas de estilos. Del archivo de la pista se arrastran estas advertencias: (1) TypeScript 7 es la versión nativa nueva y no ofrece todavía una API estable de compilador, por eso solo se usa `tsc` como verificador y ninguna herramienta del proyecto depende de esa API; (2) Biome debe tener su parser configurado antes del primer `lint` y `biome init` no sobrescribe un `biome.json` existente: aquí `biome.json` llega ya escrito en `workspace/`; (3) `.npmrc` fija `save-exact`, así que nada se instala con `^`. Prohibido por decisión del equipo: `@cloudflare/vite-plugin`, `@cloudflare/vitest-plugin` y `vitest-pool-workers`.

---

## 3. Estructura de directorios (Directory Structure)

```
diagnostico-30x-jev/                  # raíz del proyecto = clon del repositorio (aquí corren todos los comandos)
  blueprints/diagnostico-30x-jev/     # ESTE bundle: blueprint.md, tasks.json, epics/, workspace/. No es parte de la app
  .claude/                            # workspace (§19): settings.json, rules/*.md, skills/*/SKILL.md
  CLAUDE.md  AGENTS.md                # workspace (§19.1, §19.2)
  .editorconfig .gitattributes .gitignore .npmrc .nvmrc   # workspace (§19.6); .gitignore existe antes del primer commit propio (el del paso 1)
  .dev.vars.example                   # workspace: valores ficticios, SE COMITEA. .dev.vars (local) lo crea el Bootstrap y NO se comitea
  package.json  package-lock.json     # package.json: workspace; el lockfile lo crea npm install
  biome.json  tsconfig.json  tsconfig.dom.json            # workspace: Biome y los dos proyectos de TypeScript
  vite.config.ts  vitest.config.ts  playwright.config.ts  # workspace: build multipágina y los dos ejecutores de pruebas
  wrangler.jsonc                      # workspace: Worker, assets, D1, límite de peticiones, variables
  index.html  resultado.html  qa.html  privacidad.html  404.html   # workspace (cascarones); los pasos 12, 14, 18 y 19 los completan
  README.md                           # paso 19
  LICENSE                             # MIT: ya está en el repositorio (lo creó GitHub)
  migrations/
    0001_inicial.sql                  # paso 1: tablas leads, resultados y qa_runs, escrito a mano
  public/
    _headers                          # paso 10: mismas cabeceras de seguridad para los estáticos
    og/                               # paso 15: 17 PNG de programa + default.png (1200x630), generados por npm run og
  scripts/
    og.ts  og-plantilla.html          # paso 15
    calibrar.ts                       # paso 18: calibración fuera de línea
    jev-en-vivo.ts                    # paso 19: UNA llamada real a JEV (la corre Alonso)
  src/
    data/
      insumos-jev.json                # workspace: SOLO LECTURA (137 KB, no se reescribe ni se copia a otro lado)
      umbrales.json                   # paso 2
      seguimientos.json               # paso 4
    motor/                            # PURO: sin red, sin D1, sin DOM
      catalogo.ts                     # paso 2
      tipos.ts  requisitos.ts  ranking.ts                  # paso 3
      dolores.ts  seguimientos.ts  resultado.ts            # paso 4
    jev/                              # cliente de JEV: sin D1 ni DOM, con fetch inyectado
      tipos.ts  preguntas.ts          # paso 2
      cliente.ts  mock.ts  mock-keywords.ts                # paso 5 (cliente.ts se edita en el paso 6)
      proxy.ts  composio-jev.ts       # paso 6
    qa/
      evaluar.ts                      # paso 17: puntaje de un caso y totales, puro
    worker/                           # servidor (Hono)
      index.ts  app.ts                # paso 1 (app.ts se edita en los pasos 8, 9, 10 y 17)
      esquemas.ts  repositorio.ts  diagnosticos.ts         # paso 8 (diagnosticos.ts y repositorio.ts se editan en el 9)
      resultados.ts                   # paso 9
      seguridad.ts                    # paso 10: CSP, cabeceras, límite, errores, compararSeguro
      qa.ts                           # paso 17: rutas /api/qa/* y consultas de qa_runs
    web/                              # interfaz (TypeScript sin framework)
      estilos.css  comun.ts  diagnostico.ts                # paso 12
      confirmacion.ts                 # paso 13
      resultado-vista.ts  compartir.ts  resultado.ts       # paso 14
      qa.ts                           # paso 18
  tests/
    seguridad/secretos.test.ts        # paso 1
      jev/preguntas.test.ts  mock.test.ts  adaptadores.test.ts   # pasos 2, 5, 6
    motor/ranking.test.ts  flujo.test.ts                       # pasos 3, 4
    worker/seguridad.test.ts          # paso 10
    qa/evaluar.test.ts                # paso 17
    og/og.test.ts                     # paso 15
    scripts/calibrar.test.ts  jev-en-vivo.test.ts              # pasos 18, 19
    fixtures/openrouter-decision.json # paso 6
    e2e/                              # Playwright contra wrangler dev
      salud.spec.ts                   # paso 1
      api-diagnosticos.spec.ts  api-resultados.spec.ts         # pasos 8, 9
      inicio.spec.ts  confirmacion.spec.ts  resultado.spec.ts  # pasos 12, 13, 14
      api-qa.spec.ts  qa-pagina.spec.ts  privacidad.spec.ts   # pasos 17, 18, 19
  docs/revisiones/                    # pasos 7, 11, 16, 20: una pareja abogado + cyber-neo por bloque
  dist/  .wrangler/  node_modules/  worker-configuration.d.ts  playwright-report/  test-results/   # GENERADOS: los ignora git, Biome y tsc
```

**Origen de cada archivo.** Todo archivo dibujado arriba tiene exactamente uno de dos orígenes: lo escribe un paso de §9 (está en su lista **Do** y en el `files` de su tarea), o llega como archivo real de `workspace/` con la copia del Bootstrap (§19.6). Los archivos «generados» los producen comandos (`npm install`, `npm run build`, `wrangler types`, `npm run og`). Ninguno se crea «por el camino».

**Reglas de fronteras**

- `src/motor/` y `src/qa/` son puros: nada de `fetch`, `console`, `Date.now()`, `crypto`, D1, `Env` ni DOM; los umbrales entran por parámetro.
- `src/jev/` no toca D1, `Env`, DOM ni `src/worker/`; todo adaptador recibe `fetch` inyectado.
- D1 se abre solo en `src/worker/repositorio.ts` (`leads`, `resultados`) y en `src/worker/qa.ts` (`qa_runs`).
- `src/web/` importa del motor solo `catalogo.ts` y `tipos.ts`; nunca `src/worker/`, `src/jev/` ni `insumos-jev.json`.
- `scripts/` importa de `src/motor`, `src/jev` y `src/qa`, nunca de `src/worker`.
- `tests/e2e/` no importa nada de `src/`: habla con la app por HTTP o por el navegador.
- Nada de archivos barril (`index.ts` que reexporta) ni de alias de rutas.

**Convención de resolución.** Los imports relativos llevan la extensión `.ts` explícita y los JSON se importan con `with { type: "json" }`. Esa convención se concilia contra cada cargador (aplicación, pruebas, scripts, build, typecheck) en la matriz de §19.6, que es la única fuente; aquí no se repite.

**Valores que aparecen en más de un archivo** (carpeta de salida `./dist`, entry `src/worker/index.ts`, puerto `8787`, binding `DB` y otros) están conciliados en la tabla de §19.6, *Cross-artifact value reconciliation*. Este árbol dibuja `dist/` y `src/worker/index.ts` tal como esa tabla los fija.

---

## 4. Modelo de datos (Data Model)

Base: Cloudflare D1 (SQLite). Tres tablas. Las fechas son texto ISO 8601 en UTC; los campos que guardan JSON son `TEXT`; los booleanos son `INTEGER` 0 o 1.

### Entidades

**`leads`** — una persona que hizo el diagnóstico. Es **privada**: nunca se expone por HTTP. Vive de `en_curso` a `completo`, o a `error` si JEV falló.

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | INTEGER | PK, autoincremental | solo interno |
| `token` | TEXT | único, no nulo, 22 caracteres | 16 bytes aleatorios en base64url sin relleno; es la «llave» que la persona usa durante el flujo |
| `created_at` / `updated_at` | TEXT | no nulos, por defecto ahora | UTC |
| `estado` | TEXT | `en_curso` \| `completo` \| `error` | `error` = JEV falló al analizar el reto |
| `nombre`, `email`, `whatsapp` | TEXT | no nulos | contacto; nunca viaja a JEV ni a `/r` |
| `empresa` | TEXT | nulo permitido | opcional |
| `consentimiento` | INTEGER | debe ser 1 | la casilla obligatoria |
| `consentimiento_at` | TEXT | no nulo | cuándo aceptó |
| `perfil` | TEXT | no nulo | `founder`, `ejecutivo`, `corporativo`, `padre_madre_next`, `independiente` |
| `etapa` | TEXT | nulo si es padre o madre | `idea`, `mvp`, `arrancando`, `creciendo`, `consolidada` |
| `edad_hijo` | INTEGER | nulo salvo `padre_madre_next` | entre 10 y 25 al validar; NEXT exige 13 a 18 |
| `reto` | TEXT | no nulo | el texto libre (40 a 1200 caracteres) |
| `dolores_elegidos`, `metas_elegidas` | TEXT | JSON, nulos | ids elegidos en la pantalla de aclaración |
| `dolores_confirmados` | TEXT | JSON, nulo | ids de los chips que la persona dejó |
| `respuestas_seguimiento` | TEXT | JSON, nulo | `{ "cliente": "b2b", "reuniones": "menos_20" }` |
| `jev_modo`, `jev_modelo` | TEXT | nulos | modo y modelo usados (`mock`, `typesafe/jev-1.14`) |
| `jev_respuestas` | TEXT | JSON, nulo | `{ "noul": { "<id>": 0.85 }, "choice": { "valor", "confianza" } \| null, "score": { "valor", "confianza" } \| null }` |
| `jev_error` | TEXT | nulo | código del `JevError` si falló |
| `llamadas_jev` | INTEGER | 0 a 2, por defecto 0 | llamadas lógicas a JEV; el reintento interno no cuenta |
| `latencia_ms`, `costo_usd` | INTEGER, REAL | por defecto 0 | suma de las llamadas |
| `programa_top`, `fit_top`, `confianza_choice` | TEXT, REAL, REAL | nulos | decisión final |
| `requiere_revision` | INTEGER | 0 o 1 | solo para el equipo; la persona nunca lo ve |
| `quiere_asesor` | INTEGER | 0 o 1 | la persona pulsó «Habla con un asesor de 30X» |
| `resultado_id` | TEXT | FK a `resultados.id`, nulo | se llena al finalizar |

**`resultados`** — la tarjeta pública de un diagnóstico. **No tiene ninguna columna de contacto**; una prueba lo comprueba con `PRAGMA table_info`.

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | TEXT | PK, 10 caracteres | base62; es el `<id>` de `/r/<id>`; distinto del `token` |
| `created_at` | TEXT | no nulo, por defecto ahora | UTC |
| `nombre_pila` | TEXT | no nulo | primera palabra de `nombre`, máximo 40 caracteres |
| `tipo` | TEXT | `recomendado` \| `preliminar` \| `conversacion` | cómo se muestra el resultado |
| `requiere_revision` | INTEGER | 0 o 1 | se guarda pero nunca se muestra |
| `programa_id` | TEXT | nulo | id del programa n.º 1, o nulo si `conversacion` |
| `fit` | REAL | nulo | afinidad del n.º 1 |
| `detalle` | TEXT | JSON, no nulo | `{ "programa_top": FilaVisible \| null, "ranking": FilaVisible[], "familias": [{ id, nombre, valor }], "chips": string[] }` |

**`qa_runs`** — una corrida de la matriz de QA sobre los casos de prueba.

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | TEXT | PK | UUID (`crypto.randomUUID()`) |
| `created_at` | TEXT | no nulo | UTC |
| `estado` | TEXT | `en_curso` \| `cerrado` | solo los `cerrado` salen en `/api/qa/ultima` |
| `modo`, `modelo` | TEXT | no nulos | con qué se midió (`mock` mide el mock, no a JEV) |
| `umbrales` | TEXT | JSON, no nulo | los umbrales usados en la corrida |
| `lotes_total` | INTEGER | no nulo | techo de (casos ÷ 10) |
| `lotes_procesados` | TEXT | JSON, por defecto `[]` | números de lote ya procesados (hace idempotente cada lote) |
| `total`, `evaluables`, `aciertos_top1`, `aciertos_top3` | INTEGER | nulos hasta cerrar | `evaluables` = casos con programa esperado |
| `latencia_p50`, `latencia_p95` | INTEGER | nulos hasta cerrar | milisegundos |
| `costo_total` | REAL | nulo hasta cerrar | USD |
| `detalle` | TEXT | JSON, por defecto `[]` | una fila por caso: `id`, `tipo`, `esperado`, `top1`, `top3`, `acierto_top1`, `acierto_top3`, `evaluable`, `confianza_choice`, `latencia_ms`, `costo_usd`, `respuestas`, `respuestas_seguimiento` |

### Relaciones

- `leads` —(muchos a 0..1)→ `resultados` por `leads.resultado_id`. Un lead completo tiene exactamente un resultado; un lead en curso o con error no tiene ninguno. No hay borrado en cascada porque la versión 1 no borra filas (el borrado de leads a pedido es un Non-Goal).
- `qa_runs` no se relaciona con las otras tablas.

### Índices

| Tabla | Índice | Para qué consulta |
|---|---|---|
| `leads` | `token` (único, implícito) | buscar el lead de cada petición del flujo |
| `leads` | `idx_leads_creado` sobre `created_at` | que el equipo comercial ordene los leads por fecha con una consulta manual |
| `resultados` | `id` (clave primaria) | `GET /api/resultados/:id` y `GET /r/:id` |
| `qa_runs` | `idx_qa_runs_estado_fecha` sobre `(estado, created_at)` | «la última corrida cerrada» de `/api/qa/ultima` |

### Esquema

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

### Migraciones

Herramienta: `wrangler d1 migrations` con la carpeta `migrations/` y el binding `DB`. Nombre: `0001_inicial.sql`, escrito a mano (nombre fijado por este blueprint; no lo inventa ninguna herramienta). En local: `npm run db:migrar`. En producción: Alonso corre `npx wrangler d1 migrations apply DB --remote` (lista de lanzamiento, §20.1). Reglas: una migración comiteada no se edita nunca; un cambio de esquema es un archivo nuevo con el número siguiente, escrito a mano, que primero agrega (expandir) y solo en un despliegue posterior elimina (contraer). Una migración destructiva no viaja en el mismo despliegue que el código que la necesita.

### Datos iniciales (seed)

NOT APPLICABLE — el sitio arranca con las tres tablas vacías. Los 60 casos de prueba no se siembran en D1: se leen de `src/data/insumos-jev.json` cada vez que corre `/qa`. Para pruebas manuales, el flujo del navegador crea sus propios leads de ejemplo (correos con dominio `example.com`).

---

## 5. Diseño de la API (API Design)

### Convenciones

- **Ruta base:** `/api`. Sin número de versión: hay un solo cliente (la interfaz del propio sitio). La tarjeta pública vive en `/r/<id>`. Solo `/api/*` y `/r/*` pasan primero por el Worker (`run_worker_first` en `wrangler.jsonc`); todo lo demás lo sirven los archivos estáticos.
- **Respuesta de éxito:** el objeto documentado en cada ruta, sin envoltura, o 204 sin cuerpo.
- **Respuesta de error (una sola forma):** `{ "error": { "code": "NO_ENCONTRADO", "message": "No encontramos lo que buscas." } }` (ejemplo). `VALIDACION` agrega `"campos": ["ruta.del.campo"]`. `JEV_NO_DISPONIBLE` al crear agrega `"token"` en el nivel raíz.
- **Códigos de error:**

| Código | HTTP | Cuándo |
|---|---|---|
| `VALIDACION` | 400 | el cuerpo no cumple el esquema zod |
| `NO_AUTORIZADO` | 401 | falta o es incorrecto el `Authorization: Bearer <QA_TOKEN>` (también si el secreto no está configurado) |
| `NO_ENCONTRADO` | 404 | token, resultado o ruta `/api/*` inexistente |
| `YA_HUBO_ACLARACION` | 409 | `aclarar` por segunda vez (máximo 2 llamadas a JEV) |
| `JEV_NO_DISPONIBLE` | 502 al crear · 409 al finalizar un lead en error | JEV falló dos veces o devolvió una forma irreconocible |
| `LIMITE_EXCEDIDO` | 429 | más de 10 peticiones `POST /api/diagnosticos*` por minuto desde una IP |
| `ERROR_INTERNO` | 500 | excepción no prevista; el cuerpo nunca trae stack ni nombre de excepción |

- **Validación:** zod 4 en `src/worker/esquemas.ts`, aplicada antes de tocar lógica en cada ruta.
- **Paginación:** NOT APPLICABLE — ninguna ruta lista colecciones; `/api/qa/ultima` devuelve una sola corrida.
- **Idempotencia:** `finalizar` devuelve el mismo `resultado_id` si el lead ya está completo; cada lote de `/api/qa/lote` se procesa una sola vez por `run_id` (queda en `lotes_procesados`); `aclarar` responde 409 la segunda vez.
- **Límite de peticiones:** el binding `LIMITE_DIAGNOSTICO` (10 por 60 s, clave = `CF-Connecting-IP`) protege `POST /api/diagnosticos*`. `LIMITE_ACTIVO=0` lo apaga solo para las pruebas e2e. `/api/qa/lote` queda protegida por `QA_TOKEN`, no por el límite, porque gasta saldo y solo la corre quien tiene el token.

### Rutas

| Método | Ruta | Descripción | Acceso | Límite |
|---|---|---|---|---|
| GET | `/api/salud` | `{ ok: true, modo }` con el valor de `JEV_MODE` | público | — |
| POST | `/api/diagnosticos` | crea el lead, hace la 1.ª llamada a JEV y devuelve dolores detectados | público | 10/60 s por IP |
| POST | `/api/diagnosticos/:token/aclarar` | 2.ª llamada a JEV con dolores y metas elegidos | token del lead | 10/60 s por IP |
| POST | `/api/diagnosticos/:token/finalizar` | decide: devuelve seguimientos pendientes o el resultado | token del lead | 10/60 s por IP |
| POST | `/api/diagnosticos/:token/asesor` | marca `quiere_asesor` | token del lead | 10/60 s por IP |
| GET | `/api/resultados/:id` | tarjeta pública sin datos de contacto | público | — |
| GET | `/r/:id` | `resultado.html` con meta OG por programa (HTMLRewriter) | público | — |
| GET | `/api/qa/ultima` | última corrida cerrada de QA | público (solo lectura) | — |
| POST | `/api/qa/lote` | procesa un lote de 10 casos | `Authorization: Bearer <QA_TOKEN>` | token |
| POST | `/api/qa/:run_id/cerrar` | cierra la corrida y guarda totales | `Authorization: Bearer <QA_TOKEN>` | token |

### Endpoints críticos — detalle completo

**1. `POST /api/diagnosticos`**

Cuerpo (zod `crearDiagnostico`):

```json
{
  "contacto": { "nombre": "Alonso Valdés", "email": "alonso@example.com", "whatsapp": "+57 300 000 0000", "empresa": "Acme" },
  "consentimiento": true,
  "perfil": "founder",
  "etapa": "arrancando",
  "reto": "Vendo por referidos y no tengo un proceso comercial ordenado. Ya facturo unos USD 300 mil al año."
}
```

Reglas: `nombre` 2 a 80 caracteres; `email` válido de hasta 120; `whatsapp` con la expresión `^\+?[0-9 ()-]{7,20}$`; `empresa` opcional de hasta 120; `consentimiento` debe ser exactamente `true`; `perfil` uno de los 5; `etapa` uno de los 5; `edad_hijo` entero de 10 a 25; `reto` recortado, de 40 a 1200 caracteres. Con `padre_madre_next` se exige `edad_hijo` y se prohíbe `etapa`; con cualquier otro perfil se exige `etapa`.

Éxito 201:

```json
{
  "token": "Zk3_A9xQ1mP0vB7cD2eF4g",
  "dolores_detectados": [
    { "id": "bloqueo_comercial", "etiqueta": "Pocas ventas", "valor": 0.85 },
    { "id": "ventas_por_referidos", "etiqueta": "Vendes solo por referidos", "valor": 0.85 }
  ],
  "necesita_aclaracion": false,
  "seguimientos": [{ "id": "cliente", "texto": "¿Le vendes a empresas o a personas?", "opciones": [{ "id": "b2b", "etiqueta": "A empresas" }, { "id": "b2c", "etiqueta": "A personas" }] }],
  "ranking_preliminar": { "programa_top": { "id": "Sales_Machine", "nombre": "Sales Machine", "url": "https://30x.com/programas/sales-machine", "fit": 0.85, "etiqueta": "Muy recomendado", "cumple_requisito": true, "condicion_pendiente": null }, "ranking": [] }
}
```

Errores: 400 `VALIDACION` (con `campos`); 429 `LIMITE_EXCEDIDO`; 502 `JEV_NO_DISPONIBLE` con `token` (el lead se guardó con `estado` `error` y `jev_error`, y la persona puede pedir asesor con ese token).
Efectos: una fila en `leads` (`llamadas_jev` 1); una llamada a JEV (más un reintento interno si falla); un log estructurado sin datos personales. **Nada del contacto ni del campo `evidencia` viaja a JEV.**

**2. `POST /api/diagnosticos/:token/aclarar`**

Cuerpo: `{ "dolores": ["capital"], "metas": ["levantar_capital"] }` — `dolores` de 1 a 6 ids de familia, únicos; `metas` de 0 a 5 ids de `METAS`, únicos.
Éxito 200: la misma forma que el 201 de arriba, sin `token`; `dolores_detectados` incluye lo detectado más el primer dolor de cada familia elegida; `necesita_aclaracion` es siempre `false` (no hay tercera llamada).
Errores: 404 `NO_ENCONTRADO` si el token no existe; 409 `YA_HUBO_ACLARACION` si `llamadas_jev` ya es 2; 400 `VALIDACION`; 502 `JEV_NO_DISPONIBLE`.
Efectos: `llamadas_jev` pasa a 2, se reemplazan `jev_respuestas`, se suman latencia y costo.

**3. `POST /api/diagnosticos/:token/finalizar`**

Cuerpo: `{ "dolores_confirmados": ["bloqueo_comercial", "ventas_por_referidos"], "respuestas_seguimiento": { "cliente": "b2b", "reuniones": "menos_20" } }`. `dolores_confirmados` de 0 a 10 ids de `DOLORES_CHIP`; `respuestas_seguimiento` es opcional y, cuando viene (aunque sea `{}`), cierra los seguimientos.
Éxito 200, sin `respuestas_seguimiento` y con seguimientos pendientes: `{ "pendiente": true, "seguimientos": [ { "id": "cliente", "texto": "¿Le vendes a empresas o a personas?", "opciones": [ { "id": "b2b", "etiqueta": "A empresas" } ] } ] }`. No se crea resultado.
Éxito 200, final:

```json
{
  "pendiente": false,
  "resultado_id": "aB3dE5gH7k",
  "resultado": {
    "tipo": "recomendado",
    "requiere_revision": false,
    "programa_top": { "id": "Sales_Machine", "nombre": "Sales Machine", "url": "https://30x.com/programas/sales-machine", "fit": 0.85, "etiqueta": "Muy recomendado", "cumple_requisito": true, "condicion_pendiente": null },
    "ranking": [],
    "familias": [{ "id": "ventas", "nombre": "Ventas", "valor": 0.85 }],
    "chips": ["Pocas ventas", "Vendes solo por referidos"]
  }
}
```

`tipo` es `recomendado`, `preliminar` (el Choice no confirma o la confianza es baja) o `conversacion` (ningún programa llega a 0.40). Errores: 404; 409 `JEV_NO_DISPONIBLE` si el lead quedó en `error`; 400 `VALIDACION`.
Efectos: en un `db.batch`, inserta en `resultados` y actualiza el lead (`estado` `completo`, `programa_top`, `fit_top`, `confianza_choice`, `requiere_revision`, `resultado_id`). Llamarla otra vez devuelve el mismo `resultado_id`. **No llama a JEV.**

**4. `POST /api/diagnosticos/:token/asesor`** — 204 sin cuerpo y `quiere_asesor = 1`; 404 si el token no existe. Sirve también para leads en `error`. No llama a nada externo: no hay webhook ni WhatsApp de 30X.

**5. `GET /api/resultados/:id` y `GET /r/:id`**

`/api/resultados/:id` → 200 `{ id, nombre_pila, tipo, requiere_revision, programa_top, ranking, familias, chips, created_at }`. **Nunca** `email`, `whatsapp`, `empresa` ni `token`. 404 `NO_ENCONTRADO` si el id no existe o no tiene 10 caracteres base62.
`/r/:id` → 200 HTML (`resultado.html`) con `<title>` y `og:title` «Mi ruta en 30X: <Programa>» (o «Hablemos de tu caso en 30X» si `conversacion`), `og:description`, `og:image` = `<origen>/og/<id del programa>.png` (o `default.png`), `og:url`, `og:type` `website`, `twitter:card` `summary_large_image`; todo valor pasa por escape de atributo HTML. 404 con la página 404 si el id no existe.

**6. `POST /api/qa/lote`, `POST /api/qa/:run_id/cerrar`, `GET /api/qa/ultima`**

`lote`: cabecera `Authorization: Bearer <QA_TOKEN>`, cuerpo `{ "run_id"?: string, "lote": number }`. `lotes_total` es el techo de (número de casos ÷ 10). El lote 0 sin `run_id` crea la corrida; un lote mayor que 0 sin `run_id` o un `lote` fuera de rango da 400; un lote repetido no duplica casos. Éxito 200 `{ run_id, lote, procesados, lotes_total }`. Sin token o con token incorrecto: 401 `NO_AUTORIZADO`, sin tocar `qa_runs`.
`cerrar`: con token, calcula `total`, `evaluables`, `aciertos_top1`, `aciertos_top3`, `latencia_p50`, `latencia_p95`, `costo_total` y deja `estado` `cerrado`.
`ultima`: público; 200 `{ "run": { id, created_at, estado, modo, modelo, umbrales, total, evaluables, aciertos_top1, aciertos_top3, latencia_p50, latencia_p95, costo_total, detalle } }` o `{ "run": null }` si no hay corridas cerradas.

---

## 6. Arquitectura del frontend (Frontend Architecture)

### Rutas

| Ruta | Página | Origen de los datos | Acceso |
|---|---|---|---|
| `/` | `index.html` — diagnóstico en pasos (`src/web/diagnostico.ts`, `confirmacion.ts`) | API: `POST /api/diagnosticos*` | público |
| `/r/<id>` | `resultado.html` — tarjeta de resultado (`src/web/resultado.ts`) | `GET /api/resultados/<id>`; el Worker inyecta la meta OG | público |
| `/qa.html` | `qa.html` — matriz de QA (`src/web/qa.ts`) | `GET /api/qa/ultima`; correr de nuevo pide token | lectura pública |
| `/privacidad.html` | `privacidad.html` — aviso de privacidad (HTML estático) | ninguno | público |
| cualquier otra | `404.html` (`not_found_handling: "404-page"`) | ninguno | público |

Con `html_handling: "auto-trailing-slash"`, `/qa.html` y `/privacidad.html` redirigen a `/qa` y `/privacidad`; los enlaces y las pruebas toleran esa redirección.

### Estrategia de renderizado

Todo es HTML estático construido por Vite (`npm run build` → `./dist`) más módulos TypeScript que pintan con DOM en el navegador. La única excepción es `/r/<id>`: el Worker pide `resultado.html` a `ASSETS` y reescribe `<title>` y las meta OG con `HTMLRewriter` (sin caché propia; la tarjeta es inmutable, así que el CDN puede cachearla). El resto de la tarjeta lo pinta el navegador con el JSON de `/api/resultados/<id>`. No hay renderizado de servidor de componentes, ni hidratación, ni scripts inline (la CSP los bloquea).

### Jerarquía de componentes

```
index.html  →  src/web/diagnostico.ts  (cliente: máquina de pasos)
  ├─ comun.ts            fuentes + estilos + el() + api() + medidor() + transicion() + anunciar()
  ├─ paso 0  Contacto            (nombre, correo, WhatsApp, empresa, consentimiento)
  ├─ paso 1  Punto de partida    (5 PERFILES)            ← medidor «Paso 1 de N»
  ├─ paso 2  Etapa / edad del hijo o hija                ← «Paso 2 de N»
  ├─ paso 3  Reto en texto libre (40–1200, 3 ejemplos)   ← «Paso 3 de N» → 1 POST
  └─ confirmacion.ts
       ├─ «Esto entendí de tu reto»      chips quitables + «+ agregar»        (paso 4)
       │    o «Ayúdanos a entenderte mejor»   6 dolores + 5 metas (aria-pressed)  (paso 4, 2.ª llamada)
       └─ seguimientos (0–2 preguntas, una por pantalla)                      (paso 5)  → location.assign("/r/<id>")

resultado.html  →  src/web/resultado.ts
  └─ resultado-vista.ts  tarjeta (nombre, programa, círculo %, chips) + escala + barras por familia + botones
       └─ compartir.ts   LinkedIn · X · WhatsApp sin número · copiar enlace · descargar imagen (html-to-image)
```

Fronteras de cliente y servidor: todo `src/web/` corre en el navegador; el servidor es solo `src/worker/`. El medidor muestra «Paso n de 5» y baja a «de 4» cuando `finalizar` no pide seguimientos.

### Manejo de estado

- **Estado de servidor:** vive en D1; el navegador lo consulta solo por las rutas de §5. No hay biblioteca de caché ni estado global.
- **Estado del flujo:** un objeto en memoria dentro de `diagnostico.ts` (`contacto`, `perfil`, `etapa`, `edad_hijo`, `reto`, `token`, `respuesta`). Recargar la página lo pierde, y está bien: el flujo dura un minuto.
- **Formularios:** validación en el navegador antes de enviar (`Empezar` y `Analizar mi reto` no mandan nada si faltan campos); la API valida de nuevo.
- **Persistencia:** solo `sessionStorage` con la clave `diag:<resultado_id>` → `token`, para que el botón de asesor funcione en la tarjeta del propio dispositivo. Quien abre `/r/<id>` desde otro contexto no tiene token y ve «Haz tu diagnóstico» en lugar del asesor.
- **Deliberadamente fuera del estado:** el `QA_TOKEN` (se lee del campo y se descarta; nunca `localStorage`, `sessionStorage` ni cookie) y cualquier dato de contacto después del envío.

### Estados de carga, vacío y error

| Superficie | Cargando | Vacío | Error |
|---|---|---|---|
| Paso 3 (envío del reto) | botón deshabilitado y texto «JEV está leyendo tu reto…» con `aria-live` | n/a | 502: «Tuvimos un problema al analizar tu reto» y botón «Habla con un asesor de 30X»; 429: se muestra el `message` del error; 400: «Revisa los datos del formulario» |
| Pantalla de confirmación | botón «Confirmar» deshabilitado mientras `finalizar` responde | sin dolores detectados: se muestra «Ayúdanos a entenderte mejor» en lugar de la lista vacía | si `finalizar` falla: mismo mensaje amable y botón de asesor; nunca la palabra «revisión» |
| Tarjeta de resultado | «Cargando tu resultado…» | tipo `conversacion`: «Hablemos: tu caso merece una conversación», botón de asesor y enlace a `https://30x.com/programas` | 404: «No encontramos este resultado» y enlace a `/` |
| `/qa.html` | «Corriendo lote n de N…» | sin corridas: «Todavía no hay corridas guardadas» | token incorrecto: «Token inválido» y la tabla no cambia |

---

## 7. Sistema de diseño (Design System)

Referencia: el estilo de `30x.com` y de la tarjeta de `hackathon.30x.com/ai-builder`: fondo negro, lima como único acento, botones de píldora, una palabra del título en serif itálica. Todos los valores son literales; viven una sola vez en `src/web/estilos.css` como variables y los componentes usan solo nombres de variable (ningún hex ni px suelto dentro de `.ts`).

### Colores

La versión 1 tiene **un solo tema, oscuro**; no existe tema claro. La columna «Claro» queda en «—» a propósito (no hay `prefers-color-scheme: light`).

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | — | `#000000` | fondo de página |
| `--primary` | — | `#E9FF7B` | botón principal (texto negro), círculo del porcentaje, anillo de foco, barras |
| `--primary-fg` | — | `#000000` | texto sobre lima |
| `--surface` | — | `#272917` | tarjetas sobre fondo negro (oliva) |
| `--fg` | — | `#FAFAFA` | texto sobre negro y fondo de secciones claras (crema) |
| `--fg-muted` | — | `#999999` | texto secundario sobre negro (`#5C5C5C` solo si el fondo es crema) |
| `--border` | — | `#999999` | borde de campos y botones secundarios; divisores y fondo del medidor `#3A3B2A` |
| `--destructive` | — | `#FF6B6B` | errores de formulario (siempre con texto, nunca solo color) |
| `--white` | — | `#FFFFFF` | texto de máximo énfasis |

**Contraste (WCAG 2.2 AA: 4.5:1 en texto, 3:1 en texto grande y bordes de componentes).** Medidos con la fórmula de luminancia relativa de WCAG: `#E9FF7B` sobre `#000000` = 19.1:1; `#FAFAFA` sobre `#000000` = 20.1:1; `#999999` sobre `#000000` = 7.4:1; `#999999` sobre `#272917` (el par más riesgoso en tarjetas) = 5.2:1; `#FF6B6B` sobre `#000000` = 7.6:1 y sobre `#272917` = 5.3:1; `#5C5C5C` sobre `#FAFAFA` = 6.4:1. Todos los pares cumplen.

### Tipografía

| Rol | Familia | Tamaño / interlineado | Peso | Tracking |
|---|---|---|---|---|
| Título (display y encabezados) | Inter Variable | 40/44 móvil→56/60 escritorio; encabezados 24/32 y 20/28 | 600 | −0.03em |
| Acento | Instrument Serif, cursiva | el tamaño del título; UNA palabra por título | 400 | 0 |
| Cuerpo y UI | Inter Tight Variable | 16/24 (secundario 14/20; pie y contadores 12/16) | 400 y 500 | 0 |
| Monoespaciado | NOT APPLICABLE — el sitio no muestra código | — | — | — |

**Carga de fuentes:** alojadas en el propio sitio con fontsource (`@fontsource-variable/inter`, `@fontsource-variable/inter-tight`, `@fontsource/instrument-serif/400-italic.css`), importadas desde `src/web/comun.ts`; fontsource declara `font-display: swap`. Ninguna petición a terceros (la CSP tiene `font-src 'self'`). Pila de respaldo: `system-ui, -apple-system, "Segoe UI", sans-serif`; para el acento, `Georgia, serif`.

### Espaciado, radios, elevación

- Escala de espaciado (base 4 px): 4, 8, 12, 16, 24, 32, 48, 64. Sin valores arbitrarios.
- Escala tipográfica: 12 / 14 / 16 / 20 / 24 / 32 / 40 / 56 px.
- Radios: botones, opciones y chips 999 px (píldora); tarjetas 24 px; campos 12 px.
- Sombras: ninguna; la separación se hace con bordes y con el color oliva `--surface`.
- Ancho máximo de contenido: 640 px (la tabla de QA: 960 px, con desplazamiento horizontal propio en 360 px). Puntos de quiebre: 768 px y 1024 px. Diseño mobile-first desde 360 px.

### Movimiento

Entre pasos: opacidad y desplazamiento de 8 px, 200 ms, `cubic-bezier(0.2, 0, 0, 1)`. Hover y presión de botones: 150 ms. Solo se animan `transform` y `opacity`. Con `prefers-reduced-motion: reduce` todas las duraciones pasan a 0 ms. Para dudas de transiciones, `emil-design-eng` (§18).

### Estilo de los componentes

Oscuro, sobrio y directo, como la web de 30X: mucho aire, un solo acento lima, botones de píldora (el primario lima con texto negro, el secundario con borde crema), tarjetas oliva de esquinas amplias y un círculo lima grande con el porcentaje en la tarjeta de resultado. Una pregunta por pantalla; el título de cada una puede resaltar una palabra en serif itálica lima. Si un componente nuevo necesita una sombra, un degradado o un segundo color de acento, no pertenece a este sistema. El pie de cada página dice exactamente: `Prototipo para el Hackatón 30X · no oficial · código abierto en GitHub`.

---

## 8. Autenticación y autorización (Authentication & Authorization)

El sitio **no tiene cuentas, contraseñas ni sesiones**: pedir registro mataría la conversión del embudo. La autorización es por capacidad: quien tiene el valor secreto puede hacer la acción, y se verifica en el servidor en cada petición.

### Proveedor y justificación

Ninguno. Dos secretos cubren todo: el **token del diagnóstico** (22 caracteres aleatorios, para continuar un diagnóstico ya creado) y el **`QA_TOKEN`** (para correr la matriz de QA, que gasta saldo). Un proveedor de identidad sumaría una dependencia y un formulario sin proteger nada que valga la pena.

### Flujos

- **Persona que hace el diagnóstico:** `POST /api/diagnosticos` crea el lead y devuelve su `token`. Con ese `token` se llama a `aclarar`, `finalizar` y `asesor`. El token vive solo en memoria y, al terminar, en `sessionStorage` bajo `diag:<resultado_id>`. No expira por tiempo; deja de servir cuando el lead está `completo` (solo `finalizar` repite su respuesta y `asesor` sigue permitido).
- **Quien ve una tarjeta compartida:** abre `/r/<id>` sin ningún token. Ve el nombre de pila y el resultado; no ve el botón de asesor ni ningún dato de contacto.
- **Quien corre QA:** la lectura de `/qa.html` es pública. «Correr de nuevo» pide el `QA_TOKEN` en un campo de contraseña; cada petición de lote lo manda como `Authorization: Bearer <token>`; el token no se guarda en ningún almacenamiento.
- **Ramas de falla:** token inexistente → 404; `aclarar` repetido → 409; `QA_TOKEN` ausente, vacío o incorrecto → 401 sin tocar la base; si el secreto `QA_TOKEN` no está configurado, **toda** petición de QA recibe 401.

### Protección de rutas

| Superficie | Regla | Se aplica en |
|---|---|---|
| `POST /api/diagnosticos` | pública, con límite de 10 peticiones por minuto por IP | `src/worker/seguridad.ts` (`limitarDiagnosticos`) |
| `POST /api/diagnosticos/:token/*` | exige un token existente (formato `^[A-Za-z0-9_-]{22}$`) | `src/worker/diagnosticos.ts` |
| `GET /api/resultados/:id`, `GET /r/:id` | públicas; solo leen la tabla `resultados` | `src/worker/resultados.ts` |
| `GET /api/qa/ultima` | pública de solo lectura | `src/worker/qa.ts` |
| `POST /api/qa/lote`, `POST /api/qa/:run_id/cerrar` | `Authorization: Bearer <QA_TOKEN>`, comparado en tiempo constante | `src/worker/qa.ts` con `compararSeguro()` |

**Regla de aplicación:** la autorización se verifica en el servidor en cada petición. Un botón oculto no es un permiso: la interfaz oculta el botón de asesor sin token, pero el servidor es quien exige el token.

### Roles y permisos

| Rol | Puede | No puede |
|---|---|---|
| Visitante anónimo | crear un diagnóstico, ver tarjetas públicas, leer la última corrida de QA | leer leads, correr QA, ver contacto de nadie |
| Dueño de un token de diagnóstico | continuar su propio diagnóstico, pedir asesor | ver o modificar el de otra persona |
| Quien tiene el `QA_TOKEN` | correr y cerrar corridas de QA | leer leads (no hay ruta que los devuelva) |
| Equipo comercial de 30X | consultar `leads` con `wrangler d1 execute` (Alonso o quien tenga la cuenta de Cloudflare) | nada por HTTP: no hay panel en v1 |

### Sesiones

NOT APPLICABLE — no hay sesiones ni cookies; el sitio no fija ninguna cookie. La protección contra CSRF no aplica porque no hay credenciales ambientales: cada petición que cambia datos lleva en el cuerpo o en la ruta un secreto que un tercero no puede adivinar, y la CSP incluye `form-action 'self'`.

### Aislamiento multi-inquilino

NOT APPLICABLE — no hay inquilinos ni organizaciones. El aislamiento relevante es entre tablas: la tarjeta pública lee solo `resultados` y esa tabla no tiene columnas de contacto.

---

## 9. ORDEN DE CONSTRUCCIÓN (BUILD ORDER)

Esta es la sección para la que existe todo el blueprint. Quien la siga al pie de la letra y se detenga cuando cada compuerta esté en verde termina el proyecto. Cada paso corre en este orden fijo: **Do → Done when → Verify → Checkpoint**. El Checkpoint va al final a propósito: el tag apunta a un estado que la compuerta ya comprobó.

### Reglas de un paso

1. **Una sentada por paso.** Máximo 5 archivos y 6 criterios de aceptación; si un paso necesita más, son dos pasos.
2. **Cada paso trae los cuatro campos:** `Do`, `Done when`, `Verify` y `Checkpoint`. El Checkpoint es un bloque de shell que hace el commit (con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` al final del mensaje) y crea el tag `step-NN-<slug>`, el punto de retorno del paso siguiente.
3. **Los criterios «Done when» se pueden comprobar con una máquina.** Forma EARS: **WHEN** `<disparador>` **THE SYSTEM SHALL** `<respuesta observable>`. Ninguno espera a una persona, a una cola de revisión ni a una cuenta externa.
4. **«Se ve bien» está prohibido.** Si alguien tiene que mirar la pantalla para decidir, el criterio se convierte en un número, un texto exacto, un código de estado o un valor calculado.
5. **`Verify` es shell literal**, con el resultado esperado en un comentario. Todo comando sale con 0 cuando el paso está bien; las rutas de error documentadas se envuelven (`cmd; test $? -eq 1`) para que la línea decida el código. Ninguna compuerta acepta «sale con cualquier código distinto de cero».
6. **Un paso no está hecho hasta que pasan sus comandos y siguen pasando los de los pasos anteriores.** Los pasos de e2e repiten el Verify del paso anterior que podrían romper.
7. **Nunca se salta un paso.** Si el paso N está bloqueado, se detiene y se reporta; nunca se empieza el N+1.
8. **Ningún paso introduce un requisito que rompa la compuerta de un paso anterior.** Aquí el Worker no valida variables de entorno al arrancar: cada adaptador de JEV valida las suyas cuando se crea (`JEV_CONFIG`), así que ninguna variable es obligatoria antes del paso que la usa (§10, columna «Requerida desde el paso»). Las reglas de lint, de tipos y de formato viven desde el paso 1 en los archivos de `workspace/`, y cada paso deja su código conforme (`npm run format` al final).
9. **Ningún número del Verify se escribió sin contarlo.** Las cifras que aparecen (17 programas, 19 opciones del Choice, 33 preguntas, 10 dolores, 6 familias, 31 Noul, 6 lotes, 54 casos evaluables, 60 casos) se contaron del propio `insumos-jev.json` y de este documento, y donde la cifra no es el requisito las pruebas la leen del JSON en lugar de escribirla.
10. **Ninguna prueba toca el mundo real.** Todo corre con `JEV_MODE=mock` y con `fetch` inyectado; nunca se llama al webhook ni al WhatsApp de 30X, ni a Composio, OpenRouter o Cloudflare. Las acciones que dependen de cuentas de Alonso (iniciar sesión en Cloudflare, crear la base remota, secretos, desplegar, subir a GitHub, la llamada real a JEV) **no son pasos**: están en la lista de lanzamiento de §20.1, cada una con su comprobación automática.

### Cuenta de pasos y de épicas

**Un paso de §9 = una tarea de `tasks.json` = un bloque de tarea en un archivo de `epics/`.** Hay **20 pasos**: 16 de código y 4 compuertas de revisión pedidas por Alonso (pasos 7, 11, 16 y 20), una al cerrar cada bloque de código, antes del despliegue. Se pasa del rango habitual de 10 a 18 pasos porque esas cuatro compuertas son pasos cortos de revisión, no código. Los 20 pasos se reparten en **3 épicas** (7 + 7 + 6), el reparto legal para 20 pasos (entre 3 y 4 épicas, de 5 a 9 pasos cada una):

| Épica | Pasos | Qué entrega |
|---|---|---|
| `01-base-motor-jev` | 1 a 7 | Worker corriendo, D1, catálogo, ranking, flujo del motor, cliente JEV con sus tres adaptadores y la primera revisión |
| `02-api-interfaz` | 8 a 14 | API completa, seguridad, interfaz en pasos y tarjeta de resultado, con la segunda revisión entre la API y la interfaz |
| `03-og-qa-entrega` | 15 a 20 | Imágenes OG, revisión de la interfaz, página y API de QA, calibración, privacidad, README y la revisión final |

Correspondencia con el plan aprobado (E1 a E6): E1 Base = pasos 1 y 2 · E2 Motor y JEV = pasos 2 a 7 · E3 API = pasos 8 a 11 · E4 Interfaz = pasos 12 a 16 · E5 QA = pasos 17, 18 y 20 · E6 Seguridad y entrega = paso 19 y 20 más la lista de lanzamiento de §20.1 (JEV en vivo, despliegue, README y subida a GitHub). El plan agrupaba en 6 épicas de 2 a 5 pasos; la regla de conteo del formato pide 5 a 9 pasos por épica, por eso quedan 3.

**Compuertas de revisión (pedido permanente de Alonso).** Los pasos 7, 11, 16 y 20 invocan, con la herramienta Skill, `anthropic-skills:abogado-del-diablo` (puntos ciegos) y `cyber-neo` (amenazas, OWASP), siguiendo la skill de proyecto `revision-seguridad`. Cada una guarda `docs/revisiones/<NN>-<bloque>-abogado.md` y `docs/revisiones/<NN>-<bloque>-cyber-neo.md` y se cierra con la línea exacta `Hallazgos críticos abiertos: 0`; el Verify del paso lo comprueba con `test -f` y `grep -qx`. Si una de las dos skills no está instalada, se hace la revisión con la misma lista a mano y se escribe `Herramienta: revisión manual (skill no disponible)`. Todo cambio se explica a Alonso en lenguaje simple.

### Orden de bootstrap, en una línea

`copia de workspace/ (trae .gitignore y sus excepciones) → repo git → .dev.vars → npm install → navegador de Playwright → wrangler types`; el repositorio es un clon (ya existe, con su commit de `LICENSE`), así que `git init` solo corre si no hay repositorio; el primer commit propio lo hace el Checkpoint del paso 1, siempre después de que `.gitignore` esté en su sitio (§10).

### Mapa de pasos

| # | Paso | Depende de | Toca | Compuerta |
|---|---|---|---|---|
| 1 | Worker Hono con /api/salud, esquema D1 y test de secretos | — | `src/worker/app.ts`, `src/worker/index.ts`, `migrations/0001_inicial.sql`, `tests/seguridad/secretos.test.ts`, `tests/e2e/salud.spec.ts` | `npm test -- tests/seguridad/secretos.test.ts` |
| 2 | Catálogo, umbrales y armado de la llamada a JEV | 1 | `src/motor/catalogo.ts`, `src/jev/tipos.ts`, `src/jev/preguntas.ts`, `src/data/umbrales.json`, `tests/jev/preguntas.test.ts` | `npm test -- tests/jev/preguntas.test.ts` |
| 3 | Motor: requisitos en código, ranking y etiquetas | 2 | `src/motor/tipos.ts`, `src/motor/requisitos.ts`, `src/motor/ranking.ts`, `tests/motor/ranking.test.ts` | `npm test -- tests/motor/ranking.test.ts` |
| 4 | Motor: dolores, aclaración, seguimientos y Choice | 3 | `src/motor/dolores.ts`, `src/motor/seguimientos.ts`, `src/motor/resultado.ts`, `src/data/seguimientos.json`, `tests/motor/flujo.test.ts` | `npm test -- tests/motor/flujo.test.ts` |
| 5 | Cliente JEV: fábrica, reintento y mock determinista | 2 | `src/jev/cliente.ts`, `src/jev/mock.ts`, `src/jev/mock-keywords.ts`, `tests/jev/mock.test.ts` | `npm test -- tests/jev/mock.test.ts` |
| 6 | Adaptadores composio-proxy y composio-jev con fixtures | 5 | `src/jev/proxy.ts`, `src/jev/composio-jev.ts`, `src/jev/cliente.ts`, `tests/fixtures/openrouter-decision.json`, `tests/jev/adaptadores.test.ts` | `npm test -- tests/jev` |
| 7 | Revisión del bloque motor y JEV (compuerta) | 4, 6 | `docs/revisiones/02-motor-jev-abogado.md`, `docs/revisiones/02-motor-jev-cyber-neo.md`, `src/motor/**`, `src/jev/**` | `npm test` |
| 8 | API POST /api/diagnosticos y /aclarar con D1 y JEV | 7 | `src/worker/esquemas.ts`, `src/worker/repositorio.ts`, `src/worker/diagnosticos.ts`, `src/worker/app.ts`, `tests/e2e/api-diagnosticos.spec.ts` | `npm run test:e2e -- tests/e2e/api-diagnosticos.spec.ts` |
| 9 | API finalizar, asesor, resultados públicos y /r con meta OG | 8 | `src/worker/diagnosticos.ts`, `src/worker/resultados.ts`, `src/worker/repositorio.ts`, `src/worker/app.ts`, `tests/e2e/api-resultados.spec.ts` | `npm run test:e2e -- tests/e2e/api-resultados.spec.ts` |
| 10 | Cabeceras de seguridad, CSP, límite y errores sin stack | 9 | `src/worker/seguridad.ts`, `src/worker/app.ts`, `public/_headers`, `tests/worker/seguridad.test.ts`, `tests/e2e/salud.spec.ts` | `npm test -- tests/worker/seguridad.test.ts` |
| 11 | Revisión del bloque API (compuerta) | 10 | `docs/revisiones/03-api-abogado.md`, `docs/revisiones/03-api-cyber-neo.md`, `src/worker/**`, `migrations/**` | `npm test` |
| 12 | Interfaz: tokens, contacto y pasos 1 a 3 con el medidor | 11 | `src/web/estilos.css`, `src/web/comun.ts`, `src/web/diagnostico.ts`, `index.html`, `tests/e2e/inicio.spec.ts` | `npm run test:e2e -- tests/e2e/inicio.spec.ts` |
| 13 | Interfaz: chips, aclaración y seguimientos (pasos 4 y 5) | 12 | `src/web/confirmacion.ts`, `src/web/diagnostico.ts`, `tests/e2e/confirmacion.spec.ts` | `npm run test:e2e -- tests/e2e/confirmacion.spec.ts` |
| 14 | Interfaz: tarjeta de resultado, escala, asesor y compartir | 13 | `src/web/resultado-vista.ts`, `src/web/compartir.ts`, `src/web/resultado.ts`, `resultado.html`, `tests/e2e/resultado.spec.ts` | `npm run test:e2e -- tests/e2e/resultado.spec.ts` |
| 15 | Imágenes OG por programa generadas con Playwright | 2 | `scripts/og.ts`, `scripts/og-plantilla.html`, `public/og/*.png`, `tests/og/og.test.ts` | `npm test -- tests/og/og.test.ts` |
| 16 | Revisión del bloque interfaz (compuerta) | 14, 15 | `docs/revisiones/04-interfaz-abogado.md`, `docs/revisiones/04-interfaz-cyber-neo.md`, `src/web/**`, `*.html` | `npm test` |
| 17 | QA: evaluación por lotes de los 60 casos y API /api/qa | 16 | `src/qa/evaluar.ts`, `src/worker/qa.ts`, `src/worker/app.ts`, `tests/qa/evaluar.test.ts`, `tests/e2e/api-qa.spec.ts` | `npm test -- tests/qa/evaluar.test.ts` |
| 18 | Página /qa.html y script de calibración de umbrales | 17 | `qa.html`, `src/web/qa.ts`, `tests/e2e/qa-pagina.spec.ts`, `scripts/calibrar.ts`, `tests/scripts/calibrar.test.ts` | `npm test -- tests/scripts/calibrar.test.ts` |
| 19 | Aviso de privacidad, script de JEV en vivo y README | 18 | `privacidad.html`, `scripts/jev-en-vivo.ts`, `tests/scripts/jev-en-vivo.test.ts`, `README.md`, `tests/e2e/privacidad.spec.ts` | `npm run test:e2e -- tests/e2e/privacidad.spec.ts` |
| 20 | Revisión final de QA y entrega (compuerta global) | 19 | `docs/revisiones/05-qa-y-entrega-abogado.md`, `docs/revisiones/05-qa-y-entrega-cyber-neo.md`, `src/**`, `scripts/**` | `npm test` |

Los 20 pasos están en el orden en que se construyen. Cada fila es una tarea de `tasks.json` y un bloque de su épica.

---

#### Paso 01 — Worker Hono con /api/salud, esquema D1 y test de secretos

`E1-T1` · épica `01-base-motor-jev` · prioridad p0 · depende de: nada

**Archivos que toca (Files touched)**
- `src/worker/app.ts` — nuevo — app Hono, tipo `Bindings`, `GET /api/salud`, 404 JSON en `/api/*`
- `src/worker/index.ts` — nuevo — entry del Worker que declara `wrangler.jsonc` (`main`)
- `migrations/0001_inicial.sql` — nuevo — esquema D1 completo, escrito a mano
- `tests/seguridad/secretos.test.ts` — nuevo — escaneo de patrones prohibidos
- `tests/e2e/salud.spec.ts` — nuevo — salud, portada y 404 contra `wrangler dev`

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN `npm run test:e2e -- tests/e2e/salud.spec.ts` pide `GET /api/salud` a `wrangler dev` THE SYSTEM SHALL responder 200 con el cuerpo `{"ok":true,"modo":"mock"}`.
- [ ] WHEN esa misma suite pide `/` y `/no-existe` THE SYSTEM SHALL responder 200 con el texto `Diagnóstico 30X con JEV` y 404 con el texto `Esta página no existe`.
- [ ] WHEN `npm run db:migrar` corre sobre la D1 local THE SYSTEM SHALL salir con 0 y dejar las tablas `leads`, `resultados` y `qa_runs` en `sqlite_master`.
- [ ] WHEN `npm test -- tests/seguridad/secretos.test.ts` escanea `src/`, `public/`, `scripts/`, `migrations/` y los archivos de la raíz THE SYSTEM SHALL encontrar cero coincidencias de los patrones prohibidos y salir con 0.
- [ ] WHEN `npm run typecheck`, `npm run lint` y `npm run build` corren THE SYSTEM SHALL salir con 0 cada uno.
- [ ] WHEN `npm run deploy:prueba` corre (`wrangler deploy --dry-run`) THE SYSTEM SHALL empaquetar `src/worker/index.ts` con los assets de `./dist` y salir con 0.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 02 — Catálogo, umbrales y armado de la llamada a JEV

`E1-T2` · épica `01-base-motor-jev` · prioridad p0 · depende de: Paso 01 (`E1-T1`)

**Archivos que toca (Files touched)**
- `src/motor/catalogo.ts` — nuevo — perfiles, etapas, 17 programas, 6 familias, 10 dolores de chip, metas
- `src/jev/tipos.ts` — nuevo — tipos de JEV, `JevClient`, `JevError`
- `src/jev/preguntas.ts` — nuevo — `construirPreguntas()` y `construirEstado()` desde los insumos
- `src/data/umbrales.json` — nuevo — umbrales iniciales
- `tests/jev/preguntas.test.ts` — nuevo — preguntas, estado y paridad catálogo/insumos

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN `construirPreguntas("founder")` corre THE SYSTEM SHALL devolver una entrada por cada pregunta de `preguntas_jev` en `src/data/insumos-jev.json` (hoy 33), con clave igual al `id` de cada pregunta.
- [ ] WHEN se serializa ese resultado con `JSON.stringify` THE SYSTEM SHALL no contener la clave `evidencia` ni el texto `youtube.com`.
- [ ] WHEN el perfil no es `corporativo` THE SYSTEM SHALL dar a `programa_recomendado` un `criteria` con los 19 ids de opciones del JSON (17 programas + `requiere_revision` + `no_aplica`); WHEN el perfil es `corporativo` THE SYSTEM SHALL dejar solo `Planes_Corporativos`, `Multipliers` y `requiere_revision`.
- [ ] WHEN `construirEstado` recibe una entrada que incluye `contacto` THE SYSTEM SHALL devolver solo claves de {`perfil`, `etapa`, `etapa_nivel`, `edad_hijo`, `reto_principal`, `dolores_elegidos`, `metas_elegidas`}, con `etapa_nivel` idea 0, mvp 1, arrancando 2, creciendo 3, consolidada 4.
- [ ] WHEN `tests/jev/preguntas.test.ts` compara `src/motor/catalogo.ts` con los insumos THE SYSTEM SHALL encontrar los mismos 17 programas en el orden de las opciones del Choice, las mismas 6 familias con sus `se_activa_con` y `programas`, y una URL que empieza con `https://30x.com/` por programa.
- [ ] WHEN se lee `src/data/umbrales.json` THE SYSTEM SHALL contener `umbral_recomendar` 0.6, `umbral_mostrar` 0.4, `umbral_choice` 0.5, `umbral_dolor` 0.6, `umbral_vaga` 0.6 y `delta_hermanos` 0.15.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 03 — Motor: requisitos en código, ranking y etiquetas

`E1-T3` · épica `01-base-motor-jev` · prioridad p0 · depende de: Paso 02 (`E1-T2`)

**Archivos que toca (Files touched)**
- `src/motor/tipos.ts` — nuevo — `Umbrales`, `ContextoRequisitos`, `FilaRanking`, `FilaVisible`, `ResultadoMotor`
- `src/motor/requisitos.ts` — nuevo — tabla de requisitos y `evaluarRequisito()`
- `src/motor/ranking.ts` — nuevo — `fitsDesdeNoul()`, `calcularRanking()`, `etiquetaDe()`, `visibles()`
- `tests/motor/ranking.test.ts` — nuevo — requisitos y ranking

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN `evaluarRequisito` recibe etapa `arrancando` (etapa_nivel 2) THE SYSTEM SHALL marcar `Sales_Machine` como cumplido y `Operaciones_con_AI` como no cumplido con la condición `tener un negocio en etapa Creciendo o Consolidada`.
- [ ] WHEN la facturación respondida es `100k-1M` THE SYSTEM SHALL marcar `Inmersion_Ejecutiva` y `Multipliers` como no cumplidos aunque la etapa sea `consolidada`.
- [ ] WHEN el perfil es `padre_madre_next` THE SYSTEM SHALL marcar `Next` como cumplido con `edad_hijo` 15 y como no cumplido con `edad_hijo` 12.
- [ ] WHEN los fits son Sales_Machine 0.85, LinkedIn_Sales 0.80, AI_Sales 0.45 e Instagram_TikTok 0.15 con etapa `creciendo` THE SYSTEM SHALL ordenarlos así, etiquetarlos `Muy recomendado`, `Muy recomendado` y `Podría servirte`, y dejar a Instagram_TikTok fuera de `visibles()` por tener fit menor que 0.40.
- [ ] WHEN Sales_Machine tiene el fit más alto (0.85) con etapa `idea` y Fundraising_Fundamentals tiene 0.70 THE SYSTEM SHALL dejar a Sales_Machine visible con su condición pendiente y elegir a Fundraising_Fundamentals como primer programa recomendable.
- [ ] WHEN todas las familias de un programa quedan fuera de las confirmadas y hay al menos una familia confirmada THE SYSTEM SHALL usar 0.5 × fit para ese programa; WHEN no hay ninguna familia confirmada THE SYSTEM SHALL no degradar a ningún programa.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 04 — Motor: dolores, aclaración, seguimientos y Choice

`E1-T4` · épica `01-base-motor-jev` · prioridad p0 · depende de: Paso 03 (`E1-T3`)

**Archivos que toca (Files touched)**
- `src/motor/dolores.ts` — nuevo — chips, familias abiertas, aclaración, valores por familia
- `src/motor/seguimientos.ts` — nuevo — selección de bloques y efectos de las respuestas
- `src/motor/resultado.ts` — nuevo — `resolverResultado()`: decisión final
- `src/data/seguimientos.json` — nuevo — banco de preguntas de seguimiento
- `tests/motor/flujo.test.ts` — nuevo — flujo completo del motor

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN los Noul son bloqueo_comercial 0.85 y ventas_por_referidos 0.85 y los otros 8 Noul de dolor valen 0.10 THE SYSTEM SHALL detectar los chips `Pocas ventas` y `Vendes solo por referidos` y abrir solo la familia `ventas`.
- [ ] WHEN respuesta_vaga es mayor que 0.60 o ninguna familia se abre THE SYSTEM SHALL marcar `necesita_aclaracion` true.
- [ ] WHEN Sales_Machine y LinkedIn_Sales quedan a menos de 0.15 de fit con la familia `ventas` confirmada y `respuestas_seguimiento` es null THE SYSTEM SHALL devolver `pendiente` true con la pregunta `cliente` (y `reuniones` solo si cliente es `b2b`), nunca más de 2 preguntas en total.
- [ ] WHEN `respuestas_seguimiento` es `{cliente: "b2b", reuniones: "menos_20"}` y el Choice es `Sales_Machine` con confianza 0.7 THE SYSTEM SHALL devolver `programa_top.id` `Sales_Machine`, tipo `recomendado` y `requiere_revision` false.
- [ ] WHEN la confianza del Choice es menor que 0.50, o el Choice es distinto del n.º 1 después del seguimiento, o datos_incoherentes es mayor que 0.50 THE SYSTEM SHALL devolver `requiere_revision` true y tipo `preliminar` con el mismo n.º 1.
- [ ] WHEN ningún programa llega a fit 0.40 THE SYSTEM SHALL devolver tipo `conversacion` con `programa_top` null.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 05 — Cliente JEV: fábrica, reintento y mock determinista

`E1-T5` · épica `01-base-motor-jev` · prioridad p0 · depende de: Paso 02 (`E1-T2`)

**Archivos que toca (Files touched)**
- `src/jev/cliente.ts` — nuevo — `crearClienteJev()` y `evaluarConReintento()`
- `src/jev/mock.ts` — nuevo — adaptador mock sin red
- `src/jev/mock-keywords.ts` — nuevo — palabras clave del mock por Noul
- `tests/jev/mock.test.ts` — nuevo — mock, fábrica y reintento

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN el mock evalúa el reto `Vendo por referidos y no tengo un proceso comercial ordenado. Ya facturo unos USD 300 mil al año.` THE SYSTEM SHALL devolver 0.85 en bloqueo_comercial, ventas_por_referidos, fit_sales_machine y fit_linkedin_sales, 0.10 en los otros 8 Noul de dolor, y Choice `Sales_Machine` con confianza 0.7.
- [ ] WHEN el mock evalúa dos veces la misma entrada THE SYSTEM SHALL devolver respuestas idénticas, `latencia_ms` 0, `usage.cost` 0 y `modelo` `mock`.
- [ ] WHEN el reto no tiene ninguna palabra clave THE SYSTEM SHALL devolver respuesta_vaga 0.85 y Choice `no_aplica`; WHEN el reto contiene `simular falla de jev` THE SYSTEM SHALL lanzar `JevError` con código `JEV_HTTP`.
- [ ] WHEN `crearClienteJev` recibe modo `mock` THE SYSTEM SHALL no llamar nunca al `fetch` inyectado (el espía registra 0 llamadas).
- [ ] WHEN el cliente inyectado falla una vez y luego responde THE SYSTEM SHALL hacer que `evaluarConReintento` devuelva la segunda respuesta; WHEN falla dos veces THE SYSTEM SHALL lanzar `JevError`.
- [ ] WHEN las preguntas vienen restringidas para `corporativo` THE SYSTEM SHALL responder solo las preguntas recibidas y elegir el Choice dentro de sus `criteria`, con `requiere_revision` si ningún programa permitido coincide.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 06 — Adaptadores composio-proxy y composio-jev con fixtures

`E1-T6` · épica `01-base-motor-jev` · prioridad p0 · depende de: Paso 05 (`E1-T5`)

**Archivos que toca (Files touched)**
- `src/jev/proxy.ts` — nuevo — adaptador `composio-proxy` (producción)
- `src/jev/composio-jev.ts` — nuevo — adaptador `composio-jev` (respaldo, UNVERIFIED)
- `src/jev/cliente.ts` — editar — la fábrica conecta los dos modos nuevos
- `tests/fixtures/openrouter-decision.json` — nuevo — respuesta de OpenRouter con la forma oficial
- `tests/jev/adaptadores.test.ts` — nuevo — adaptadores con fetch inyectado

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN el adaptador composio-proxy evalúa con un `fetch` inyectado THE SYSTEM SHALL hacer un solo POST a `https://backend.composio.dev/api/v3.1/tools/execute/proxy` con cabecera `x-api-key`, `connected_account_id` igual a la cuenta configurada, `endpoint` `https://openrouter.ai/api/alpha/decisions`, `method` `POST` y `body` con `model` `typesafe/jev-1.14`, `state` y `questions`.
- [ ] WHEN el `fetch` responde `{data: <tests/fixtures/openrouter-decision.json>, status: 200}` THE SYSTEM SHALL normalizar los Noul a números, el Choice a `{valor, confianza}`, el Score a `{valor, confianza}` y el costo desde `usage.cost`.
- [ ] WHEN Composio responde `status` 500 dentro de su cuerpo o el HTTP es 401 THE SYSTEM SHALL lanzar `JevError` con código `JEV_HTTP`.
- [ ] WHEN el `fetch` inyectado no responde en 8000 ms THE SYSTEM SHALL abortar y lanzar `JevError` con código `JEV_TIMEOUT` (probado con temporizadores falsos de Vitest).
- [ ] WHEN composio-jev recibe `data` como texto JSON o como objeto con `answers` THE SYSTEM SHALL normalizar a la misma forma; WHEN no reconoce la estructura THE SYSTEM SHALL lanzar `JevError` con código `JEV_FORMATO`.
- [ ] WHEN se inspecciona el cuerpo serializado de la petición THE SYSTEM SHALL no contener las claves `evidencia`, `nombre`, `email`, `whatsapp` ni `empresa`.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 07 — Revisión del bloque motor y JEV (compuerta)

`E1-T7` · épica `01-base-motor-jev` · prioridad p0 · depende de: Paso 04 (`E1-T4`), Paso 06 (`E1-T6`)

**Archivos que toca (Files touched)**
- `docs/revisiones/02-motor-jev-abogado.md` — nuevo — salida de anthropic-skills:abogado-del-diablo
- `docs/revisiones/02-motor-jev-cyber-neo.md` — nuevo — salida de cyber-neo
- `src/motor/**` — editar solo si un hallazgo crítico o alto lo exige
- `src/jev/**` — editar solo si un hallazgo crítico o alto lo exige

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN el paso termina THE SYSTEM SHALL tener `docs/revisiones/02-motor-jev-abogado.md` con la línea `Herramienta: anthropic-skills:abogado-del-diablo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
- [ ] WHEN el paso termina THE SYSTEM SHALL tener `docs/revisiones/02-motor-jev-cyber-neo.md` con la línea `Herramienta: cyber-neo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
- [ ] WHEN se lee cada documento THE SYSTEM SHALL contener la tabla de hallazgos con la cabecera `| # | Severidad | Hallazgo | Estado | Corrección |`.
- [ ] WHEN `npm run typecheck`, `npm run lint` y `npm test` corren después de las correcciones THE SYSTEM SHALL salir con 0, con 0 pruebas fallidas.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 08 — API POST /api/diagnosticos y /aclarar con D1 y JEV

`E2-T1` · épica `02-api-interfaz` · prioridad p0 · depende de: Paso 07 (`E1-T7`)

**Archivos que toca (Files touched)**
- `src/worker/esquemas.ts` — nuevo — esquemas zod de todas las entradas
- `src/worker/repositorio.ts` — nuevo — consultas D1 de `leads` y `resultados`
- `src/worker/diagnosticos.ts` — nuevo — rutas `/api/diagnosticos` y `/:token/aclarar`
- `src/worker/app.ts` — editar — monta las rutas y el `onError` básico
- `tests/e2e/api-diagnosticos.spec.ts` — nuevo — API contra `wrangler dev` en mock

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN `POST /api/diagnosticos` recibe un cuerpo válido con el reto de ventas en modo mock THE SYSTEM SHALL responder 201 con un `token` de 22 caracteres base64url, `dolores_detectados` que incluye `{id: "bloqueo_comercial", etiqueta: "Pocas ventas"}` y `necesita_aclaracion` false.
- [ ] WHEN el cuerpo no trae `consentimiento: true` o el `reto` tiene menos de 40 caracteres THE SYSTEM SHALL responder 400 con `error.code` `VALIDACION`.
- [ ] WHEN el reto es vago (sin palabras clave del mock) THE SYSTEM SHALL responder `necesita_aclaracion` true; WHEN después llega `POST /api/diagnosticos/:token/aclarar` con dolores `["capital"]` y metas `["levantar_capital"]` THE SYSTEM SHALL responder 200 con `dolores_detectados` que incluye `busca_capital`.
- [ ] WHEN `aclarar` se llama por segunda vez con el mismo token THE SYSTEM SHALL responder 409 con `error.code` `YA_HUBO_ACLARACION`; WHEN el token no existe THE SYSTEM SHALL responder 404 con `error.code` `NO_ENCONTRADO`.
- [ ] WHEN el reto contiene `simular falla de jev` THE SYSTEM SHALL responder 502 con `error.code` `JEV_NO_DISPONIBLE` y un `token`, y guardar el lead con `estado` `error` y `jev_error` no nulo.
- [ ] WHEN las pruebas terminan THE SYSTEM SHALL tener en la D1 local al menos un lead con `llamadas_jev` 2 y al menos un lead con `estado` `error` y `jev_error` no nulo.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 09 — API finalizar, asesor, resultados públicos y /r con meta OG

`E2-T2` · épica `02-api-interfaz` · prioridad p0 · depende de: Paso 08 (`E2-T1`)

**Archivos que toca (Files touched)**
- `src/worker/diagnosticos.ts` — editar — `/:token/finalizar` y `/:token/asesor`
- `src/worker/resultados.ts` — nuevo — `GET /api/resultados/:id` y `GET /r/:id` con HTMLRewriter
- `src/worker/repositorio.ts` — editar — consultas de finalizar, asesor y resultado público
- `src/worker/app.ts` — editar — monta `/api/resultados` y `/r`
- `tests/e2e/api-resultados.spec.ts` — nuevo — finalizar, asesor, resultado y /r

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN `POST /api/diagnosticos/:token/finalizar` llega sin `respuestas_seguimiento` para el reto de ventas THE SYSTEM SHALL responder 200 `{pendiente: true, seguimientos}` (arreglo de preguntas) cuya primera pregunta tiene id `cliente`.
- [ ] WHEN se vuelve a llamar con `respuestas_seguimiento` `{cliente: "b2b", reuniones: "menos_20"}` THE SYSTEM SHALL responder 200 con un `resultado_id` de 10 caracteres base62 distinto del token y `resultado.programa_top.id` `Sales_Machine`.
- [ ] WHEN se pide `GET /api/resultados/:id` THE SYSTEM SHALL responder 200 con `nombre_pila` y sin las claves `email`, `whatsapp`, `empresa` ni `token`; WHEN el id no existe THE SYSTEM SHALL responder 404.
- [ ] WHEN se pide `GET /r/:id` THE SYSTEM SHALL responder 200 en HTML con `og:title`, `og:description`, `og:image` igual a `<origen>/og/Sales_Machine.png`, `og:url` y `twitter:card` `summary_large_image`; WHEN el id no existe THE SYSTEM SHALL responder 404.
- [ ] WHEN se llama `POST /api/diagnosticos/:token/asesor` THE SYSTEM SHALL responder 204 y dejar `quiere_asesor` en 1 para ese lead.
- [ ] WHEN `finalizar` se llama otra vez después de completado THE SYSTEM SHALL devolver el mismo `resultado_id`; WHEN se llama sobre un lead con `estado` `error` (reto con `simular falla de jev`) THE SYSTEM SHALL responder 409 con `error.code` `JEV_NO_DISPONIBLE`.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 10 — Cabeceras de seguridad, CSP, límite y errores sin stack

`E2-T3` · épica `02-api-interfaz` · prioridad p0 · depende de: Paso 09 (`E2-T2`)

**Archivos que toca (Files touched)**
- `src/worker/seguridad.ts` — nuevo — constante `CSP`, cabeceras, límite de peticiones, `manejarError`, `compararSeguro()`
- `src/worker/app.ts` — editar — registra cabeceras, límite y el `onError` definitivo
- `public/_headers` — nuevo — mismas cabeceras para los archivos estáticos
- `tests/worker/seguridad.test.ts` — nuevo — cabeceras, límite, errores y comparación segura
- `tests/e2e/salud.spec.ts` — editar — los estáticos y la API devuelven la misma `CSP`

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN `app.request("/api/salud")` corre en Vitest THE SYSTEM SHALL incluir `Content-Security-Policy` igual a la constante `CSP`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`.
- [ ] WHEN `npm run test:e2e -- tests/e2e/salud.spec.ts` pide `GET /`, `GET /no-existe` y `GET /api/salud` a `wrangler dev` THE SYSTEM SHALL recibir en las tres la cabecera `content-security-policy` con exactamente la misma cadena, tomada de `public/_headers` en las dos primeras y de la constante `CSP` en la tercera.
- [ ] WHEN el binding `LIMITE_DIAGNOSTICO` responde `{success: false}` y `LIMITE_ACTIVO` es `1` THE SYSTEM SHALL responder a `POST /api/diagnosticos` con 429, `error.code` `LIMITE_EXCEDIDO` y el mensaje `Recibimos muchas solicitudes desde tu conexión. Espera un minuto y vuelve a intentarlo.`, sin llamar a JEV ni a D1.
- [ ] WHEN `LIMITE_ACTIVO` es `0` THE SYSTEM SHALL no consultar el binding `LIMITE_DIAGNOSTICO`.
- [ ] WHEN un handler lanza una excepción (env de prueba sin `DB`) THE SYSTEM SHALL responder 500 con `error.code` `ERROR_INTERNO` y sin `TypeError`, `Error:` ni líneas que empiecen con `at ` en el cuerpo.
- [ ] WHEN `compararSeguro` compara cadenas iguales, distintas del mismo largo y de distinto largo THE SYSTEM SHALL devolver true, false y false.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 11 — Revisión del bloque API (compuerta)

`E2-T4` · épica `02-api-interfaz` · prioridad p0 · depende de: Paso 10 (`E2-T3`)

**Archivos que toca (Files touched)**
- `docs/revisiones/03-api-abogado.md` — nuevo — salida de anthropic-skills:abogado-del-diablo
- `docs/revisiones/03-api-cyber-neo.md` — nuevo — salida de cyber-neo
- `src/worker/**` — editar solo si un hallazgo crítico o alto lo exige
- `migrations/**` — solo un archivo nuevo si un hallazgo lo exige (nunca editar 0001)

**Do — qué construir**

Compuerta pedida por Alonso. Sigue `.claude/skills/revision-seguridad/SKILL.md`.

1. Alcance: `src/worker/`, `migrations/`, `public/_headers`, `wrangler.jsonc`, `tests/e2e/api-*.spec.ts`.
2. `anthropic-skills:abogado-del-diablo`: abuso del endpoint público (costo de JEV), máximo de 2
   llamadas, idempotencia de `finalizar`, leads en `error`, qué pasa si D1 falla a mitad del `batch`,
   datos personales que pudieran filtrarse a `/r` o a logs.
3. `cyber-neo`: OWASP sobre la API — validación, inyección SQL, XSS en la meta OG, CSP, tokens
   predecibles, rate limit con `CF-Connecting-IP`, mensajes de error, secretos.
4. Guarda, corrige críticos y altos con su prueba, y cierra con `Hallazgos críticos abiertos: 0`.

**Done when — listo cuando**
- [ ] WHEN el paso termina THE SYSTEM SHALL tener `docs/revisiones/03-api-abogado.md` con la línea `Herramienta: anthropic-skills:abogado-del-diablo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
- [ ] WHEN el paso termina THE SYSTEM SHALL tener `docs/revisiones/03-api-cyber-neo.md` con la línea `Herramienta: cyber-neo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
- [ ] WHEN se lee cada documento THE SYSTEM SHALL contener la tabla de hallazgos con la cabecera `| # | Severidad | Hallazgo | Estado | Corrección |`.
- [ ] WHEN `npm run typecheck`, `npm run lint`, `npm test` y `npm run test:e2e` corren después de las correcciones THE SYSTEM SHALL salir con 0, con 0 pruebas fallidas.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 12 — Interfaz: tokens, contacto y pasos 1 a 3 con el medidor

`E2-T5` · épica `02-api-interfaz` · prioridad p0 · depende de: Paso 11 (`E2-T4`)

**Archivos que toca (Files touched)**
- `src/web/estilos.css` — nuevo — tokens y componentes (píldoras, chips, tarjetas, medidor)
- `src/web/comun.ts` — nuevo — fuentes, helpers de DOM, `api()`, medidor, transiciones
- `src/web/diagnostico.ts` — nuevo — máquina de pasos 0 a 3 y envío a la API
- `index.html` — editar — monta la app y carga `src/web/diagnostico.ts`
- `tests/e2e/inicio.spec.ts` — nuevo — pasos 0 a 3, error de JEV, teclado

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN la persona pulsa `Empezar` con nombre, correo o WhatsApp vacíos o sin marcar el consentimiento THE SYSTEM SHALL mostrar un error en texto junto a cada campo faltante y no enviar ninguna petición a `/api/`.
- [ ] WHEN el paso 0 es válido THE SYSTEM SHALL mostrar `¿Cuál es tu punto de partida?` con las 5 opciones `Fundador/a`, `Ejecutivo/a`, `Represento una empresa`, `Tengo un hijo/a adolescente (13-18)` e `Independiente / consultor`, y un `progressbar` con `aria-valuenow` 1.
- [ ] WHEN se elige `Tengo un hijo/a adolescente (13-18)` THE SYSTEM SHALL pedir `Edad de tu hijo/a` (número de 10 a 25) en lugar de la etapa; WHEN se elige otro perfil THE SYSTEM SHALL mostrar las 5 etapas.
- [ ] WHEN el reto tiene menos de 40 caracteres THE SYSTEM SHALL mantener deshabilitado `Analizar mi reto` y mostrar el contador con el formato `n/1200`; WHEN se toca un ejemplo THE SYSTEM SHALL copiar su texto al campo.
- [ ] WHEN se envía el reto THE SYSTEM SHALL hacer exactamente 1 `POST /api/diagnosticos`; WHEN la API responde 502 (reto con `simular falla de jev`) THE SYSTEM SHALL mostrar `Tuvimos un problema al analizar tu reto` y el botón `Habla con un asesor de 30X`.
- [ ] WHEN se navega con Tab THE SYSTEM SHALL dar al control enfocado un `outline-style` distinto de `none` y un `outline-width` de al menos 2px, y el pie `Prototipo para el Hackatón 30X · no oficial · código abierto en GitHub` SHALL estar visible.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 13 — Interfaz: chips, aclaración y seguimientos (pasos 4 y 5)

`E2-T6` · épica `02-api-interfaz` · prioridad p0 · depende de: Paso 12 (`E2-T5`)

**Archivos que toca (Files touched)**
- `src/web/confirmacion.ts` — nuevo — pantalla «Esto entendí», aclaración y seguimientos
- `src/web/diagnostico.ts` — editar — conecta los pasos 4 y 5 y la salida a `/r/<id>`
- `tests/e2e/confirmacion.spec.ts` — nuevo — chips, aclaración, seguimientos, navegación

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN se envía el reto de ventas THE SYSTEM SHALL mostrar `Esto entendí de tu reto` con los chips `Pocas ventas` y `Vendes solo por referidos`, cada uno con su botón de quitar, y `+ agregar` SHALL listar los otros 8 dolores.
- [ ] WHEN se pulsa `Confirmar` THE SYSTEM SHALL llamar a `finalizar` sin respuestas de seguimiento y mostrar `¿Le vendes a empresas o a personas?`; WHEN se elige `A empresas` THE SYSTEM SHALL mostrar `¿Cuántas reuniones de venta tienes por semana?`.
- [ ] WHEN se envía el reto vago THE SYSTEM SHALL mostrar `Ayúdanos a entenderte mejor` con los 6 botones de dolor y los 5 de meta como interruptores con `aria-pressed`.
- [ ] WHEN la persona elige `Necesito inversión` y `Levantar capital` y continúa THE SYSTEM SHALL hacer exactamente 1 `POST` a `/aclarar` y ningún segundo `POST /api/diagnosticos`.
- [ ] WHEN terminan los seguimientos THE SYSTEM SHALL navegar a `/r/<resultado_id>` con un id de 10 caracteres y guardar el token en `sessionStorage` bajo la clave `diag:<resultado_id>`.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 14 — Interfaz: tarjeta de resultado, escala, asesor y compartir

`E2-T7` · épica `02-api-interfaz` · prioridad p0 · depende de: Paso 13 (`E2-T6`)

**Archivos que toca (Files touched)**
- `src/web/resultado-vista.ts` — nuevo — render de la tarjeta, escala y barras por familia
- `src/web/compartir.ts` — nuevo — enlaces de compartir, copiar y descargar imagen
- `src/web/resultado.ts` — nuevo — entrada de `resultado.html` (lee `/r/<id>`)
- `resultado.html` — editar — carga `src/web/resultado.ts`
- `tests/e2e/resultado.spec.ts` — nuevo — resultado, preliminar, compartir, vista pública

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN termina el flujo de ventas con `A empresas` y `Menos de 20` THE SYSTEM SHALL mostrar `Alonso, tu programa es Sales Machine`, un círculo con `85%`, la etiqueta `Muy recomendado` y bajo `Te lo recomendamos porque mencionaste:` los chips confirmados.
- [ ] WHEN hay otros programas con fit de 0.40 o más THE SYSTEM SHALL listarlos en la escala de mayor a menor con nombre, %, barra y, si no cumplen el requisito, `tu reto coincide, pero aún no cumples: <condición>`; y SHALL mostrar una barra por cada una de las 6 familias.
- [ ] WHEN se muestra `Conocer Sales Machine` THE SYSTEM SHALL enlazar a `https://30x.com/programas/sales-machine`; WHEN se pulsa `Habla con un asesor de 30X` THE SYSTEM SHALL hacer `POST /api/diagnosticos/<token>/asesor`, recibir 204 y mostrar `Listo, un asesor te contactará`.
- [ ] WHEN se generan los enlaces de compartir THE SYSTEM SHALL usar `https://www.linkedin.com/sharing/share-offsite/?url=`, `https://twitter.com/intent/tweet?text=` con `url`, `https://wa.me/?text=` sin número y `Copiar enlace` con `<origen>/r/<id>`; WHEN se pulsa `Descargar imagen` THE SYSTEM SHALL disparar una descarga cuyo nombre termina en `.png`.
- [ ] WHEN un perfil `corporativo` con etapa `consolidada` envía `Somos una empresa de logística y queremos vender más a clientes nuevos con un proceso claro este año.` THE SYSTEM SHALL mostrar `Tu ruta preliminar: Sales Machine`, la leyenda `Un asesor de 30X confirma tu ruta`, el botón de asesor como principal y ninguna aparición de la palabra `revisión`.
- [ ] WHEN el mismo `/r/<id>` se abre en un contexto nuevo sin `sessionStorage` THE SYSTEM SHALL mostrar el nombre de pila y el programa, ocultar el botón de asesor y no contener el correo de la persona.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 15 — Imágenes OG por programa generadas con Playwright

`E3-T1` · épica `03-og-qa-entrega` · prioridad p1 · depende de: Paso 02 (`E1-T2`)

**Archivos que toca (Files touched)**
- `scripts/og.ts` — nuevo — genera los PNG de 1200×630
- `scripts/og-plantilla.html` — nuevo — plantilla de la imagen OG
- `public/og/*.png` — generado por `npm run og` — un PNG por programa más `default.png`
- `tests/og/og.test.ts` — nuevo — tamaño y peso de cada PNG

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN `npm run og` corre THE SYSTEM SHALL escribir `public/og/<id>.png` para cada uno de los 17 programas de `src/motor/catalogo.ts` más `public/og/default.png`, y salir con 0.
- [ ] WHEN `npm test -- tests/og/og.test.ts` lee la cabecera IHDR de cada PNG THE SYSTEM SHALL encontrar ancho 1200 y alto 630.
- [ ] WHEN se mide cada PNG THE SYSTEM SHALL pesar menos de 300 KB.
- [ ] WHEN `npm run build` corre THE SYSTEM SHALL copiar `public/og/Sales_Machine.png` y `public/og/default.png` a `dist/og/`.
- [ ] WHEN `npm test -- tests/seguridad/secretos.test.ts` corre THE SYSTEM SHALL seguir en cero coincidencias (los PNG se saltan como binarios).

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 16 — Revisión del bloque interfaz (compuerta)

`E3-T2` · épica `03-og-qa-entrega` · prioridad p1 · depende de: Paso 14 (`E2-T7`), Paso 15 (`E3-T1`)

**Archivos que toca (Files touched)**
- `docs/revisiones/04-interfaz-abogado.md` — nuevo — salida de anthropic-skills:abogado-del-diablo
- `docs/revisiones/04-interfaz-cyber-neo.md` — nuevo — salida de cyber-neo
- `src/web/**` — editar solo si un hallazgo crítico o alto lo exige
- `*.html` — editar solo si un hallazgo crítico o alto lo exige

**Do — qué construir**

Compuerta pedida por Alonso. Sigue `.claude/skills/revision-seguridad/SKILL.md`.

1. Alcance: `src/web/`, `index.html`, `resultado.html`, `qa.html`, `privacidad.html`, `404.html`,
   `public/`, `scripts/og.ts`, `scripts/og-plantilla.html`.
2. `anthropic-skills:abogado-del-diablo`: claridad de cada pantalla, qué ve la persona si JEV falla,
   si nada aplica o si el resultado es preliminar (nunca la palabra «revisión»), accesibilidad
   (teclado, lector de pantalla, 200% de zoom, 360px), textos de compartir.
3. `cyber-neo`: XSS (todo texto del servidor entra con `textContent`, nunca `innerHTML`), CSP,
   token en `sessionStorage`, enlaces externos con `rel="noopener"`, datos personales en `/r`.
4. Guarda, corrige críticos y altos con su prueba, y cierra con `Hallazgos críticos abiertos: 0`.

**Done when — listo cuando**
- [ ] WHEN el paso termina THE SYSTEM SHALL tener `docs/revisiones/04-interfaz-abogado.md` con la línea `Herramienta: anthropic-skills:abogado-del-diablo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
- [ ] WHEN el paso termina THE SYSTEM SHALL tener `docs/revisiones/04-interfaz-cyber-neo.md` con la línea `Herramienta: cyber-neo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
- [ ] WHEN se lee cada documento THE SYSTEM SHALL contener la tabla de hallazgos con la cabecera `| # | Severidad | Hallazgo | Estado | Corrección |`.
- [ ] WHEN `npm run typecheck`, `npm run lint`, `npm test` y `npm run test:e2e` corren después de las correcciones THE SYSTEM SHALL salir con 0, con 0 pruebas fallidas.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 17 — QA: evaluación por lotes de los 60 casos y API /api/qa

`E3-T3` · épica `03-og-qa-entrega` · prioridad p1 · depende de: Paso 16 (`E3-T2`)

**Archivos que toca (Files touched)**
- `src/qa/evaluar.ts` — nuevo — `evaluarCaso()` y `totalizar()`, puros
- `src/worker/qa.ts` — nuevo — rutas `/api/qa/*` y consultas de `qa_runs`
- `src/worker/app.ts` — editar — monta `/api/qa`
- `tests/qa/evaluar.test.ts` — nuevo — aciertos, casos especiales, totales
- `tests/e2e/api-qa.spec.ts` — nuevo — token, lotes, cierre, lectura pública

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN `POST /api/qa/lote` llega sin `Authorization: Bearer` válido THE SYSTEM SHALL responder 401 con `error.code` `NO_AUTORIZADO` y no crear filas en `qa_runs`.
- [ ] WHEN se envía el lote 0 con el token válido THE SYSTEM SHALL crear un run `en_curso` y procesar los primeros 10 casos de `casos_prueba`, devolviendo `run_id`, `procesados` 10 y `lotes_total` igual a ceil(casos / 10) (hoy 6).
- [ ] WHEN se envían los lotes restantes de ese `run_id` y luego `POST /api/qa/:run_id/cerrar` THE SYSTEM SHALL guardar `total` igual al número de casos (hoy 60), `estado` `cerrado`, `aciertos_top1`, `aciertos_top3`, `latencia_p50`, `latencia_p95` y `costo_total`.
- [ ] WHEN se pide `GET /api/qa/ultima` sin token THE SYSTEM SHALL responder 200 con el último run cerrado, cuyo `detalle` trae por caso `id`, `tipo`, `esperado`, `top1`, `top3`, `acierto_top1`, `acierto_top3`, `confianza_choice`, `latencia_ms` y `costo_usd`.
- [ ] WHEN `evaluarCaso` puntúa un caso cuyo esperado es `requiere_revision` o `no_aplica` THE SYSTEM SHALL contar acierto si el resultado trae `requiere_revision` true; y los casos sin `esperado.programa_recomendado` SHALL quedar fuera de `evaluables` (hoy 54).
- [ ] WHEN el mismo lote se envía dos veces para un run THE SYSTEM SHALL no duplicar sus casos en `detalle`.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 18 — Página /qa.html y script de calibración de umbrales

`E3-T4` · épica `03-og-qa-entrega` · prioridad p1 · depende de: Paso 17 (`E3-T3`)

**Archivos que toca (Files touched)**
- `qa.html` — editar — carga `src/web/qa.ts`
- `src/web/qa.ts` — nuevo — tabla de la última corrida y botón «Correr de nuevo»
- `tests/e2e/qa-pagina.spec.ts` — nuevo — tabla, token, error de token
- `scripts/calibrar.ts` — nuevo — búsqueda en rejilla fuera de línea
- `tests/scripts/calibrar.test.ts` — nuevo — rejilla, división calibración/validación, escritura

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN `/qa.html` carga después de un run cerrado THE SYSTEM SHALL mostrar una fila por caso, los totales, p50 y p95 de latencia, costo total, modelo, modo, umbrales y el texto `hoy en 30X el programa lo elige la persona en 2,325 de 2,325 caminos; la etapa nunca cambia el resultado`.
- [ ] WHEN se pulsa `Correr de nuevo` con el token `token-e2e-local` THE SYSTEM SHALL enviar `Authorization: Bearer` en cada petición de lote, procesar todos los lotes, cerrar el run y refrescar la tabla, dejando `localStorage` vacío.
- [ ] WHEN se usa un token equivocado THE SYSTEM SHALL mostrar `Token inválido` y no cambiar la tabla.
- [ ] WHEN la página muestra la meta THE SYSTEM SHALL decir `Meta de calibración: ≥ 90 % top-1 y 100 % top-3 sobre los casos evaluables` junto a los aciertos como `n/evaluables`.
- [ ] WHEN `npm test -- tests/scripts/calibrar.test.ts` corre THE SYSTEM SHALL elegir umbrales usando solo los casos cuyo id no empieza con `parafrasis-` y reportar la precisión de validación sobre los que sí empiezan con `parafrasis-`.
- [ ] WHEN `node --experimental-strip-types scripts/calibrar.ts .wrangler/qa-export-minimo.json` corre (el archivo lo deja `tests/scripts/calibrar.test.ts`) THE SYSTEM SHALL salir con 0, imprimir la tabla de las 10 mejores combinaciones y no escribir ningún archivo; WHEN corre con `--escribir --salida <archivo temporal>` THE SYSTEM SHALL escribir ahí los umbrales elegidos con las 6 claves.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 19 — Aviso de privacidad, script de JEV en vivo y README

`E3-T5` · épica `03-og-qa-entrega` · prioridad p1 · depende de: Paso 18 (`E3-T4`)

**Archivos que toca (Files touched)**
- `privacidad.html` — editar — aviso corto
- `scripts/jev-en-vivo.ts` — nuevo — UNA llamada real a JEV, protegida
- `tests/scripts/jev-en-vivo.test.ts` — nuevo — guardas y una llamada con fetch inyectado
- `README.md` — nuevo — qué es, demo, local en mock, conectar JEV, QA, aviso
- `tests/e2e/privacidad.spec.ts` — nuevo — contenido del aviso

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN `/privacidad.html` carga THE SYSTEM SHALL decir qué se guarda (nombre, correo, WhatsApp, empresa, reto y resultado), para qué, que es un prototipo no oficial del Hackatón 30X y `escríbenos desde el repositorio de GitHub (issues)` con enlace a `https://github.com/avg031396-sys/diagnostico-30x-jev/issues`, y SHALL no contener ninguna dirección de correo.
- [ ] WHEN `JEV_MODE=mock node --experimental-strip-types scripts/jev-en-vivo.ts` corre THE SYSTEM SHALL salir con código 2 e imprimir `JEV_MODE debe ser composio-proxy` sin ninguna llamada de red.
- [ ] WHEN `npm test -- tests/scripts/jev-en-vivo.test.ts` ejecuta `ejecutar()` con `JEV_MODE` `composio-proxy`, claves ficticias y un `fetch` inyectado THE SYSTEM SHALL hacer exactamente 1 petición e imprimir programa, confianza, latencia y costo; WHEN faltan las claves de Composio THE SYSTEM SHALL devolver código 3 sin llamar a `fetch`.
- [ ] WHEN se lee `README.md` THE SYSTEM SHALL contener los títulos `## Qué es`, `## Demo`, `## Correr local en modo mock`, `## Conectar JEV` y `## Resultados de /qa`, y el texto `prototipo no oficial`.
- [ ] WHEN `npm test` corre completo THE SYSTEM SHALL salir con 0, incluido el escaneo de secretos sobre los archivos nuevos.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

#### Paso 20 — Revisión final de QA y entrega (compuerta global)

`E3-T6` · épica `03-og-qa-entrega` · prioridad p1 · depende de: Paso 19 (`E3-T5`)

**Archivos que toca (Files touched)**
- `docs/revisiones/05-qa-y-entrega-abogado.md` — nuevo — salida de anthropic-skills:abogado-del-diablo
- `docs/revisiones/05-qa-y-entrega-cyber-neo.md` — nuevo — salida de cyber-neo
- `src/**` — editar solo si un hallazgo crítico o alto lo exige
- `scripts/**` — editar solo si un hallazgo crítico o alto lo exige

**Do — qué construir**

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

**Done when — listo cuando**
- [ ] WHEN el paso termina THE SYSTEM SHALL tener `docs/revisiones/05-qa-y-entrega-abogado.md` con la línea `Herramienta: anthropic-skills:abogado-del-diablo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
- [ ] WHEN el paso termina THE SYSTEM SHALL tener `docs/revisiones/05-qa-y-entrega-cyber-neo.md` con la línea `Herramienta: cyber-neo` (o `Herramienta: revisión manual (skill no disponible)`) y la línea exacta `Hallazgos críticos abiertos: 0`.
- [ ] WHEN se lee cada documento THE SYSTEM SHALL contener la tabla de hallazgos con la cabecera `| # | Severidad | Hallazgo | Estado | Corrección |`.
- [ ] WHEN corre la compuerta automática completa (`npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`, `npm run deploy:prueba`) THE SYSTEM SHALL salir con 0 en cada comando.

**Verify — comprobar** (desde la raíz del proyecto; cada línea sale con 0 cuando el paso está bien)

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

---

### 9.1 Paridad y traspaso (Parity and cutover)

NOT APPLICABLE — proyecto nuevo, no se reemplaza ningún sistema. El diagnóstico actual de 30X no se toca, no se copia y no se compara lado a lado (Non-Goal de §1).

---

## 10. Preparación del entorno (Environment Setup)

### Requisitos previos

| Herramienta | Versión | Cómo comprobarla |
|---|---|---|
| Node.js | 24.x LTS (el proyecto exige `>=22.12.0`; el equipo usa 24.14.1) | `node -v` |
| npm | el que trae Node | `npm -v` |
| Git | cualquiera reciente (2.28 o más: usa `git init -b`) | `git --version` |
| Git Bash (en Windows) | el que instala Git para Windows; todos los comandos de este documento son de bash | `bash --version` |
| GitHub CLI (`gh`) | sesionado como `avg031396-sys` (solo para clonar y, al final, que Alonso suba) | `gh auth status` |

Wrangler, Vite, Vitest, Playwright y Biome **no** se instalan globalmente: viven en `node_modules` y se usan con `npm run` o `npx`. El navegador Chromium de Playwright lo baja el Bootstrap.

### Cuentas que se necesitan

| Cuenta | Para qué | Primer paso que la usa | Quién la prepara |
|---|---|---|---|
| GitHub (`avg031396-sys`) | clonar `diagnostico-30x-jev` y, al final, subir el código | Bootstrap (clonar) y §20.1 (subir) | ya sesionada |
| Cloudflare | desplegar el Worker, D1 y el límite de peticiones | ninguno de los 20 pasos: solo la lista de lanzamiento de §20.1 | Alonso (`npx wrangler login`) |
| Composio (conexión a OpenRouter) | la única llamada real a JEV | ninguno de los 20 pasos: solo `npm run jev:vivo` en la lista de lanzamiento | Alonso: clave de API con permiso «Proxy execute» e id exacto de la conexión; tope de 5 USD en su clave de OpenRouter |

Durante los 20 pasos **no se necesita ninguna cuenta**: todo corre local en modo `mock`.

### Variables de entorno

| Variable | Para qué sirve | Dónde se consigue | Requerida desde el paso | ¿Secreta? |
|---|---|---|---|---|
| `JEV_MODE` | elige el adaptador: `mock`, `composio-proxy` o `composio-jev` | `wrangler.jsonc` (`vars`, valor `mock`); `.dev.vars` también la trae | 1 (`/api/salud` la devuelve) | no |
| `JEV_MODEL` | modelo fijo de JEV: `typesafe/jev-1.14` (nunca un alias `latest`) | `wrangler.jsonc` (`vars`) | 6 (la leen los adaptadores) | no |
| `LIMITE_ACTIVO` | `1` activa el límite de peticiones; `0` lo apaga (solo e2e) | `wrangler.jsonc` (`vars`, valor `1`); `playwright.config.ts` pasa `0` | 10 | no |
| `QA_TOKEN` | contraseña para correr `/qa`; local de prueba: `token-e2e-local` | `.dev.vars` (copia de `.dev.vars.example`) y `--var` de `playwright.config.ts`; en producción `wrangler secret put QA_TOKEN` | 17 | sí (en producción) |
| `COMPOSIO_API_KEY` | clave de Composio para `composio-proxy` y `composio-jev` | consola de Composio, con permiso «Proxy execute» | solo en la lista de lanzamiento (no la usa ningún paso) | sí |
| `COMPOSIO_OPENROUTER_ACCOUNT_ID` | `connected_account_id` de la conexión de OpenRouter en Composio | consola de Composio → conexiones | solo en la lista de lanzamiento | sí |
| `COMPOSIO_JEV_ACCOUNT_ID` | `connected_account_id` del toolkit `jev` (solo el respaldo `composio-jev`) | consola de Composio | solo si se usa el respaldo | sí |
| `JEV_MODEL_COMPOSIO` | modelo para el respaldo `composio-jev`; si falta o está vacío usa `JEV_MODEL` | opcional | opcional | no |
| `WRANGLER_SEND_METRICS` | apaga la telemetría y las preguntas interactivas de wrangler; va escrita en el propio comando del Bootstrap (`WRANGLER_SEND_METRICS=false npx wrangler types --strict-vars=false`) y `wrangler.jsonc` trae `send_metrics: false` para los scripts de npm | no se consigue: se escribe `false` | Bootstrap | no |

No hay variables de servicios locales (no hay Docker ni base externa): la D1 local la crea `wrangler` dentro de `.wrangler/`.

`.dev.vars.example` se comita con valores ficticios y todas las llaves presentes; `.dev.vars` (local) está en `.gitignore`. Valores locales de prueba: `JEV_MODE=mock` y `QA_TOKEN=token-e2e-local` (obviamente de juguete, no un secreto real).

**Columna «Requerida desde el paso».** El Worker **no** valida variables al arrancar. Cada adaptador de JEV valida las suyas cuando se crea y falla con `JEV_CONFIG`; `src/worker/qa.ts` responde 401 siempre si falta `QA_TOKEN`. Por eso ninguna variable es obligatoria antes del paso que la usa, y ningún paso rompe la compuerta de uno anterior por una variable faltante.

**Listar una variable aquí no la carga.** `wrangler dev` y `wrangler d1` leen `wrangler.jsonc` y `.dev.vars` por sí solos; `playwright.config.ts` pasa sus variables con `--var` en el comando de `wrangler dev`; `scripts/jev-en-vivo.ts` trae su propio lector de `.dev.vars` (con `process.env` por encima); `scripts/calibrar.ts`, `scripts/og.ts` y Vitest no leen variables de entorno. Ver el cuadro de cargadores de variables en §19.6.

### Archivos que deben quedar comiteados

Archivos que este blueprint llama «comiteados» y que el `.gitignore` emitido no excluye:

| Archivo | Por qué se comitea | Línea de excepción en `.gitignore` |
|---|---|---|
| `.dev.vars.example` | llaves del entorno con valores ficticios | `!.dev.vars.example`, ya escrita **después** del patrón `.dev.vars.*` |
| `.gitignore` | las reglas mismas | — no coincide con ningún patrón |
| `package.json`, `package-lock.json` | dependencias exactas y reproducibles | — no coinciden con ningún patrón |
| `wrangler.jsonc`, `biome.json`, `tsconfig.json`, `tsconfig.dom.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts` | configuración que los comandos de Verify necesitan | — no coinciden con ningún patrón |
| `.claude/settings.json`, `.claude/rules/*.md`, `.claude/skills/*/SKILL.md`, `CLAUDE.md`, `AGENTS.md` | configuración de agentes | — `.claude/` no está ignorada |
| `migrations/0001_inicial.sql` | el esquema | — no coincide con ningún patrón |
| `public/og/*.png` y `public/_headers` | imágenes y cabeceras que se publican | — `dist/` está ignorada pero `public/` no |
| `src/data/insumos-jev.json` | insumo de solo lectura | — no coincide con ningún patrón |
| `docs/revisiones/*.md` | evidencia de las compuertas | — no coincide con ningún patrón |

Los patrones que el `.gitignore` sí excluye son `node_modules/`, `dist/`, `.wrangler/`, `worker-configuration.d.ts`, `playwright-report/`, `test-results/`, `.dev.vars`, `.dev.vars.*` (menos el `.example`), `.env` y `.env.*` (menos `.env.example`). Las comprobaciones por archivo (`git ls-files --error-unmatch` y `git check-ignore`) están en §20.1, que corre después de que todos los pasos hayan comiteado.

### Bootstrap

```bash
# Corre desde la raíz del clon (la carpeta que contiene blueprints/diagnostico-30x-jev/). Se puede correr dos veces: cada línea sale con 0 si ya estaba hecha.
# order matters: workspace (trae .gitignore + excepciones, biome.json, wrangler.jsonc) → repo git → .dev.vars → npm install → navegador → tipos
# El proyecto es un CLON del repositorio de GitHub: ya existe y trae su commit inicial (LICENSE). `git init` solo corre si no hay repositorio (por ejemplo, una carpeta temporal).
# El primer commit PROPIO no está aquí: lo hace el Checkpoint del paso 1, cuando .gitignore ya está en su sitio. Ningún paso de §9 crea .gitignore.
test -d blueprints/diagnostico-30x-jev/workspace
node -e "require('node:fs').cpSync('blueprints/diagnostico-30x-jev/workspace', '.', { recursive: true, force: false, errorOnExist: false })"   # force:false = no pisa nunca un archivo que el build ya cambió (package.json, package-lock.json, tsconfig, biome.json); sale 0 aunque todo exista
node -e "const fs = require('node:fs'); if (!fs.existsSync('.dev.vars')) fs.copyFileSync('.dev.vars.example', '.dev.vars')"   # solo si no existe: no pisa tu .dev.vars
test -f .gitignore && grep -qxF '!.dev.vars.example' .gitignore && grep -qxF 'node_modules/' .gitignore   # la copia no pisa archivos que el clon ya traiga: si el clon trajo un .gitignore propio (sin estas líneas), esto falla en voz alta y hay que fusionarlo a mano antes del primer commit
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || git init -b main   # no hace nada si ya hay repositorio (el caso normal: el clon)
git config user.name >/dev/null 2>&1 || git config user.name "Constructor de Claude"   # solo si falta identidad; sale 0 en ambos caminos
git config user.email >/dev/null 2>&1 || git config user.email "constructor@example.com"
npm install   # crea package-lock.json la primera vez; la segunda es un no-op
npx playwright install chromium   # navegador para las e2e y para npm run og; no pregunta nada
WRANGLER_SEND_METRICS=false npx wrangler types --strict-vars=false   # genera worker-configuration.d.ts (ignorado por git); sin telemetría ni preguntas
```

Qué hace una segunda corrida: la copia no pisa ningún archivo existente (tampoco los que trajo el clon, como `LICENSE`, `README.md` o un `.gitignore` propio); `.dev.vars` no se vuelve a copiar; `git init` no corre; `npm install` no cambia el lockfile; las dos instalaciones de navegador y tipos son idempotentes. **Archivos que esa copia nunca sobrescribe una vez que existen:** `package.json`, `package-lock.json`, `wrangler.jsonc`, `biome.json`, los tsconfig y todo lo demás de `workspace/`. Ninguna línea toca cuentas reales: no hay `wrangler login`, ni `deploy`, ni `d1 create` remoto, ni `--remote`.

Si en un paso hace falta restaurar un archivo de `workspace/` a su versión original, se copia a mano ese archivo; el Bootstrap no lo hace a propósito.

---

## 11. Dependencias (Dependencies)

**Esta es la única tabla de la prosa donde aparece una versión.** (Las excepciones son los archivos ejecutables emitidos en §19, que llevan el valor real: `package.json`, `wrangler.jsonc`.) Todas las versiones de las tablas salieron de `npm view <paquete> version` el **2026-10-17** (estado VERIFIED); la fuente de cada una es su página en `https://www.npmjs.com/package/<paquete>`. Los pines son exactos, sin `^` (el `.npmrc` emitido tiene `save-exact=true`). Dos peers se leyeron el mismo día: `@hono/zod-validator` 0.9.1 acepta zod `^3.25 || ^4` y hono `>=4.11.2`; `vitest` 5.0.5 acepta vite `^6.4 || ^7 || ^8` y `@types/node` `^22 || >=24`, y sus engines de Node son `^22.12 || ^24 || >=26`. Vite 8.3.4 pide Node `^20.19 || >=22.12`; wrangler 4.151.1 pide Node `>=22`.

**Cómo se instalan.** No hay un `npm install <paquete>` por paquete: los pines están escritos en el `package.json` de `workspace/` (§19.6) y los instala, todos juntos, el `npm install` del Bootstrap de §10. Esa es la celda «Instalado por» de cada fila. Ningún paso de §9 agrega dependencias.

### Dependencias de ejecución

| Paquete | Versión | Fuente | Verificado | Instalado por | Para qué |
|---|---|---|---|---|---|
| hono | 4.13.13 | https://www.npmjs.com/package/hono | 2026-10-17 | §10 Bootstrap (`npm install` lee `package.json`) | enrutador del Worker (`src/worker/*`) |
| zod | 4.6.7 | https://www.npmjs.com/package/zod | 2026-10-17 | §10 Bootstrap (`npm install`) | validación de todas las entradas HTTP (`src/worker/esquemas.ts`) |
| @hono/zod-validator | 0.9.1 (exacta) | https://www.npmjs.com/package/@hono/zod-validator | 2026-10-17 | §10 Bootstrap (`npm install`) | `zValidator` en cada ruta (paso 8) |
| html-to-image | 1.11.13 | https://www.npmjs.com/package/html-to-image | 2026-10-17 | §10 Bootstrap (`npm install`) | botón «Descargar imagen» (`src/web/compartir.ts`, paso 14) |
| @fontsource-variable/inter | 5.3.0 | https://www.npmjs.com/package/@fontsource-variable/inter | 2026-10-17 | §10 Bootstrap (`npm install`) | títulos, alojados en el propio sitio (`src/web/comun.ts`, paso 12; también las imágenes OG, paso 15) |
| @fontsource-variable/inter-tight | 5.3.0 | https://www.npmjs.com/package/@fontsource-variable/inter-tight | 2026-10-17 | §10 Bootstrap (`npm install`) | cuerpo y UI |
| @fontsource/instrument-serif | 5.3.0 | https://www.npmjs.com/package/@fontsource/instrument-serif | 2026-10-17 | §10 Bootstrap (`npm install`) | la palabra clave en cursiva |

### Dependencias de desarrollo

| Paquete | Versión | Fuente | Verificado | Instalado por | Para qué |
|---|---|---|---|---|---|
| wrangler | 4.151.1 | https://www.npmjs.com/package/wrangler | 2026-10-17 | §10 Bootstrap (`npm install`) | `wrangler dev`, D1 local, `wrangler types`, `deploy --dry-run` |
| vite | 8.3.4 | https://www.npmjs.com/package/vite | 2026-10-17 | §10 Bootstrap (`npm install`) | build multipágina a `./dist` |
| typescript | 7.0.2 | https://www.npmjs.com/package/typescript | 2026-10-17 | §10 Bootstrap (`npm install`) | `tsc` como verificador de tipos (binario `tsc`); versión mayor nueva: el paso 1 la ejerce |
| vitest | 5.0.5 | https://www.npmjs.com/package/vitest | 2026-10-17 | §10 Bootstrap (`npm install`) | pruebas unitarias en Node; versión mayor nueva: el paso 1 la ejerce |
| @playwright/test | 1.64.1 | https://www.npmjs.com/package/@playwright/test | 2026-10-17 | §10 Bootstrap (`npm install`; el navegador con `npx playwright install chromium`) | e2e, pruebas de API e imágenes OG |
| @biomejs/biome | 2.5.15 | https://www.npmjs.com/package/@biomejs/biome | 2026-10-17 | §10 Bootstrap (`npm install`) | lint y formato |
| @types/node | 26.6.5 | https://www.npmjs.com/package/@types/node | 2026-10-17 | §10 Bootstrap (`npm install`) | tipos de `node:fs`, `node:path`, `node:url` en pruebas y scripts |

### Runtimes y servicios (sin paso que los instale)

| Elemento | Versión | Fuente | Verificado | Instalado por | Para qué |
|---|---|---|---|---|---|
| Node.js | 24.x LTS (`engines` `>=22.12.0`; local 24.14.1) | https://nodejs.org/en/about/previous-releases | 2026-10-17 | la persona que construye (§10 Requisitos previos) | runtime de herramientas y scripts; `.nvmrc` dice `24` |
| Cloudflare Workers, D1, Static Assets, límite de peticiones | servicio alojado, sin versión | https://developers.cloudflare.com/workers/ | — | no aplica: se usan con `wrangler dev` y, en el lanzamiento, con la cuenta de Alonso | servidor, base y estáticos |
| JEV (`typesafe/jev-1.14`) vía Composio y OpenRouter | servicio alojado; el modelo se fija por nombre, no por versión de paquete | https://docs.typesafe.ai/introduction | — | no aplica: lo llama el Worker en producción; en desarrollo se usa `mock` | decisiones tipadas |

### Comprobado al armar el blueprint (2026-10-18)

Se corrió el Bootstrap de §10 y los pasos 1 y 2 en un directorio temporal, con los pines exactos de arriba. Resultado: `npm install` instaló sin errores; `wrangler types --strict-vars=false` generó `worker-configuration.d.ts` con `DB: D1Database`, `LIMITE_DIAGNOSTICO: RateLimit` y `ASSETS: Fetcher` (la clave `ratelimits` y su tipo existen en wrangler 4.151.1); `tsc` 7.0.2 pasó los dos proyectos de TypeScript; Biome 2.5.15 pasó `lint` con el bundle presente en `blueprints/`; Vitest 5.0.5 corrió 18 pruebas en verde (incluida la importación de JSON con `with { type: "json" }`); `vite build` con `build.rolldownOptions` generó las 5 páginas en `./dist`; `wrangler dev` sirvió `/api/salud`, la portada y la página 404 (`not_found_handling: "404-page"` fue aceptado y devolvió 404 real); `wrangler d1 migrations apply DB --local` creó `leads`, `resultados` y `qa_runs`; `wrangler deploy --dry-run` empaquetó el Worker (también con `preguntas.ts` importando el JSON); la segunda corrida del Bootstrap salió con 0 y dejó el árbol limpio. Además, `wrangler dev` aplicó `public/_headers` (cabeceras `content-security-policy` y `x-content-type-options`) a `/` y a la página 404, así que Static Assets sí respeta ese archivo y no hace falta un plan B de CSP en el Worker.

### No verificado — verificar antes de usar

Estos puntos vienen del plan aprobado y **no** están verificados contra la fuente; cada uno tiene dónde se ejerce o su plan B:

| Punto | Estado | Dónde se ejerce / plan B |
|---|---|---|
| Estructura del `data` que devuelve `JEV_EVALUATE_STATE` (respaldo `composio-jev`) | UNVERIFIED | `composio-jev.ts` busca `answers` en cuatro lugares y lanza `JEV_FORMATO`; solo se usa si falla `composio-proxy` |
| Base URL de la conexión de OpenRouter en Composio | UNVERIFIED | por eso el `endpoint` del proxy es la URL absoluta `https://openrouter.ai/api/alpha/decisions` |
| Límite exacto de subrequests del plan gratuito | UNVERIFIED | por eso `/qa` va en lotes de 10 casos |
| Fecha de compatibilidad `2026-10-12` de `wrangler.jsonc` | sugerida; wrangler 4.151.1 la aceptó en local | si wrangler avisa que es más nueva que el runtime instalado, baja a la fecha que indique |
| Forma exacta de las preguntas que recibe JEV (`type`, `instructions`, `criteria`) | UNVERIFIED | la fixture del paso 6 es la forma que describe el handoff; la confirma la llamada real (`npm run jev:vivo`) |
| Otros valores de `not_found_handling` distintos de `404-page` y `single-page-application` | UNVERIFIED | no se usan; el plan B del paso 1 solo aplica si una versión futura de wrangler rechaza `404-page` |

### Deliberadamente no usados

| Descartado | En su lugar | Por qué |
|---|---|---|
| `@cloudflare/vite-plugin`, `@cloudflare/vitest-plugin`, `vitest-pool-workers` | Vite solo para estáticos, Vitest en Node y Playwright contra `wrangler dev` | decisión del equipo: menos piezas nuevas y pruebas que no dependen del pool de Workers |
| Next.js, React, Astro | TypeScript sin framework | 5 páginas y una pantalla interactiva |
| Tailwind | CSS propio con variables | evita la configuración extra de Biome para su sintaxis |
| Drizzle, Prisma | SQL directo sobre D1 | 3 tablas; un solo sistema de migraciones |
| `tsx`, `ts-node` | `node --experimental-strip-types` | Node 24 quita los tipos sin instalar nada |
| `dotenv` | `.dev.vars` que lee wrangler, y un lector propio en `jev-en-vivo.ts` | una dependencia menos |
| pnpm, yarn | npm | decisión aprobada |
| ESLint, Prettier | Biome | una sola herramienta |
| Google Fonts, CDNs, analítica | fontsource alojado | la CSP no permite terceros |
| `@axe-core/playwright` | aserciones de accesibilidad escritas en las pruebas e2e (§15) | no hay un pin verificado para este paquete |

---

## 12. Estrategia de despliegue (Deployment Strategy)

### Alojamiento

Cloudflare Workers con Static Assets, plan gratuito, URL `https://diagnostico-30x-jev.<subdominio>.workers.dev`. Un solo despliegue sirve los estáticos de `./dist` y el Worker (`src/worker/index.ts`). Comando de build: `vite build` (salida `./dist`); comando de despliegue: `npm run deploy` (= `vite build && wrangler deploy`). Región: la elige Cloudflare (Workers es global). D1 se crea con `npx wrangler d1 create diagnostico-30x-jev`. **El despliegue lo hace Alonso**, no el constructor: requiere su cuenta (lista de lanzamiento, §20.1). El constructor solo comprueba, sin tocar cuentas, que el paquete se arma: `npm run deploy:prueba` (`wrangler deploy --dry-run`).

### Entornos

| Entorno | Rama | URL | Base de datos | Modo de terceros |
|---|---|---|---|---|
| Local | — | `http://127.0.0.1:8787` | D1 local en `.wrangler/` | `JEV_MODE=mock`, `QA_TOKEN=token-e2e-local` |
| Previsualización | — | NOT APPLICABLE — no hay previews por rama (sin CI en v1) | — | — |
| Producción | `main` | `https://diagnostico-30x-jev.<subdominio>.workers.dev` | D1 `diagnostico-30x-jev` en la cuenta de Alonso | `JEV_MODE=composio-proxy` solo después de que `npm run jev:vivo` salga bien; mientras tanto `mock` |

### CI/CD

No hay integración continua en la nube en v1 (Non-Goal). La compuerta local de §20.1 es el equivalente exacto de un pipeline: `npm ci`, `typecheck`, `lint`, `test`, `test:e2e`, `build`, `deploy:prueba`. Todo corre con `JEV_MODE=mock`.

### Publicación y retroceso

Se publica con `npm run deploy`. Para volver atrás: `npx wrangler rollback` (Cloudflare conserva las versiones anteriores del Worker; requiere la sesión de Alonso) o redeploy de un tag (`git checkout step-20-revision-final` y `npm run deploy`). Tarda segundos. Las migraciones de D1 se aplican **antes** del despliegue del código que las usa (`npx wrangler d1 migrations apply DB --remote`) y son aditivas; nunca se despliega una migración destructiva junto con el código que la necesita.

### Dominio, DNS, TLS

NOT APPLICABLE — v1 usa el subdominio `workers.dev` con TLS de Cloudflare. El dominio propio es un Non-Goal.

---

## 13. Estrategia de pruebas (Testing Strategy)

Las pruebas existen para que los criterios «Done when» de §9 se puedan comprobar con un comando. No hay una meta de cobertura por sí misma.

| Capa | Herramienta | Qué cubre | Dónde | Cuándo corre |
|---|---|---|---|---|
| Unitaria | Vitest (entorno Node) | motor puro (requisitos, ranking, dolores, seguimientos, resultado), armado de la llamada a JEV, mock, adaptadores con `fetch` inyectado, QA puro, calibración, script de JEV en vivo, escaneo de secretos, CSP | `tests/seguridad`, `tests/jev`, `tests/motor`, `tests/worker`, `tests/qa`, `tests/og`, `tests/scripts` | `npm test`, en cada paso |
| Integración y API | Playwright (`request`) contra `wrangler dev` | rutas reales del Worker con la D1 local y el mock | `tests/e2e/*.spec.ts` | `npm run test:e2e` |
| E2E de navegador | Playwright (Chromium, 360 px de ancho) | recorrido completo, chips, aclaración, seguimientos, tarjeta, compartir, QA, privacidad | `tests/e2e/*.spec.ts` | `npm run test:e2e` |

`playwright.config.ts` levanta el servidor él mismo: su `webServer` corre `npm run build && npm run db:migrar && npx wrangler dev --ip 127.0.0.1 --port 8787` con `JEV_MODE=mock`, `LIMITE_ACTIVO=0` y `QA_TOKEN=token-e2e-local` (pasados con `--var`), y espera a que `/api/salud` responda. No hay que arrancar ni matar servidores a mano.

### Flujos críticos que cubre el e2e

1. Recorrido feliz de ventas: contacto → `Fundador/a` → `Ya factura, arrancando` → reto → `Confirmar` → `A empresas` → `Menos de 20` → `/r/<id>` con «Alonso, tu programa es Sales Machine».
2. JEV falla: aviso amable y botón de asesor; el lead queda en `error` y pedir asesor funciona.
3. Reto vago: pantalla de aclaración, una sola llamada a `/aclarar`, sin segundo `POST /api/diagnosticos`.
4. Privacidad: ni `/api/resultados/<id>` ni `/r/<id>` contienen el correo, el WhatsApp ni la empresa.
5. QA: correr los lotes con el token local, rechazo con token equivocado, `localStorage` vacío.

### Datos de prueba

La D1 local se crea con las migraciones y se **acumula** entre corridas: las pruebas no cuentan filas, comprueban propiedades de lo que ellas mismas crearon (correos `prueba-<n>@example.com`). Las consultas `wrangler d1 execute DB --local` de los Verify usan `SELECT CASE WHEN count(*) >= 1 THEN 'si' ELSE 'no' END AS hay FROM leads WHERE llamadas_jev = 2` (existe al menos una fila) y `PRAGMA table_info` para columnas. El estado de otras corridas no afecta el resultado. Se puede empezar de cero borrando `.wrangler/state` con el servidor detenido.

Este proyecto no usa servicios locales aparte (no hay Docker): la D1 y el Worker los arranca `wrangler dev`, y por eso §19.6 no emite un archivo de servicios.

### Lo que deliberadamente no se prueba

- La llamada real a JEV: ninguna prueba sale a la red. La verifica Alonso una vez con `npm run jev:vivo` (lista de lanzamiento).
- La precisión de JEV: con `mock`, `/qa` mide el mock. La precisión real se mide en la corrida de producción con `composio-proxy`.
- El límite de peticiones real de Cloudflare: en e2e va apagado (`LIMITE_ACTIVO=0`); su lógica se prueba en Vitest con un binding falso.
- Navegadores distintos de Chromium y dispositivos físicos.
- La reproducción del navegador del «Descargar imagen» más allá de que se dispare una descarga `.png`.

---

## 14. Seguridad y secretos (Security & Secrets)

| Preocupación | Control | Implementado en |
|---|---|---|
| Almacenamiento de secretos | `COMPOSIO_API_KEY`, `COMPOSIO_OPENROUTER_ACCOUNT_ID`, `COMPOSIO_JEV_ACCOUNT_ID` y `QA_TOKEN` viven solo en `.dev.vars` (ignorado) y en `wrangler secret put`; nunca en el repo, en logs ni en el cliente | `.gitignore`, `wrangler.jsonc` (comentario), `tests/seguridad/secretos.test.ts` |
| Rotación de secretos | Alonso rota la clave de Composio y el `QA_TOKEN` con `wrangler secret put` cuando cambie el equipo o tras cualquier sospecha; el tope de 5 USD en la clave de OpenRouter limita el daño | lista de lanzamiento (§20.1) |
| Validación de entrada | zod en cada ruta, antes de tocar lógica; límites de largo en cada campo | `src/worker/esquemas.ts` |
| Salida y XSS | todo texto del servidor entra al DOM con `textContent`; ningún `innerHTML` con datos; la meta OG escapa `&`, `"`, `<`, `>` | `src/web/*`, `src/worker/resultados.ts` |
| Inyección SQL | solo `prepare` y `bind`; ningún SQL armado con texto | `src/worker/repositorio.ts`, `src/worker/qa.ts` |
| Autenticación / autorización | por capacidad (token de diagnóstico y `QA_TOKEN`) en el servidor en cada petición; ver §8 | `src/worker/diagnosticos.ts`, `src/worker/qa.ts` |
| CSRF | no aplica: no hay cookies ni credenciales ambientales; los secretos van en el cuerpo, la ruta o `Authorization` | §8 |
| Abuso y costo | límite de 10 `POST /api/diagnosticos*` por minuto por IP; máximo 2 llamadas a JEV por diagnóstico; `/api/qa/lote` exige `QA_TOKEN`; tope de 5 USD en OpenRouter | `src/worker/seguridad.ts`, `leads.llamadas_jev`, `src/worker/qa.ts` |
| Verificación de webhooks | NOT APPLICABLE — el sitio no recibe webhooks y no llama al webhook de 30X | — |
| Auditoría de dependencias | `npm audit` lo corre Alonso antes de lanzar (en `.npmrc` está desactivado para que no frene el Bootstrap); las versiones son exactas | lista de lanzamiento (§20.1) |
| Cabeceras de seguridad | `Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` · `X-Content-Type-Options: nosniff` · `Referrer-Policy: strict-origin-when-cross-origin` · `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` | `src/worker/seguridad.ts` y `public/_headers` (idénticas, comprobado por `tests/e2e/salud.spec.ts` contra el servidor real) |
| Datos personales | se guardan nombre, correo, WhatsApp, empresa (opcional), reto y resultado, con consentimiento; a JEV viaja solo `perfil`, `etapa`, `etapa_nivel`, `edad_hijo`, el reto y las elecciones de aclaración; la tarjeta pública lleva solo el nombre de pila; sin retención automática en v1 | `construirEstado()`, `resultados`, `privacidad.html` |
| Higiene de logs | un log estructurado por diagnóstico con `evento`, los primeros 4 caracteres del token, modo, latencia y costo; nunca contacto, reto ni secretos; los errores se registran por tipo, sin mensaje del usuario | `src/worker/diagnosticos.ts`, `src/worker/seguridad.ts` |

**Reglas duras**

- Ningún secreto se comitea, se imprime en un log, se envía a un rastreador de errores ni llega a un paquete del cliente. Todo lo que llega al navegador es público.
- Toda comprobación de autorización corre antes del trabajo, no después.
- **No se llama nunca al webhook ni al WhatsApp de 30X**, y esos datos no están en el repositorio (`tests/seguridad/secretos.test.ts` los busca). Tampoco se sube `radar-30x/web/` ni `radar-30x/data/`.
- El `QA_TOKEN` se compara en tiempo constante (`compararSeguro`), no se guarda en el navegador y, si el secreto no está configurado, toda petición de QA recibe 401.
- La `'unsafe-inline'` de `style-src` existe solo porque html-to-image clona estilos en línea al generar la imagen; los scripts quedan restringidos a `'self'`.

**Régimen de datos.** El público incluye personas de Colombia y de otros países, y los datos de contacto son datos personales (en Colombia aplica la Ley 1581 de 2012). El prototipo pide consentimiento explícito con casilla obligatoria, explica en `privacidad.html` qué se guarda y para qué, y limita el contacto a la tabla privada. No es un producto oficial de 30X. **Fuera de v1 queda** el borrado de leads a pedido (Non-Goal): antes de usarlo fuera del hackatón hay que agregarlo.

---

## 15. Accesibilidad (Accessibility)

**Meta: WCAG 2.2 nivel AA.** No es un pulido final: los criterios de accesibilidad están dentro de los «Done when» de los pasos 12, 13 y 14.

### Requisitos base

| Requisito | Regla |
|---|---|
| HTML semántico | Puntos de referencia `header`/`main`/`footer`, un `h1` por página, encabezados en orden, listas para listas |
| Teclado | Todo control se alcanza y se opera con teclado; orden de tabulación lógico; sin trampas; las opciones de cada pregunta son botones reales |
| Foco visible | `:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }` en todo; la prueba exige `outline-style` distinto de `none` y `outline-width` de al menos 2 px |
| Contraste | Texto 4.5:1 y texto grande/bordes 3:1; los pares de §7 ya lo cumplen (medidos) |
| Formularios | Cada campo tiene `label` visible; los errores son texto junto al campo (no solo color) y se anuncian en una región `aria-live="polite"` |
| Imágenes | Las imágenes OG no se muestran en la página; el círculo del porcentaje es texto, no imagen |
| Movimiento | Todo lo animado respeta `prefers-reduced-motion: reduce` (duraciones en 0 ms) |
| Zoom y reflujo | Usable al 200 % y a 360 px de ancho sin desplazamiento horizontal (la tabla de QA tiene el suyo propio) |
| Regiones vivas | Estados («JEV está leyendo tu reto…», «Listo, un asesor te contactará», «Enlace copiado») por `aria-live="polite"` |
| Medidor | `role="progressbar"` con `aria-valuenow`, `aria-valuemax` y el texto «Paso n de N» |
| Interruptores | Los botones de dolor y meta de la pantalla de aclaración llevan `aria-pressed` |

### Añadidos de WCAG 2.2 que más se olvidan

| Criterio | Cómo se cumple |
|---|---|
| 2.4.11 Foco no oculto | No hay cabeceras ni barras fijas que tapen el control enfocado |
| 2.5.7 Movimientos de arrastre | No hay arrastre en ninguna interacción |
| 2.5.8 Tamaño del objetivo (mín.) | Opciones de 48 px de alto; botones de quitar chip de al menos 24×24 px |
| 3.3.7 Entrada redundante | Los datos del contacto se piden una sola vez y se conservan en memoria durante el flujo |
| 3.3.8 Autenticación accesible | No hay autenticación; el campo del token de QA es de contraseña y admite pegar |

### Verificación

No hay herramienta de auditoría automática (no se instala `@axe-core/playwright`: no hay un pin verificado). Las comprobaciones se escriben como aserciones de Playwright dentro de las pruebas e2e de los pasos 12 a 14 y de la página de QA (foco visible, `aria-pressed`, `progressbar`, etiquetas, texto de errores):

```bash
npm run test:e2e -- tests/e2e/inicio.spec.ts tests/e2e/confirmacion.spec.ts tests/e2e/resultado.spec.ts   # expect: exit 0, 0 failed
```

Las pasadas manuales previas al lanzamiento (recorrido solo con teclado de todo el flujo, una pasada con lector de pantalla y una a 200 % de zoom en 360 px) están en la lista de lanzamiento de §20.1.

---

## 16. Observabilidad y costo (Observability & Cost)

### Instrumentación

| Señal | Herramienta | Qué captura | Quién la mira |
|---|---|---|---|
| Errores | `console.error` estructurado + registros de Workers (`observability.enabled` en `wrangler.jsonc`) | tipo de excepción y ruta; nunca el mensaje del usuario ni datos personales | Alonso, en el panel de Cloudflare |
| Registros | `console.log(JSON.stringify(registro))` con `evento`, 4 primeros caracteres del token, modo, latencia y costo | un renglón por diagnóstico y por error | Alonso |
| Métricas | las columnas `latencia_ms`, `costo_usd`, `llamadas_jev`, `estado` de `leads` y la matriz de `/qa` | consultas manuales a D1 | Alonso y el equipo de 30X |
| Disponibilidad | NOT APPLICABLE — no hay monitor externo; la lista de lanzamiento comprueba `/api/salud` una vez | — | — |

### Las métricas que importan

| Métrica | Meta | Alerta cuando |
|---|---|---|
| Latencia de la llamada a JEV (`latencia_p95` de `/qa`) | menos de 3000 ms con JEV real | más de 8000 ms (es el tiempo máximo antes de `JEV_TIMEOUT`) |
| Leads con `estado = 'error'` | menos del 5 % de los diagnósticos | más del 10 % |
| Costo medio por diagnóstico | alrededor de 0.0002 USD | más de 0.001 USD |
| Aciertos de la matriz (`aciertos_top1/evaluables`) | al menos 90 % | menos de 80 % tras una corrida con JEV real |

### Chequeo de salud

`GET /api/salud` → `{ ok: true, modo }`. Comprueba que el Worker corre y qué adaptador de JEV está activo; no toca D1 ni JEV a propósito (para que no gaste saldo). La consulta a D1 que prueba que la base está lista es `wrangler d1 execute DB --remote --command "SELECT count(*) FROM leads"`, en la lista de lanzamiento.

### Modelo de costos

| Servicio | Plan gratuito | Costo a escala de v1 (cientos de diagnósticos) | Costo a 10× | Dónde se dispara el precio |
|---|---|---|---|---|
| Cloudflare Workers + Static Assets | 100 mil peticiones al día | 0 USD | 0 USD | más de 100 mil peticiones al día pide el plan de pago |
| Cloudflare D1 | cuota gratuita de lecturas, escrituras y almacenamiento | 0 USD | 0 USD | muy lejos de v1 |
| JEV vía OpenRouter | no tiene; se paga por uso (15 USD de saldo, tope de 5 USD en la clave) | alrededor de 0.0002 USD por diagnóstico, es decir centavos | alrededor de 0.0002 USD por diagnóstico | cada corrida completa de `/qa` hace 60 llamadas; con los 5 USD de tope caben miles |

**Costo mensual estimado al lanzamiento: menos de 1 USD**, casi todo JEV. El rubro mayor es la llamada a JEV; la palanca más barata para recortarlo es la validación del reto de 40 caracteres como mínimo y el límite de 10 peticiones por minuto por IP; ningún servicio escala de forma superlineal. Las cifras de los planes gratuitos de Cloudflare se leen del panel de Cloudflare al lanzar.

---

## 17. Enrutamiento de modelos (Model Routing)

El proyecto llama a **un** modelo en tiempo de ejecución: JEV (`typesafe/jev-1.14`) de TypeSafe. No usa ningún modelo de Anthropic, así que no hay IDs de modelo de Claude que copiar de la skill `claude-api`; el modelo se fija por el nombre que dio el equipo.

### Tabla de enrutamiento

| Tarea del producto | Modelo | Por qué | Plan B |
|---|---|---|---|
| Evaluar el reto en una sola llamada (31 Noul, 1 Choice, 1 Score) | `typesafe/jev-1.14` por el proxy de Composio hacia OpenRouter (`composio-proxy`) | JEV devuelve respuestas tipadas y calibrables, evaluadas en paralelo y aisladas; costo ≈ 0.0002 USD por diagnóstico | `composio-jev` (toolkit `jev`, UNVERIFIED) y, si ambos fallan, el diagnóstico queda como «ruta preliminar» con el asesor como botón principal |
| Desarrollo, pruebas, CI y demo de respaldo | adaptador `mock` determinista por palabras clave | no gasta saldo y permite esperar textos exactos | — |

El modelo es **fijo**: `typesafe/jev-1.14`, nunca un alias `latest` (cambiaría las probabilidades y movería los umbrales calibrados).

### Estrategia de prompts y contexto

JEV no recibe un prompt libre sino `state` y `questions`. El `state` sale solo de `construirEstado()`: `perfil`, `etapa`, `etapa_nivel`, `edad_hijo`, `reto_principal`, `dolores_elegidos`, `metas_elegidas`; **nunca** nombre, correo, WhatsApp ni empresa. Las `questions` salen de `construirPreguntas(perfil)` desde `src/data/insumos-jev.json` (33 preguntas: un Choice con las opciones de programa, un Score de madurez y 31 Noul) **sin** el campo `evidencia` ni enlaces. Para el perfil `corporativo` el Choice se reduce a `Planes_Corporativos`, `Multipliers` y `requiere_revision`. La regla de los insumos «NEXT directo» (perfil `padre_madre_next` con hijo de 13 a 18 años) se aplica en código subiendo a `Next` al n.º 1; la llamada a JEV se hace igual, para poder mostrar el resto de la escala con el mismo flujo (decisión 9 de §20.3). No hay caché de prefijo: no es un modelo de texto.

### Controles de costo

Máximo **2 llamadas lógicas a JEV por diagnóstico** (texto libre y aclaración opcional; el reintento interno de red no cuenta); límite de 10 peticiones por minuto por IP; tope de 5 USD en la clave de OpenRouter de Alonso; `/api/qa/lote` exige `QA_TOKEN` y procesa 10 casos por petición. El costo de cada llamada queda en `leads.costo_usd` y el de cada corrida en `qa_runs.costo_total`.

### Manejo de fallas

Tiempo máximo de 8000 ms por intento (`AbortController`), un reintento, y errores siempre como `JevError` con código `JEV_CONFIG`, `JEV_HTTP`, `JEV_TIMEOUT` o `JEV_FORMATO`. La respuesta se valida contra la forma esperada; si no la reconoce, se trata como «no seguro»: el lead queda en `error`, la persona ve «Tuvimos un problema al analizar tu reto» con el botón de asesor y **nunca** un mensaje técnico. Un Choice ausente, `requiere_revision` o `no_aplica`, una confianza menor que 0.50 o un Choice distinto del n.º 1 hacen que el resultado se muestre como «Tu ruta preliminar» con el asesor como botón principal.

### Evaluación

Los 60 casos de `casos_prueba` (48 limpios, 7 de frontera, 2 incoherentes, 3 adversos; 30 de ellos son paráfrasis) corren por lotes desde `/qa.html` y dejan una fila por caso con aciertos, latencia y costo. `scripts/calibrar.ts` ajusta `umbral_recomendar`, `umbral_mostrar` y `umbral_choice` con los casos que no son paráfrasis y valida con los 30 `parafrasis-*`; si la validación cae más de 10 puntos frente a la calibración hay sobreajuste y no se escribe nada. Ningún cambio de modelo o de umbrales se publica sin repetir la corrida con JEV real.

---

## 18. Skills para usar durante la construcción (Skills to Use During Build)

Ninguna skill es obligatoria: si una no está instalada, el constructor sigue la guía de este documento, anota el respaldo en una línea y continúa. Un nombre con barra (`/`) es un comando de barra de verdad; **los demás se activan solos** y se nombran en prosa.

| Skill | Pasos de §9 | Para qué | Instalación |
|---|---|---|---|
| ui-ux-pro-max (se activa sola) | 12 | Paleta, escala tipográfica y estilo de componentes antes de escribir `estilos.css` (§7 ya fija los valores; la skill sirve para detalles nuevos) | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` y luego `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill` |
| frontend-design (se activa sola) | 12, 13, 14 | Interfaz distintiva y de calidad de producción en las pantallas del diagnóstico y la tarjeta | `/plugin marketplace add anthropics/skills` y luego `/plugin install example-skills@anthropic-agent-skills` |
| emil-design-eng (se activa sola) | 12, 14 | Transiciones entre pasos y animación del círculo del porcentaje, con restricción | `npx skills@latest add emilkowalski/skills` |
| playwright-cli (se activa sola) | 1, 12, 13, 14, 18 | Escribir y depurar las pruebas e2e de Playwright | `npm install -g @playwright/cli@latest` y luego `playwright-cli install --skills` |
| `revision-seguridad` (skill de proyecto, ya en `.claude/skills/`) | 7, 11, 16, 20 | Procedimiento de las cuatro compuertas de revisión y plantilla de los reportes | viene en `workspace/`; no hay nada que instalar |
| `calibrar-umbrales` (skill de proyecto, ya en `.claude/skills/`) | 18 y después de una corrida real | Recalibrar `src/data/umbrales.json` fuera de línea | viene en `workspace/`; no hay nada que instalar |
| `anthropic-skills:abogado-del-diablo` (se invoca con la herramienta Skill) | 7, 11, 16, 20 | Buscar puntos ciegos del bloque que se cierra | skill local de Alonso, instalada en su máquina; no hay un comando público verificado (revisa el README de su origen). Si falta: revisión manual con la lista de `revision-seguridad` y `Herramienta: revisión manual (skill no disponible)` |
| `cyber-neo` (se invoca con la herramienta Skill) | 7, 11, 16, 20 | Análisis de amenazas y OWASP del bloque | skill local de Alonso, instalada en su máquina; no hay un comando público verificado (revisa el README de su origen). Si falta: la misma revisión manual |
| `/humanizalo` | 12, 14, 19 | Pulir los textos visibles y el README (opcional) | `git clone https://github.com/Hainrixz/humanizalo.git ~/.claude/skills/humanizalo` |

---

## 19. Espacio de trabajo del agente (Agent Workspace)

El proyecto nace con su propia configuración de agentes, no con un solo `CLAUDE.md`. En modo bundle todo esto son **archivos reales** en `blueprints/diagnostico-30x-jev/workspace/`, y las secciones 19.1 a 19.5 de abajo reproducen su contenido (los archivos en disco son la fuente; este texto es una copia exacta):

```
blueprints/diagnostico-30x-jev/workspace/
├── CLAUDE.md                    # §19.1
├── AGENTS.md                    # §19.2
├── <config que el Verify necesita>   # §19.6 (package.json, wrangler.jsonc, tsconfig, biome, vite, vitest, playwright y otros)
└── .claude/
    ├── settings.json            # §19.3
    ├── skills/<nombre>/SKILL.md # §19.4
    └── rules/<nombre>.md        # §19.5
```

`workspace/` refleja exactamente el repositorio, así que el primer movimiento del constructor es **una sola copia**, la del Bootstrap de §10. Nada más del bundle se copia al proyecto.

**La copia se puede repetir sin riesgo.** Volver a correr el Bootstrap es la reacción natural de quien se atasca, y una copia recursiva normal sobre un árbol ya construido revertiría el `package.json` (y con él todas las dependencias) a su versión sin cambios, lo que se ve un comando después como un binario que falta. Por eso la copia se escribe así:

```bash
node -e "require('node:fs').cpSync('blueprints/diagnostico-30x-jev/workspace', '.', { recursive: true, force: false, errorOnExist: false })"   # force:false = nunca pisa un archivo que el build ya cambió; sale 0 aunque todos existan (cp -n sale 1 en macOS y por eso no se usa)
```

**Archivos que nunca se sobrescriben una vez que existen:** `package.json`, `package-lock.json`, `wrangler.jsonc`, `biome.json`, `tsconfig.json`, `tsconfig.dom.json` y cualquier otro archivo de `workspace/` que un paso haya editado. La guarda sale con 0 en el camino que protege (la segunda corrida) en cualquier plataforma, porque `fs.cpSync` con `force:false` y `errorOnExist:false` omite en silencio lo que ya existe.

**Todo lo emitido pasa las compuertas del propio proyecto.** El estilo de los archivos emitidos es el de `biome.json` tal como queda en disco: 2 espacios de indentación, comillas dobles, punto y coma, comas finales, ancho de línea 100, final de línea LF (y `.gitattributes`/`.editorconfig` lo refuerzan). `biome.json` es emitido por este blueprint (no lo genera ningún `init`), así que ese es el estilo que gobierna. Como el Paso 1 corre `npm run format` al final, cualquier diferencia residual se normaliza antes del primer `lint`.

**`.claude/commands/` no se emite nunca**, ni aquí ni en el bundle: un comando de barra solo se dispara cuando una persona lo escribe y un constructor autónomo no escribe nada. Los flujos repetibles viven en `.claude/skills/`.

### 19.1 `CLAUDE.md`

Menos de 200 líneas, comandos primero. (El archivo real es `workspace/CLAUDE.md`.)

```markdown
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
| Calibrar | `npm run calibrar -- <export-de-qa.json>` · escribir umbrales: agrega `--escribir` |
| Prueba de despliegue | `npm run deploy:prueba` (`wrangler deploy --dry-run`, no toca la cuenta) |
| Llamada real a JEV | `JEV_MODE=composio-proxy npm run jev:vivo` — solo Alonso, gasta saldo; el constructor no la corre |

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
| `JEV_MODE` | sí (default `mock`) | `src/jev/cliente.ts` | `wrangler.jsonc` vars; producción: `npm run deploy` |
| `JEV_MODEL` | sí (default `typesafe/jev-1.14`) | adaptadores JEV | `wrangler.jsonc` vars |
| `LIMITE_ACTIVO` | sí (default `1`) | `src/worker/seguridad.ts` | `wrangler.jsonc` vars; e2e pasa `0` |
| `QA_TOKEN` | solo para `/api/qa/lote` y `cerrar` | `src/worker/qa.ts` | `.dev.vars` (local `token-e2e-local`); producción: secret |
| `COMPOSIO_API_KEY` | solo con `JEV_MODE=composio-*` | `proxy.ts`, `composio-jev.ts` | Composio, permiso "Proxy execute" |
| `COMPOSIO_OPENROUTER_ACCOUNT_ID` | solo con `composio-proxy` | `proxy.ts` | Composio, conexión OpenRouter |
| `COMPOSIO_JEV_ACCOUNT_ID` | opcional (`composio-jev`) | `composio-jev.ts` | Composio |
| `JEV_MODEL_COMPOSIO` | opcional (si falta, usa `JEV_MODEL`) | `composio-jev.ts` | `.dev.vars` / secret |

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
```

### 19.2 `AGENTS.md`

Puente breve para herramientas de agentes que no leen `CLAUDE.md`. (El archivo real es `workspace/AGENTS.md`.)

```markdown
# Diagnóstico 30X con JEV — instrucciones para agentes

Sitio público del Hackatón 30X: la persona escribe su reto y JEV (modelo de decisión de TypeSafe)
decide el programa de 30X más afín. Cloudflare Workers + Hono + D1 + Vite (TypeScript sin framework).

## Comandos

| Tarea | Comando |
|---|---|
| Instalar | `npm install` (compuerta final: `npm ci`) |
| Dev | `npm run dev` — http://127.0.0.1:8787, JEV en mock |
| Build | `npm run build` |
| Typecheck | `npm run typecheck` |
| Lint / formato | `npm run lint` · `npm run format` |
| Unitarias | `npm test` · un archivo: `npm test -- <ruta>` |
| E2E + API | `npm run test:e2e` · un archivo: `npm run test:e2e -- <ruta>` |
| D1 local | `npm run db:migrar` |
| Prueba de despliegue | `npm run deploy:prueba` |

Compuerta: `npm run typecheck && npm run lint && npm test` (y `npm run test:e2e` si tocaste Worker o interfaz).

## No negociable

1. Datos personales nunca van a JEV, a logs, a `/r/<id>` ni a `/api/resultados`.
2. Nunca se llama al webhook de 30X ni se usa su número de WhatsApp.
3. Máximo 2 llamadas a JEV por diagnóstico; modelo pinneado `typesafe/jev-1.14`.
4. La persona nunca ve un error técnico ni la palabra "revisión".
5. Nunca se comitean secretos, `.dev.vars`, `dist/` ni `worker-configuration.d.ts`.
6. `src/data/insumos-jev.json` y una migración comiteada no se editan.
7. Nunca se marca una tarea como hecha con una compuerta en rojo.

Arquitectura, fronteras, tokens de diseño y compuertas de revisión: `CLAUDE.md` en este directorio
(fuente canónica). Orden de construcción: `blueprints/diagnostico-30x-jev/tasks.json`.
```

### 19.3 `.claude/settings.json`

Pre-aprueba los comandos del propio proyecto: **cada comando de un bloque `Verify` de §9 y de §20.1 está en `permissions.allow`**, para que un build desatendido no se detenga en un aviso de permiso a las 3 de la mañana. Niega lo que nunca debe ser automático: leer `.dev.vars`, `git push`, desplegar, iniciar sesión en Cloudflare, secretos, comandos remotos de D1 y la llamada real a JEV. (El archivo real es `workspace/.claude/settings.json`.)

```json
{
  "permissions": {
    "allow": [
      "Bash(gh repo clone avg031396-sys/diagnostico-30x-jev:*)",
      "Bash(node -e:*)",
      "Bash(git rev-parse:*)",
      "Bash(git init:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git tag:*)",
      "Bash(git config:*)",
      "Bash(git rev-list:*)",
      "Bash(WRANGLER_SEND_METRICS=false npx wrangler types:*)",
      "Bash(node --experimental-strip-types scripts/calibrar.ts:*)",
      "Bash(node --experimental-strip-types scripts/og.ts)",
      "Bash(wc:*)",
      "Bash(git ls-files:*)",
      "Bash(git check-ignore:*)",
      "Bash(npm install:*)",
      "Bash(npm ci:*)",
      "Bash(npx playwright install chromium)",
      "Bash(cp .dev.vars.example .dev.vars)",
      "Bash(npm run typecheck)",
      "Bash(npm run lint)",
      "Bash(npm run format)",
      "Bash(npm run build)",
      "Bash(npm run dev)",
      "Bash(npm test:*)",
      "Bash(npm run test:e2e:*)",
      "Bash(npm run db:migrar)",
      "Bash(npm run og)",
      "Bash(npm run calibrar:*)",
      "Bash(npm run deploy:prueba)",
      "Bash(npx wrangler types:*)",
      "Bash(npx wrangler d1 migrations apply DB --local)",
      "Bash(npx wrangler d1 execute DB --local:*)",
      "Bash(npx biome check:*)",
      "Bash(npx vitest run:*)",
      "Bash(npx playwright test:*)",
      "Bash(JEV_MODE=mock node --experimental-strip-types scripts/jev-en-vivo.ts)",
      "Bash(test:*)",
      "Bash(grep:*)",
      "Bash(ls:*)",
      "Bash(mkdir -p docs/revisiones)",
      "Skill(anthropic-skills:abogado-del-diablo)",
      "Skill(cyber-neo)",
      "Bash(tail:*)"
    ],
    "deny": [
      "Read(./.dev.vars)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Bash(cat .dev.vars:*)",
      "Bash(git push:*)",
      "Bash(npm run deploy)",
      "Bash(npm run jev:vivo:*)",
      "Bash(JEV_MODE=composio-proxy:*)",
      "Bash(npx wrangler deploy)",
      "Bash(npx wrangler login:*)",
      "Bash(npx wrangler secret:*)",
      "Bash(npx wrangler d1 create:*)",
      "Bash(npx wrangler d1 execute DB --remote:*)",
      "Bash(npx wrangler d1 migrations apply DB --remote:*)"
    ]
  }
}
```

### 19.4 Skills del proyecto — `.claude/skills/<nombre>/SKILL.md`

| Skill | Se activa con | Qué automatiza |
|---|---|---|
| `revision-seguridad` | «revisión», «abogado del diablo», «cyber-neo», fin de los pasos 7, 11, 16 y 20 | Las dos revisiones de cada bloque, la plantilla de los reportes y la regla `Hallazgos críticos abiertos: 0` |
| `calibrar-umbrales` | «calibrar umbrales», «ajustar umbrales», una corrida nueva de QA con JEV real | Recalibrar `src/data/umbrales.json` fuera de línea sin sobreajustar |

Skill `revision-seguridad` (`workspace/.claude/skills/revision-seguridad/SKILL.md`):

````markdown
---
name: revision-seguridad
description: Compuerta de revisión obligatoria al cerrar un bloque de código (motor y JEV, API, interfaz, QA y entrega). Úsala cuando una tarea diga "revisión", al terminar los pasos 7, 11, 16 y 20, o cuando pidan "abogado del diablo", "cyber-neo" o "revisar seguridad antes de cerrar".
---

# Revisión de puntos ciegos y seguridad

Cada bloque de código cierra con dos revisiones guardadas en el repo y cero hallazgos críticos
o altos abiertos. Es una compuerta: el paso de revisión no se cierra sin ella.

## Cuándo usarla

| Paso | Bloque | Archivos de salida |
|---|---|---|
| 7 | motor y JEV | `docs/revisiones/02-motor-jev-abogado.md` · `docs/revisiones/02-motor-jev-cyber-neo.md` |
| 11 | API | `docs/revisiones/03-api-abogado.md` · `docs/revisiones/03-api-cyber-neo.md` |
| 16 | interfaz | `docs/revisiones/04-interfaz-abogado.md` · `docs/revisiones/04-interfaz-cyber-neo.md` |
| 20 | QA y entrega | `docs/revisiones/05-qa-y-entrega-abogado.md` · `docs/revisiones/05-qa-y-entrega-cyber-neo.md` |

## Pasos

1. `mkdir -p docs/revisiones`
2. Lista el alcance: los directorios del bloque (tabla del paso en `tasks.json` / epic).
   Nunca incluyas `blueprints/`, `node_modules/`, `dist/` ni `.wrangler/`.
3. Invoca la skill `anthropic-skills:abogado-del-diablo` con la herramienta Skill. Pídele puntos
   ciegos del alcance contra estas reglas: datos personales nunca a JEV, logs ni `/r`; máximo 2
   llamadas a JEV por diagnóstico; motor puro; umbrales por parámetro; la persona nunca ve un error
   ni la palabra "revisión".
4. Invoca la skill `cyber-neo` con la herramienta Skill sobre la raíz del proyecto, excluyendo
   `blueprints/`. Pide foco en: secretos, CSP y cabeceras, validación de entrada, inyección SQL,
   comparación del `QA_TOKEN`, abuso del endpoint público (costo de JEV), XSS en el render del
   resultado y en la meta OG.
5. Guarda cada salida con esta plantilla exacta (una por archivo):

   ```markdown
   # Revisión NN — <bloque> — <abogado del diablo | cyber-neo>

   Herramienta: <anthropic-skills:abogado-del-diablo | cyber-neo | revisión manual (skill no disponible)>
   Fecha: AAAA-MM-DD
   Alcance: <directorios>

   ## Hallazgos

   | # | Severidad | Hallazgo | Estado | Corrección |
   |---|---|---|---|---|
   | 1 | crítica / alta / media / baja | qué encontró | corregido / aceptado | archivo y cambio |

   ## Notas

   Hallazgos críticos abiertos: 0
   ```

6. Corrige todo hallazgo de severidad crítica o alta. Un hallazgo medio o bajo puede quedar
   `aceptado` con su razón en la fila.
7. Escribe la última línea con el número real de críticos + altos sin corregir. Solo si es 0 la
   línea queda exactamente `Hallazgos críticos abiertos: 0`.
8. Corre el Verify del paso.

## Verify

```bash
test -f docs/revisiones/02-motor-jev-abogado.md                                  # expect: exit 0
grep -qx "Hallazgos críticos abiertos: 0" docs/revisiones/02-motor-jev-abogado.md  # expect: exit 0
npm run typecheck && npm run lint && npm test                                     # expect: exit 0
```

## Si una skill no está instalada

No te detengas. Haz la revisión a mano con la lista del punto 3 o 4, escribe
`Herramienta: revisión manual (skill no disponible)` y deja una fila que diga qué skill faltó.

## No hagas

- No escribas `Hallazgos críticos abiertos: 0` antes de corregir. Esa línea es la compuerta.
- No borres hallazgos para que la tabla se vea limpia: márcalos `corregido` o `aceptado`.
- No pegues secretos, tokens ni datos de leads en los documentos de revisión.
````

Skill `calibrar-umbrales` (`workspace/.claude/skills/calibrar-umbrales/SKILL.md`):

````markdown
---
name: calibrar-umbrales
description: Recalibra src/data/umbrales.json con una corrida guardada de /qa (búsqueda en rejilla fuera de línea, sin red). Úsala cuando pidan "calibrar umbrales", "ajustar umbrales", "mejorar aciertos de QA" o tras una corrida nueva de QA con JEV real.
---

# Calibrar umbrales

## Cuándo usarla

Después de una corrida de QA cerrada con JEV real (`modo` = `composio-proxy`). Con `modo` = `mock`
la calibración no significa nada: el mock no es JEV.

## Pasos

1. Exporta la última corrida: abre `https://<dominio>/api/qa/ultima` (o `http://127.0.0.1:8787/api/qa/ultima`)
   y guarda el JSON como `.wrangler/qa-export.json` (carpeta ignorada por git y por Biome).
2. Corre sin escribir: `npm run calibrar -- .wrangler/qa-export.json`. Lee la tabla: cada fila es una
   combinación de `umbral_recomendar`, `umbral_mostrar`, `umbral_choice` con aciertos top-1 y top-3
   sobre los casos de calibración (id sin `parafrasis-`) y sobre los de validación (`parafrasis-`).
3. Elige la combinación que el script marca como mejor. Si la validación cae más de 10 puntos
   frente a la calibración, hay sobreajuste: no escribas, repórtalo.
4. Escribe: `npm run calibrar -- .wrangler/qa-export.json --escribir`. Solo cambia `src/data/umbrales.json`.
5. Corre la compuerta y vuelve a correr QA desde `/qa.html`.

## Verify

```bash
npm test -- tests/scripts/calibrar.test.ts   # expect: exit 0, 0 failed
npm test -- tests/motor                      # expect: exit 0, 0 failed
```

## No hagas

- No calibres con los casos `parafrasis-`: son la validación.
- No cambies `umbral_dolor`, `umbral_vaga` ni `delta_hermanos` con este script: no están en la rejilla.
- No uses el alias `~typesafe/jev-latest` para calibrar: los umbrales valen solo para el modelo pinneado.
````

### 19.5 `.claude/rules/*.md`

Convenciones por área: cada archivo se carga solo cuando se toca un archivo que coincide con sus `paths`.

| Archivo | `paths` | Cubre |
|---|---|---|
| `.claude/rules/motor.md` | `src/motor/**`, `src/qa/**`, `src/data/**` | motor puro, umbrales, catálogo |
| `.claude/rules/jev.md` | `src/jev/**`, `scripts/jev-en-vivo.ts`, `tests/jev/**`, `tests/fixtures/**` | cliente JEV, mock, modelo fijo |
| `.claude/rules/worker.md` | `src/worker/**`, `migrations/**`, `wrangler.jsonc`, `public/_headers` | Hono, D1, seguridad |
| `.claude/rules/web.md` | `src/web/**`, `*.html`, `public/**`, `scripts/og.ts`, `scripts/og-plantilla.html` | interfaz, tokens, accesibilidad |
| `.claude/rules/pruebas.md` | `tests/**`, `vitest.config.ts`, `playwright.config.ts` | Vitest y Playwright |

```markdown
---
description: Convenciones del motor de decisión puro (ranking, requisitos, seguimientos, QA)
paths:
  - "src/motor/**"
  - "src/qa/**"
  - "src/data/**"
---

# Motor puro

- `src/motor/` y `src/qa/` son puros: sin `fetch`, sin `console`, sin `Date.now()`, sin `crypto`,
  sin `D1Database`, `HTMLRewriter`, `Env` ni DOM. Reciben datos, devuelven datos.
- Los umbrales entran siempre por parámetro (`Umbrales`). Solo el borde (Worker, scripts) lee
  `src/data/umbrales.json`.
- Comparaciones: `>=` para `umbral_recomendar`, `umbral_mostrar` y `umbral_choice`; `>` (estricto)
  para `umbral_dolor` y `umbral_vaga`. `delta_hermanos` se compara con `<`.
- El fit de un programa sale del Noul `fit_<id en minúsculas>` (`Sales_Machine` → `fit_sales_machine`).
  Un Noul ausente vale 0.
- `src/motor/catalogo.ts` es una copia escrita a mano de lo que dice `src/data/insumos-jev.json`
  (programas en el orden de las opciones del Choice, familias, dolores). `tests/jev/preguntas.test.ts`
  falla si se separan: si cambias uno, cambia el otro en el mismo commit.
- Nunca edites `src/data/insumos-jev.json`. Es el insumo de radar-30x y no lo produce este repo.
- Requisitos de tipo `texto` (AI_for_Executives, AI_for_Developers, Advanced_Strategy) se tratan como
  cumplidos. No inventes requisitos que no estén en `requisitos_programas`.
- Cada cambio de comportamiento llega con su prueba en `tests/motor/` o `tests/qa/`.
- Imports relativos con extensión `.ts` explícita. JSON con `with { type: "json" }`. Sin alias.
- Sintaxis borrable solamente (`erasableSyntaxOnly`): nada de `enum`, `namespace` ni propiedades
  de parámetro en constructores. Los tipos se importan con `import type`.
```

```markdown
---
description: Convenciones del cliente JEV (construcción de la llamada, adaptadores, mock)
paths:
  - "src/jev/**"
  - "scripts/jev-en-vivo.ts"
  - "tests/jev/**"
  - "tests/fixtures/**"
---

# Cliente JEV

- El estado que viaja a JEV sale solo de `construirEstado()` en `src/jev/preguntas.ts`:
  `perfil`, `etapa`, `etapa_nivel`, `edad_hijo`, `reto_principal`, `dolores_elegidos`, `metas_elegidas`.
  Nunca nombre, correo, WhatsApp ni empresa.
- Las preguntas salen solo de `construirPreguntas()`. Nunca se envía `evidencia` ni URLs de YouTube.
- Todo adaptador recibe `fetch` inyectado. Ninguna prueba hace red real.
- Timeout de 8000 ms con `AbortController`. Un solo reintento (`evaluarConReintento`). Errores siempre
  como `JevError` con código `JEV_CONFIG`, `JEV_HTTP`, `JEV_TIMEOUT` o `JEV_FORMATO`.
- Modelo pinneado `typesafe/jev-1.14`. Nunca `~typesafe/jev-latest`: mueve los umbrales calibrados.
- El `endpoint` del proxy de Composio es la URL absoluta `https://openrouter.ai/api/alpha/decisions`.
- `composio-jev` es respaldo UNVERIFIED: normaliza a la misma forma o lanza `JEV_FORMATO`.
- El mock es determinista: las palabras clave viven solo en `src/jev/mock-keywords.ts`, comparan en
  minúsculas y sin acentos. Cambiar una palabra clave cambia pruebas e2e: córrelas.
- `scripts/jev-en-vivo.ts` hace UNA llamada y aborta con código 2 si `JEV_MODE` no es
  `composio-proxy`. No lo corras sin que Alonso lo pida: gasta saldo real.
```

```markdown
---
description: Convenciones del Worker (Hono, D1, seguridad, migraciones)
paths:
  - "src/worker/**"
  - "migrations/**"
  - "wrangler.jsonc"
  - "public/_headers"
---

# Worker y datos

- D1 solo desde `src/worker/repositorio.ts` (`leads`, `resultados`) y `src/worker/qa.ts` (`qa_runs`).
  Siempre `prepare(...).bind(...)`. Nunca SQL armado con concatenación de texto.
- Toda ruta valida su entrada con zod (`src/worker/esquemas.ts`) antes de tocar lógica.
- Respuesta de error única: `{ "error": { "code": "...", "message": "..." } }`. Códigos:
  `VALIDACION` 400, `NO_AUTORIZADO` 401, `NO_ENCONTRADO` 404, `YA_HUBO_ACLARACION` 409,
  `LIMITE_EXCEDIDO` 429, `ERROR_INTERNO` 500, `JEV_NO_DISPONIBLE` 502 al crear o 409 al finalizar un lead en error. Sin stack, sin nombre de excepción.
- `GET /api/resultados/:id` y `GET /r/:id` leen solo la tabla `resultados`. Jamás seleccionan
  columnas de contacto de `leads`.
- Nunca registres en logs nombre, correo, WhatsApp, empresa ni el reto. Del token, como mucho
  los primeros 4 caracteres.
- Las cabeceras de seguridad las pone `src/worker/seguridad.ts`. La CSP es una sola constante
  (`CSP`) y `public/_headers` la repite carácter por carácter; `tests/e2e/salud.spec.ts` lo comprueba.
- `QA_TOKEN` se compara con `compararSeguro()` (tiempo constante). Sin token configurado: 401 siempre.
- Migraciones: `migrations/0001_inicial.sql` se escribe a mano y no se edita después de comiteada.
  Un cambio de esquema es un archivo nuevo escrito a mano con el siguiente número.
- Máximo 2 llamadas lógicas a JEV por diagnóstico (`leads.llamadas_jev`). El reintento interno no cuenta.
- Nunca llames a ningún webhook de 30X ni uses su número de WhatsApp.
```

```markdown
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
```

```markdown
---
description: Convenciones de pruebas (Vitest unitario, Playwright e2e/API)
paths:
  - "tests/**"
  - "vitest.config.ts"
  - "playwright.config.ts"
---

# Pruebas

- Unitarias: `tests/**/*.test.ts` con Vitest en Node. E2E y API: `tests/e2e/*.spec.ts` con
  Playwright contra `wrangler dev` local (lo arranca `playwright.config.ts`).
- Las e2e corren siempre con `JEV_MODE=mock`. Ninguna prueba toca Composio, OpenRouter ni Cloudflare.
- Las e2e no importan nada de `src/`: hablan con la app por HTTP o por el navegador.
- Correos de prueba con dominio `example.com`. Nada de teléfonos reales.
- No dependas de conteos de filas de D1: el estado local se acumula entre corridas. Asserta
  propiedades (existe, no existe, valor de una fila que creó la misma prueba).
- Respuestas grabadas de JEV en `tests/fixtures/`. Si cambia la forma oficial, se cambia la fixture
  y el adaptador en el mismo commit.
- Antes de correr `npm run test:e2e`, detén cualquier `npm run dev`: ambos usan el puerto 8787.
- Nunca edites un comando de Verify para que pase. Si un Verify falla, el código está mal o el
  blueprint tiene un defecto: repórtalo.
```

### 19.6 Configuración crítica del Verify e infraestructura local

Cada archivo de configuración que un comando `Verify` de §9 necesita para correr está emitido como **archivo real, con contenido completo, en la ruta que ocupa en el proyecto**, dentro de `workspace/`. Nombrarlo en el árbol de §3 no lo crea; esta tabla sí. Ningún paso de §9 escribe ni edita el manifiesto ni estas configuraciones (salvo la excepción documentada de `wrangler.jsonc` en la decisión 7 de §20.3).

| Archivo | Ruta en el proyecto | Pasos de §9 cuyos `Verify` lo necesitan | Resolución / variables de entorno que lleva | Exclusión de la ruta del bundle |
|---|---|---|---|---|
| Manifiesto | `package.json` | todos | scripts `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `test:e2e`, `db:migrar`, `og`, `calibrar`, `jev:vivo`, `deploy:prueba`, `deploy`; pines exactos; `"type": "module"`; ninguna variable de entorno | `n/a — no recorre el árbol` |
| Registro npm | `.npmrc` | todos | `save-exact=true`, `fund=false`, `audit=false`; ninguna variable | `n/a — no recorre el árbol` |
| Versión de Node | `.nvmrc` | todos | `24` | `n/a — no recorre el árbol` |
| TypeScript, proyecto del Worker | `tsconfig.json` | 1 en adelante (`npm run typecheck`) | `allowImportingTsExtensions`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `resolveJsonModule`, `noUncheckedSideEffectImports: false`, `types: []`; incluye `worker-configuration.d.ts` (global `Env`, generado por `wrangler types` al inicio de `npm run typecheck`) | `"exclude": ["blueprints", "dist", ".wrangler", "node_modules"]` y `include` explícito |
| TypeScript, proyecto de navegador y Node | `tsconfig.dom.json` | 1 en adelante | extiende `tsconfig.json`; `lib` con DOM; `types: ["node"]` para `node:fs`, `node:path`, `node:url` | `"exclude": ["blueprints", "dist", ".wrangler", "node_modules"]` y `include` explícito |
| Biome | `biome.json` | todos (`npm run lint`) | 2 espacios, comillas dobles, ancho 100; `files.includes` solo `.ts`, `.json`, `.jsonc` y `.css`; excluye `worker-configuration.d.ts` e `insumos-jev.json` | `"!!**/blueprints"` (exclusión forzada de Biome 2: evita que lea el segundo `biome.json` de `blueprints/diagnostico-30x-jev/workspace/`), más `"!!**/dist"`, `"!!**/.wrangler"`, `"!!**/node_modules"` |
| Vite | `vite.config.ts` | 1 en adelante (`npm run build`) | entradas HTML explícitas en la raíz; salida `./dist`; `publicDir: "public"` | `n/a — solo lee las 5 entradas HTML que nombra` |
| Vitest | `vitest.config.ts` | 1 en adelante (`npm test`) | entorno `node`; `include: ["tests/**/*.test.ts"]`; no necesita alias ni condición de exportación porque ningún módulo exige una; no lee variables de entorno | `exclude: ["blueprints/**", "tests/e2e/**", "node_modules/**", "dist/**", ".wrangler/**"]` |
| Playwright | `playwright.config.ts` | 1 en adelante (`npm run test:e2e`) | `webServer` que corre `npm run build && npm run db:migrar && npx wrangler dev --ip 127.0.0.1 --port 8787` con `--var JEV_MODE:mock --var LIMITE_ACTIVO:0 --var QA_TOKEN:token-e2e-local`; `baseURL` `http://127.0.0.1:8787` | `testDir: "tests/e2e"` y `testIgnore: ["**/blueprints/**"]` |
| Wrangler | `wrangler.jsonc` | 1 en adelante (`dev`, `db:migrar`, `deploy:prueba`) | `main`, `assets` con `run_worker_first`, `d1_databases` (`DB`), `ratelimits` (`LIMITE_DIAGNOSTICO`), `vars`, `send_metrics: false`; wrangler lee solo `.dev.vars` | `n/a — usa rutas explícitas (main, ./dist, migrations)` |
| Ignorar en git | `.gitignore` | todos (gobierna el primer commit) | excepciones `!.dev.vars.example` y `!.env.example` después de sus patrones | `n/a — es el archivo que excluye` |
| Finales de línea y editor | `.gitattributes`, `.editorconfig` | 1 en adelante (`lint`) | LF y 2 espacios, para que Biome no discrepe en Windows | `n/a — no recorren el árbol` |
| Variables de ejemplo | `.dev.vars.example` | 1 en adelante (se copia a `.dev.vars` en el Bootstrap) | `JEV_MODE=mock`, `QA_TOKEN=token-e2e-local` y llaves ficticias de Composio | `n/a — no recorre el árbol` |
| Insumos | `src/data/insumos-jev.json` | 2 en adelante | datos de solo lectura; Biome lo excluye por nombre | `n/a` |
| Cascarones HTML | `index.html`, `404.html`, `resultado.html`, `qa.html`, `privacidad.html` | 1 en adelante (los pide `vite build` y los lee `salud.spec.ts`) | sin scripts hasta que los pasos 12, 14 y 18 los agregan | `n/a` |

**Servicios locales.** NOT APPLICABLE — ningún `Verify` necesita Docker ni un servicio aparte: la D1 y el Worker los arranca `wrangler dev`, que a su vez lanza `playwright.config.ts`. Por eso no se emite un archivo de servicios ni variables de conexión locales, y el permiso `Bash(npm run db:migrar)` ya cubre las migraciones.

**Archivo de preparación de pruebas.** NOT APPLICABLE — ningún módulo valida variables de entorno al importarse, así que no hay `setupFiles` ni `.env.test`. Los tests unitarios inyectan `fetch` y configuración por parámetro.

#### Auditoría de resolución: paquetes obligatorios contra cada configuración

Se recorrió el producto cartesiano de los 5 cargadores (wrangler/esbuild, Vite, Vitest, Node, tsc) contra los paquetes que el blueprint hace obligatorios. Ninguno tiene una condición de exportación, una entrada solo para empaquetadores, un binario nativo ni un paso de generación de código que obligue a escribir una línea especial. Casos que podían engañar: `hono` y `zod` son ESM simples (los resuelven igual el bundle del Worker y Vitest); `@hono/zod-validator` solo se importa desde `src/worker/` (bundle del Worker y typecheck); `html-to-image` y los paquetes `@fontsource*` se importan solo desde `src/web/` (únicamente Vite los resuelve; en el typecheck los importaciones de efecto secundario del CSS no se verifican gracias a `noUncheckedSideEffectImports: false`); `scripts/og.ts` resuelve las fuentes con `import.meta.resolve` y, si no las encuentra, sigue con `system-ui`. El único tipo global que depende de un paso de generación es `Env` (`worker-configuration.d.ts`): `npm run typecheck` ejecuta `wrangler types --strict-vars=false` antes de `tsc`, y el Bootstrap lo genera una vez más para el editor.

#### Cargadores de variables de entorno

| Herramienta | Variables que lee | Mecanismo de carga | Dónde aparece |
|---|---|---|---|
| `wrangler dev`, `wrangler d1`, `wrangler types`, `wrangler deploy --dry-run` | `vars` de `wrangler.jsonc` y claves de `.dev.vars` | lectura propia de wrangler al arrancar | `npm run dev`, `npm run db:migrar`, `npm run typecheck`, `npm run deploy:prueba`, Verify de los pasos 1, 8, 9, 17 |
| Servidor de las e2e | `JEV_MODE`, `LIMITE_ACTIVO`, `QA_TOKEN` | banderas `--var` escritas en el `webServer` de `playwright.config.ts` (un solo lugar, no hay otra llamada) | `playwright.config.ts` |
| `scripts/jev-en-vivo.ts` | `JEV_MODE`, `JEV_MODEL`, `COMPOSIO_API_KEY`, `COMPOSIO_OPENROUTER_ACCOUNT_ID` | lector propio de `.dev.vars` con `process.env` por encima | `JEV_MODE=mock node --experimental-strip-types scripts/jev-en-vivo.ts` (Verify del paso 19, la variable va en la misma línea) y `JEV_MODE=composio-proxy npm run jev:vivo` (§20.1) |
| Vitest, `scripts/calibrar.ts`, `scripts/og.ts`, Biome, tsc, Vite | ninguna | — | — |

#### Matriz de la convención de resolución

**La convención, dicha una sola vez:** todo import relativo lleva la extensión `.ts` explícita (`import { x } from "./y.ts"`), los tipos se importan con `import type`, los JSON con `with { type: "json" }`, y no existen alias de rutas.

| Contexto | Comando que lo ejercita | La convención tal como aparece ahí | Archivo de configuración y ajuste que la hace funcionar |
|---|---|---|---|
| Código del Worker | `npx wrangler dev` (lo lanza `npm run test:e2e`) y `npm run deploy:prueba` | `./x.ts`, JSON con atributo | esbuild de wrangler resuelve la extensión literal y los atributos de import; `wrangler.jsonc` `main: "src/worker/index.ts"` |
| Interfaz (navegador) | `npm run build` | `./x.ts`, side effects de CSS | `vite.config.ts` (Vite resuelve la extensión literal); `tsconfig.dom.json` hereda `allowImportingTsExtensions: true` |
| Pruebas unitarias | `npm test` | `../../src/x.ts`, JSON con atributo | `vitest.config.ts` (Vitest usa el resolvedor de Vite); `include` explícito |
| Scripts independientes | `node --experimental-strip-types scripts/calibrar.ts` (y `og.ts`, `jev-en-vivo.ts`) | `../src/motor/x.ts`, JSON con atributo, solo sintaxis borrable | Node resuelve el especificador **literalmente**: por eso la extensión `.ts` es obligatoria; `tsconfig.json` trae `allowImportingTsExtensions`, `erasableSyntaxOnly` y `verbatimModuleSyntax` para que los mismos archivos pasen `tsc` |
| Verificación de tipos | `npm run typecheck` | igual | `tsconfig.json` (`module: "preserve"`, `moduleResolution: "bundler"`, `allowImportingTsExtensions`, `noEmit`) y `tsconfig.dom.json` |
| Especificaciones e2e | `npm run test:e2e` | solo importan `@playwright/test` | `playwright.config.ts` (`testDir`); por regla no importan nada de `src/` |
| Orden de imports | `npm run lint` | el que impone Biome | `biome.json` (`assist.actions.source.organizeImports: "on"`); no resuelve módulos |

#### Conciliación de valores entre artefactos

| Valor compartido | Fuente única — el archivo que lo decide | Valor literal | Todos los demás lugares donde aparece | Comparado |
|---|---|---|---|---|
| Entry del Worker | `wrangler.jsonc` → `main` | `src/worker/index.ts` | §3 (árbol) · paso 1 (**Do** 2 y `files`) · `deploy:prueba` de los pasos 1 y 20 | sí |
| Carpeta de salida web | `vite.config.ts` → `build.outDir` | `./dist` | `wrangler.jsonc` → `assets.directory` (`./dist`) · `.gitignore` (`dist/`) · `biome.json` (`!!**/dist`) · `tsconfig*.json` (`dist`) · `vitest.config.ts` (`dist/**`) · Verify del paso 1 (`dist/index.html`, `dist/404.html`) y del paso 15 (`dist/og/Sales_Machine.png`) | sí |
| Dirección y puerto del servidor local | `playwright.config.ts` → `PUERTO` y `ORIGEN` | `127.0.0.1` y `8787` | su propio `webServer` (`--ip 127.0.0.1 --port 8787`) · `package.json` → `dev` (`--ip 127.0.0.1 --port 8787`) · `CLAUDE.md` · `.claude/rules/pruebas.md` · §12 | sí |
| Binding y nombre de la base | `wrangler.jsonc` → `d1_databases` | `DB` y `diagnostico-30x-jev` | `package.json` → `db:migrar` (`DB`) · Verify de los pasos 1, 8, 9 y 17 (`d1 execute DB --local`) · `.claude/settings.json` · §20.1 | sí |
| Binding del límite de peticiones | `wrangler.jsonc` → `ratelimits[0].name` | `LIMITE_DIAGNOSTICO` | paso 10 (`seguridad.ts` y su prueba) · `CLAUDE.md` · §5 | sí |
| `LIMITE_ACTIVO` | `wrangler.jsonc` → `vars` | `"1"` | `playwright.config.ts` (`--var LIMITE_ACTIVO:0`) · paso 10 · §10 | sí |
| Modo de JEV | `wrangler.jsonc` → `vars.JEV_MODE` | `mock` | `.dev.vars.example` · `playwright.config.ts` (`--var JEV_MODE:mock`) · `tests/e2e/salud.spec.ts` (`modo: "mock"`) | sí |
| Modelo de JEV | `wrangler.jsonc` → `vars.JEV_MODEL` | `typesafe/jev-1.14` | criterio del paso 6 · `.claude/rules/jev.md` · `CLAUDE.md` · §10 · §17 | sí |
| Token local de QA | `.dev.vars.example` → `QA_TOKEN` | `token-e2e-local` | `playwright.config.ts` (`--var QA_TOKEN:token-e2e-local`) · pasos 17 y 18 · §10 · `CLAUDE.md` | sí |
| Nombre del proyecto | `package.json` → `name` | `diagnostico-30x-jev` | `wrangler.jsonc` → `name` y `database_name` · ruta del bundle `blueprints/diagnostico-30x-jev/` · URL del repositorio · §12 | sí |
| Nombres de los scripts de npm | `package.json` → `scripts` | `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `test:e2e`, `db:migrar`, `og`, `calibrar`, `jev:vivo`, `deploy:prueba`, `deploy` | `CLAUDE.md` · `AGENTS.md` · `.claude/settings.json` · `playwright.config.ts` (`npm run build`, `npm run db:migrar`) · los `Verify` de §9 y los comandos de §20.1 · las skills `revision-seguridad` y `calibrar-umbrales` | sí |
| URL del repositorio | `index.html` (enlace del pie de página) | `https://github.com/avg031396-sys/diagnostico-30x-jev` | `404.html`, `privacidad.html`, `qa.html` y `resultado.html` (mismo pie) · paso 19 (`privacidad.html` enlaza a la página de issues del repositorio; `README.md`) · §1 · §10 · §20.1 | sí |
| Rutas que atiende primero el Worker | `wrangler.jsonc` → `assets.run_worker_first` | `["/api/*", "/r/*"]` | §5 · pasos 8 y 9 | sí |
| Cadena CSP | `src/worker/seguridad.ts` → `CSP` | `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` | `public/_headers` · §14 · paso 10 (`tests/e2e/salud.spec.ts` compara lo que sirven los estáticos y el Worker) | sí |
| Versión de Node | `.nvmrc` | `24` | `package.json` → `engines` (`>=22.12.0`) · §10 · `CLAUDE.md` | sí |
| Pie de página | `index.html` (texto del `<footer>`) | `Prototipo para el Hackatón 30X · no oficial · código abierto en GitHub` | `404.html` · `privacidad.html` · `qa.html` · `resultado.html` · §7 · paso 12 | sí |

**Qué paso gobierna cada contrato (corre temprano).** El entry del Worker, `./dist`, el puerto, el binding `DB` y el modo `mock` los ejerce el **paso 1**: `salud.spec.ts` arranca `wrangler dev` y le pide `/api/salud`, `/` y una ruta inexistente, y `deploy:prueba` empaqueta `main` con `./dist`. El binding del límite y la CSP los ejerce el paso 10, y el token de QA, el paso 17.

#### Conciliación de contenido byte a byte

| Artefacto con bytes exactos | Escrito por | Se compara por primera vez en | Reglas del blueprint que lo restringen | Llamada del runtime que lo produce, en el pin de §11 | Ambos confirmados |
|---|---|---|---|---|---|
| Línea `Content-Security-Policy:` de `public/_headers` contra la constante `CSP` | paso 10 | paso 10 (`tests/e2e/salud.spec.ts`) | §14 (cabeceras literales) y la tabla de valores compartidos de arriba | ninguna: es texto escrito por este proyecto, no lo emite ningún runtime | sí |
| Cuerpo de `GET /api/salud` | paso 1 | paso 1 (`salud.spec.ts`) | §5 (`{ ok: true, modo }`) | `c.json({ ok: true, modo: c.env.JEV_MODE })` de Hono; la prueba compara el objeto ya interpretado (`toEqual`), así que el orden de claves y los espacios no cuentan | sí |
| Cuerpo de error 404 de `/api/*` | paso 1 | paso 1 (`salud.spec.ts`) | §5 (forma única de error y código `NO_ENCONTRADO`) | `c.json({ error: { code, message } }, 404)` de Hono, comparado como objeto | sí |

Este blueprint no dicta ningún texto que emita un runtime (mensajes de error de `JSON.parse`, trazas, formatos de fecha o de moneda): los porcentajes se calculan con `Math.round`, el costo se muestra con `toFixed(4)` y las comparaciones de las pruebas son sobre objetos o sobre textos escritos por el propio proyecto. La fixture `tests/fixtures/openrouter-decision.json` es una entrada de los adaptadores, no un archivo contra el que se haga `diff`.

---

## 20. Compuerta de aceptación, riesgos y registro de decisiones (Acceptance Gate, Risks & Decision Log)

### 20.1 Compuerta global de aceptación

El proyecto está **terminado** cuando todos los comandos de abajo salen con 0 en un clon limpio, y no antes. Es el mismo conjunto contra el que se mide cada paso de §9. Se corre desde la raíz del proyecto, con el bundle presente en `blueprints/diagnostico-30x-jev/`.

```bash
npm ci   # expect: exit 0 (instala exactamente lo del lockfile)
WRANGLER_SEND_METRICS=false npx wrangler types --strict-vars=false   # expect: exit 0 (regenera worker-configuration.d.ts, ignorado por git)
npm run typecheck   # expect: exit 0, cero errores
npm run lint   # expect: exit 0, cero errores y cero avisos
npm test   # expect: exit 0, 0 failed, 0 skipped
npm run test:e2e   # expect: exit 0, 0 failed (arranca wrangler dev desde el build y lo ejerce de verdad: /api/salud, /, 404, flujo completo)
npm run build   # expect: exit 0 (existen dist/index.html y dist/404.html)
npm run deploy:prueba   # expect: exit 0 (el Worker src/worker/index.ts se empaqueta con los assets de ./dist)
```

**Toda expectativa es una propiedad, no un conteo** (§9 regla 9). Donde una cifra importa (17 programas, 60 casos, 6 lotes) sale del propio `insumos-jev.json` y las pruebas la leen de ahí. **Cada línea sale con 0 en una compilación correcta**: ninguna depende de un código distinto de cero. Las comprobaciones manuales de abajo que esperan un código concreto lo afirman (`test $? -eq 1`) en lugar de aceptar «cualquier fallo».

Además, estas comprobaciones manuales, una sola vez antes del lanzamiento y **después** de que todos los pasos hayan comiteado (por eso viven aquí y no en el `Verify` de ningún paso):

- [ ] Cada paso de §9 tiene su tag de checkpoint en git. El repositorio es el clon de GitHub (con su commit inicial de `LICENSE`); el `git init -b main` del Bootstrap de §10 solo corre si no hay repositorio, y el primer commit propio lo hizo el Checkpoint del paso 1.

  ```bash
  node -e "const t = require('./blueprints/diagnostico-30x-jev/tasks.json'); const { execFileSync } = require('node:child_process'); for (const x of t) { execFileSync('git', ['rev-parse', '--verify', '--quiet', 'refs/tags/' + x.checkpoint]); }"   # expect: exit 0 (lanza si falta un tag)
  ```

- [ ] Cada archivo que §10 llama «comiteado» está en el repositorio y ningún patrón de `.gitignore` lo traga. **Un archivo por invocación** (así un fallo es del archivo y no del comando):

  ```bash
  git ls-files --error-unmatch .gitignore   # expect: exit 0
  git ls-files --error-unmatch .dev.vars.example   # expect: exit 0
  git ls-files --error-unmatch package.json   # expect: exit 0
  git ls-files --error-unmatch package-lock.json   # expect: exit 0
  git ls-files --error-unmatch wrangler.jsonc   # expect: exit 0
  git ls-files --error-unmatch biome.json   # expect: exit 0
  git ls-files --error-unmatch tsconfig.json   # expect: exit 0
  git ls-files --error-unmatch tsconfig.dom.json   # expect: exit 0
  git ls-files --error-unmatch migrations/0001_inicial.sql   # expect: exit 0
  git ls-files --error-unmatch public/_headers   # expect: exit 0
  git ls-files --error-unmatch public/og/default.png   # expect: exit 0
  git ls-files --error-unmatch src/data/insumos-jev.json   # expect: exit 0
  git ls-files --error-unmatch .claude/settings.json   # expect: exit 0
  git ls-files --error-unmatch docs/revisiones/05-qa-y-entrega-cyber-neo.md   # expect: exit 0
  git check-ignore -q .dev.vars.example; test $? -eq 1   # expect: código 1 = no está ignorado (128 = uso incorrecto y falla)
  git check-ignore -q package-lock.json; test $? -eq 1   # expect: código 1 = no está ignorado
  git check-ignore -q public/og/default.png; test $? -eq 1   # expect: código 1 = no está ignorado
  git check-ignore -q docs/revisiones/05-qa-y-entrega-cyber-neo.md; test $? -eq 1   # expect: código 1 = no está ignorado
  git check-ignore -q .claude/settings.json; test $? -eq 1   # expect: código 1 = no está ignorado
  ```

- [ ] El `.gitignore` entró al repositorio en el commit del paso 1 (el primer commit propio; el clon solo traía `LICENSE`) y nada de lo que debía ignorarse quedó rastreado (una vez rastreado, ninguna regla lo excluye jamás):

  ```bash
  test "$(git log --diff-filter=A --format=%H -- .gitignore | tail -n 1)" = "$(git rev-parse step-01-base)"   # expect: exit 0 (el commit que agregó .gitignore es el del tag step-01-base, no uno anterior ni uno posterior)
  git ls-files | grep -Eq '^(node_modules/|dist/|\.wrangler/|\.dev\.vars$|worker-configuration\.d\.ts$|radar-30x/)'; test $? -eq 1   # expect: código 1 = ninguno rastreado (2 = expresión mala y falla)
  ```

- [ ] Las cuatro compuertas de revisión existen y están cerradas:

  ```bash
  grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/02-motor-jev-abogado.md   # expect: exit 0
  grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/02-motor-jev-cyber-neo.md   # expect: exit 0
  grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/03-api-abogado.md   # expect: exit 0
  grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/03-api-cyber-neo.md   # expect: exit 0
  grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/04-interfaz-abogado.md   # expect: exit 0
  grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/04-interfaz-cyber-neo.md   # expect: exit 0
  grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/05-qa-y-entrega-abogado.md   # expect: exit 0
  grep -qx 'Hallazgos críticos abiertos: 0' docs/revisiones/05-qa-y-entrega-cyber-neo.md   # expect: exit 0
  ```

- [ ] El Bootstrap de §10 se volvió a correr completo sobre el árbol ya construido, **salió con 0** y no cambió nada importante: el manifiesto sigue listando las dependencias, el árbol sigue limpio y `npm run typecheck` sigue encontrando sus binarios. El bloque va con `set -e` para que cualquier línea que falle detenga la corrida:

  ```bash
  set -e
  test -d blueprints/diagnostico-30x-jev/workspace
  node -e "require('node:fs').cpSync('blueprints/diagnostico-30x-jev/workspace', '.', { recursive: true, force: false, errorOnExist: false })"
  node -e "const fs = require('node:fs'); if (!fs.existsSync('.dev.vars')) fs.copyFileSync('.dev.vars.example', '.dev.vars')"
  test -f .gitignore && grep -qxF '!.dev.vars.example' .gitignore && grep -qxF 'node_modules/' .gitignore
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || git init -b main
  git config user.name >/dev/null 2>&1 || git config user.name "Constructor de Claude"
  git config user.email >/dev/null 2>&1 || git config user.email "constructor@example.com"
  npm install
  npx playwright install chromium
  WRANGLER_SEND_METRICS=false npx wrangler types --strict-vars=false
  node -e "const p = require('./package.json'); if (!p.dependencies.hono || !p.devDependencies.wrangler) process.exit(1)"   # expect: exit 0 (la segunda copia no revirtió package.json)
  test -z "$(git status --porcelain)"   # expect: exit 0 (la segunda corrida no modificó ningún archivo comiteado)
  ```

- [ ] Cada fila de «Conciliación de valores entre artefactos» (§19.6) dice `sí` y cada fila de «Conciliación de contenido byte a byte» dice `sí`; los comandos de lint, tipos y formato de arriba corrieron **con el bundle presente**, que es lo que prueban las exclusiones de §19.6.
- [ ] Cada elemento de «Fuera de alcance» de §1 sigue sin construirse.
### Lista de lanzamiento — lo hace Alonso (no son pasos de §9)

Estas acciones dependen de cuentas de Alonso o de terceros; no pueden terminar dentro de una construcción autónoma, así que no son pasos. Cada una trae una comprobación que decide una máquina. Se hacen en este orden:

1. **Iniciar sesión en Cloudflare.** Alonso corre `npx wrangler login` (abre el navegador).
   Comprobación: `npx wrangler whoami 2>&1 | grep -q "logged in"` sale con 0.
2. **Crear la base remota.** `npx wrangler d1 create diagnostico-30x-jev`; copiar el `database_id` que imprime y reemplazar el valor local `00000000-0000-4000-8000-000000000000` en `wrangler.jsonc`.
   Comprobación: `grep -q '00000000-0000-4000-8000-000000000000' wrangler.jsonc; test $? -eq 1` (código 1 = ya no está el id local) y `grep -Eq '"database_id": "[0-9a-f-]{36}"' wrangler.jsonc` sale con 0.
3. **Aplicar las migraciones remotas.** `npx wrangler d1 migrations apply DB --remote`.
   Comprobación: `npx wrangler d1 execute DB --remote --json --command "SELECT name FROM sqlite_master WHERE type='table'" > .wrangler/remoto.json` sale con 0 y `grep -Eq '"name": ?"leads"' .wrangler/remoto.json`, `"resultados"` y `"qa_runs"` salen con 0.
4. **Poner los secretos.** `npx wrangler secret put QA_TOKEN` (un valor real, **no** `token-e2e-local`), `npx wrangler secret put COMPOSIO_API_KEY` y `npx wrangler secret put COMPOSIO_OPENROUTER_ACCOUNT_ID`. Antes, en Composio: crear la clave con permiso «Proxy execute»; en OpenRouter: poner el tope de 5 USD a la clave «JEV».
   Comprobación: `npx wrangler secret list 2>&1 | grep -q QA_TOKEN` sale con 0 (y lo mismo para los otros dos nombres), y los secretos siguen ausentes del repositorio: `git ls-files | grep -Eq '\.dev\.vars$'; test $? -eq 1` (código 1 = ningún `.dev.vars` rastreado).
5. **La única llamada real a JEV.** Con las claves en `.dev.vars`: `JEV_MODE=composio-proxy npm run jev:vivo`.
   Comprobación: sale con 0 e imprime el programa, la confianza, la latencia y el costo. Si sale con 3 (faltan claves) o 4 (falló JEV), se revisa el permiso «Proxy execute» y el id exacto de la conexión. **Plan B:** desplegar con `JEV_MODE=mock` y presentar la demo en mock.
6. **Elegir el modo de producción.** Solo si el paso 5 salió bien, cambiar `"JEV_MODE": "mock"` por `"composio-proxy"` en `wrangler.jsonc` (sección `vars`). Si no, dejar `mock`.
   Comprobación: `grep -Eq '"JEV_MODE": "(mock|composio-proxy)"' wrangler.jsonc` sale con 0.
7. **Desplegar.** `npm run deploy`; imprime la URL `https://diagnostico-30x-jev.<subdominio>.workers.dev`.
   Comprobación: `test "$(curl -s -o /dev/null -w '%{http_code}' https://<url>/api/salud)" = 200`; lo mismo para `/`, `/qa.html` y `/privacidad.html`; y `test "$(curl -s -o /dev/null -w '%{http_code}' https://<url>/no-existe)" = 404`.
8. **Probar el flujo en producción.** Hacer un diagnóstico de prueba en la URL, abrir su `/r/<id>` y correr `/qa.html` con el `QA_TOKEN` real.
   Comprobación: `curl -s https://<url>/api/qa/ultima | grep -q '"estado":"cerrado"'` sale con 0.
9. **Subir el código.** `git push -u origin main` y `git push origin --tags`. El constructor tiene `git push` prohibido a propósito.
   Comprobación: `gh repo view avg031396-sys/diagnostico-30x-jev --json pushedAt` sale con 0.
10. **Agregar la URL de la demo al README** (sección `## Demo`) y subir ese commit.
    Comprobación: `grep -q 'workers.dev' README.md` sale con 0.
11. **Auditoría de dependencias.** `npm audit --omit=dev` sin hallazgos críticos.
12. **Pasadas a mano que ninguna máquina decide** (se hacen y se anotan en el video o en el README): recorrido solo con teclado de todo el flujo, una pasada con lector de pantalla y una a 200 % de zoom en 360 px de ancho; revisar que `radar-30x/web/` y `radar-30x/data/` no estén en el repositorio; el video de máximo 3 minutos y el envío del hackatón (domingo 2026-10-18, 12:00 hora Colombia).

### 20.2 Registro de riesgos

| Riesgo | Probabilidad | Impacto | Señal temprana | Mitigación |
|---|---|---|---|---|
| El proxy de Composio necesita el permiso «Proxy execute» y el id exacto de la cuenta (vendor) | M | A | `npm run jev:vivo` sale con código 4 (HTTP 401/403) | `scripts/jev-en-vivo.ts` hace una sola llamada de prueba; respaldo `composio-jev`; modo `mock` siempre disponible para la demo (responsable: Alonso, lista de lanzamiento paso 5) |
| Abuso que agote el saldo de OpenRouter (costo) | M | A | `costo_usd` creciendo en `leads` o muchos 429 | límite de 10 por minuto por IP, máximo 2 llamadas por diagnóstico, `QA_TOKEN` en `/qa`, tope de 5 USD en la clave (Alonso) |
| Sobreajuste de los umbrales a los 60 casos (técnico) | M | M | la validación con `parafrasis-*` cae más de 10 puntos frente a la calibración | `calibrar.ts` calibra con los casos que no son paráfrasis y valida con las paráfrasis; si hay sobreajuste no escribe |
| TypeScript 7 y Vitest 5 son versiones mayores nuevas (dependencia) | M | M | el paso 1 falla en `typecheck` o en `npm test` | el paso 1 los ejerce a propósito; si una herramienta rompe, se reporta antes de seguir (el plan B es la versión estable anterior, que decide Alonso) |
| El endpoint `alpha/decisions` de OpenRouter cambia (vendor) | M | A | `JEV_FORMATO` en los logs | modelo fijo `typesafe/jev-1.14`, adaptador aislado en `src/jev/proxy.ts`, respuesta validada con zod |
| Plazo del hackatón (alcance) | A | A | el paso 12 sin terminar a mitad del tiempo | los pasos 1 a 14 son la demo completa y el modo `mock` permite mostrarla sin JEV; QA, OG y calibración se pueden recortar (prioridad p1) |
| Una versión futura de wrangler rechaza `not_found_handling: "404-page"` o `ratelimits` (técnico) | B | B | falla `deploy:prueba` o `salud.spec.ts` en el paso 1 | con wrangler 4.151.1 ambos funcionan (comprobado el 2026-10-18); si cambia la versión, el paso 1 lo detecta de inmediato y aplica el plan B de la decisión 7 de §20.3 |
| Datos personales mal manejados (privacidad) | B | A | un correo aparece en `/r/<id>`, en un log o en una llamada a JEV | pruebas e2e de privacidad, `secretos.test.ts`, `construirEstado()` de 7 claves, y las revisiones `cyber-neo` de los pasos 11, 16 y 20 |

### 20.3 Registro de decisiones

| # | Decisión | Alternativa descartada | Por qué | Se revierte si |
|---|---|---|---|---|
| 1 | Cloudflare Workers con Static Assets | Vercel (la pista por defecto) | un solo despliegue sirve estáticos y API, D1 y límite de peticiones están en el plan gratuito y `wrangler dev` reproduce todo sin cuentas | se necesita renderizado de React en el servidor o una región fija |
| 2 | Interfaz con TypeScript y HTML, sin framework | Astro o React | 5 páginas y una pantalla interactiva; menos piezas y una CSP simple | la interfaz pasa de unas 10 pantallas con estado compartido |
| 3 | Vitest en Node para lógica pura y Playwright contra `wrangler dev` para el Worker | `vitest-pool-workers` y `@cloudflare/vitest-plugin` | decisión del equipo; el pool de Workers es una pieza nueva más que depurar con TypeScript 7 | el Worker acumula lógica que solo se puede probar dentro del runtime |
| 4 | SQL directo sobre D1 | Drizzle o Prisma | 3 tablas; un solo sistema de migraciones, escrito a mano | el esquema pasa de unas 8 tablas o aparecen consultas dinámicas |
| 5 | npm | pnpm (la pista) | decisión aprobada: ya está instalado y no hay que aprobar scripts de instalación | trabajan varias personas y el espacio en disco importa |
| 6 | `composio-proxy` como adaptador de producción y `composio-jev` como respaldo | solo el toolkit `jev` de Composio | el proxy habla con el endpoint documentado de OpenRouter; el toolkit está sin verificar | Composio publica la estructura estable de `JEV_EVALUATE_STATE` |
| 7 | `not_found_handling: "404-page"` para la página 404 de assets; **plan B** si wrangler lo rechaza: quitar esa clave de `wrangler.jsonc`, poner `"run_worker_first": true`, y agregar a `src/worker/app.ts`, después de las rutas `/api` y `/r`, `app.get("*", async (c) => { const r = await c.env.ASSETS.fetch(c.req.raw); if (r.status !== 404) return r; const p = await c.env.ASSETS.fetch(new URL("/404.html", c.req.url)); return new Response(p.body, { status: 404, headers: p.headers }); })` | `single-page-application` (devolvería la portada con 200 para rutas inexistentes) | un 404 real con la página del sitio; comprobado con wrangler 4.151.1; el paso 1 lo ejerce siempre | wrangler documenta otro valor y lo confirma el paso 1 |
| 8 | La tarjeta pública usa un id propio de 10 caracteres, distinto del token del diagnóstico | usar el token en la URL | el token da acceso a seguir y a pedir asesor; el id solo da lectura | se agrega borrado o edición de resultados |
| 9 | La regla «NEXT directo» sube a `Next` al n.º 1 en código, pero JEV se llama igual | saltarse la llamada a JEV para ese perfil | el mismo flujo para todos; se muestra la escala completa; cuesta 0.0002 USD | 30X quiere que el perfil NEXT nunca pase por texto libre |
| 10 | La meta de calibración se aplica sobre los casos evaluables: al menos 90 % en el puesto 1 y 100 % en el top 3 | «54 de 60 / 60 de 60» sobre los 60 casos | 6 de los 60 casos no tienen un programa esperado; 54 de 60 = 90 % | se agregan programas esperados a esos 6 casos |
| 11 | 20 pasos en 3 épicas (7 + 7 + 6) | 6 épicas de 2 a 5 pasos, como el plan inicial | la regla de conteo del formato pide 5 a 9 pasos por épica; los 4 pasos extra son las compuertas de revisión | cambian las reglas de conteo del formato |
| 12 | Si JEV no responde, la persona ve «Tuvimos un problema al analizar tu reto» y el botón de asesor | mostrar siempre una «ruta preliminar» | sin respuesta de JEV no hay ranking que mostrar; «ruta preliminar» queda para cuando JEV respondió pero no está seguro | el motor aprende a dar una ruta por defecto sin JEV |
| 13 | 18 imágenes OG estáticas (17 programas y una por defecto), generadas una vez y comiteadas | generarlas en el servidor al vuelo | cuesta cero en producción y no agrega dependencias al Worker | el diseño de la tarjeta cambia con frecuencia |
| 14 | Sin integración continua en la nube; la compuerta local es el equivalente | GitHub Actions | evita permisos extra del token de GitHub dentro del plazo | llegan contribuciones externas |
| 15 | El despliegue, los secretos y la llamada real a JEV son una lista de lanzamiento de Alonso, no pasos de §9 | pasos con `wrangler login` y `deploy` | dependen de cuentas de Alonso: ninguna máquina puede decidirlos dentro de la construcción | Alonso entrega un token de Cloudflare para el constructor |
| 16 | `style-src 'unsafe-inline'` en la CSP; scripts solo `'self'` | CSP sin estilos en línea | html-to-image clona estilos en línea para descargar la imagen | se cambia la descarga de imagen por una generada en el servidor |
| 17 | Límite de peticiones con el binding `ratelimits` de Cloudflare | un contador en D1 o KV | no consume lecturas de D1 y es la primitiva pensada para esto | el binding no está disponible en el plan gratuito |
| 18 | Biome excluye el bundle con `!!**/blueprints` | `.biomeignore` o excluir con prosa | Biome 2 detecta configuraciones anidadas y la exclusión forzada evita que lea el segundo `biome.json` del bundle | el bundle sale del repositorio |

### 20.4 Qué construir después

1. Panel de leads con autenticación (cuando 30X pida ver los leads sin tocar la base).
2. Envío de leads a un CRM o webhook de prueba (cuando 30X entregue un endpoint propio y una cuenta de pruebas).
3. Borrado de leads a pedido (antes de usarlo fuera del hackatón).
4. Recalibración con diagnósticos reales de 30X (cuando comparta una exportación anonimizada).
5. Versión en inglés y dominio propio (cuando el prototipo se adopte).

---

*Fin del blueprint. El orden de construcción es §9. Detente cuando §20.1 esté en verde.*
