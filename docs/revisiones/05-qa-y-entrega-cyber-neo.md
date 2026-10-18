# Revisión 05 — todo el código (pasada única) — cyber-neo

Herramienta: cyber-neo (versión reducida: `npm audit`, revisión manual enfocada; el escáner de secretos de la skill no corrió porque Python no está instalado; lo cubre `tests/seguridad/secretos.test.ts`)
Fecha: 2026-10-18
Alcance: src/, public/, scripts/, migrations/, tests/, archivos de la raíz (sin blueprints/, node_modules/, dist/, .wrangler/)

## Hallazgos

| # | Severidad | Hallazgo | Estado | Corrección |
|---|---|---|---|---|
| 1 | baja | `npm audit`: 0 vulnerabilidades en dependencias (versiones exactas, lockfile comiteado) | aceptado | — |
| 2 | baja | Sin secretos en el repo: `.dev.vars` ignorado, `.dev.vars.example` con valores ficticios, test de patrones prohibidos en verde | aceptado | — |
| 3 | baja | SQL solo con `prepare().bind()` en `repositorio.ts` y `qa.ts`; ninguna concatenación | aceptado | — |
| 4 | baja | XSS: la meta OG escapa `& " < >` y el título entra con `setInnerContent`; la interfaz usa `textContent` (sin `innerHTML`) | aceptado | — |
| 5 | baja | CSP en el Worker y en `_headers` idénticas (lo prueba una e2e); scripts solo `'self'`; `'unsafe-inline'` solo en estilos por html-to-image | aceptado | — |
| 6 | media | `QA_TOKEN` comparado en tiempo constante, pero `/api/qa/lote` no tiene límite de intentos: un token débil se podría adivinar | aceptado | Usar un token largo (≥ 32 caracteres) con `wrangler secret put QA_TOKEN` |
| 7 | media | Costo de JEV real: el límite es 10 POST/min por IP, sin tope global | aceptado | Tope de 5 USD en la clave de OpenRouter (lista de lanzamiento) |
| 8 | baja | Los datos de contacto quedan en D1 sin plazo de borrado; el aviso ofrece borrar por GitHub issues (público) | aceptado | Pedir en el issue que no publiquen datos personales; borrado manual por la persona dueña |

## Notas

Hallazgos críticos abiertos: 0
