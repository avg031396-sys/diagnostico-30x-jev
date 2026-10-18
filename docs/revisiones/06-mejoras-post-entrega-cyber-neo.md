# Revisión 06 — mejoras posteriores a la entrega — cyber-neo

Herramienta: cyber-neo (versión reducida: `npm audit`, búsqueda de secretos en el diff, revisión manual enfocada)
Fecha: 2026-10-18
Alcance: el diff de este bloque (calibración, CI, carrera en `finalizar`, cabeceras, documentación)

## Hallazgos

| # | Severidad | Hallazgo | Estado | Corrección |
|---|---|---|---|---|
| 1 | baja | `npm audit` (con y sin dev): 0 vulnerabilidades | aceptado | — |
| 2 | baja | Sin secretos en el diff; `.wrangler/qa-export.json` queda en carpeta ignorada | aceptado | — |
| 3 | media | Dos `POST .../finalizar` simultáneos podían crear dos filas en `resultados` para el mismo lead | corregido | `INSERT ... WHERE EXISTS` y `UPDATE ... AND estado != 'completo'` en un mismo `batch`; la petición que pierde devuelve el resultado ganador (e2e nueva) |
| 4 | baja | Faltaba `Strict-Transport-Security` | corregido | Agregada en `seguridad.ts` y `public/_headers` |
| 5 | baja | CI: `permissions: contents: read`, `pull_request` (no `pull_request_target`), sin secretos; JEV en mock | aceptado | — |
| 6 | baja | CI: las acciones se fijan por versión mayor (`@v5`), no por SHA | aceptado | Fijar por SHA si el repo pasa a producción real |
| 7 | baja | `scripts/calibrar.ts` solo escribe `src/data/umbrales.json` (ruta fija), rechaza corridas `mock` y sobreajuste | aceptado | — |

## Notas

`twitter:card` pasó de `property` a `name` (lo que leen X y los validadores de tarjetas).

Hallazgos críticos abiertos: 0
