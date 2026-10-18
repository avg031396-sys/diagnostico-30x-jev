# Revisión 05 — todo el código (pasada única) — abogado del diablo

Herramienta: anthropic-skills:abogado-del-diablo (aplicado a mano sobre el proyecto)
Fecha: 2026-10-18
Alcance: motor, JEV, Worker, interfaz, QA

## Hallazgos

| # | Severidad | Hallazgo | Estado | Corrección |
|---|---|---|---|---|
| 1 | media | En modo `mock` la «decisión» es un buscador de palabras clave: en QA acierta 29/54 en top-1 y 44/54 en top-3. Si el demo se publica en mock, el jurado ve un JEV de mentira | aceptado | Desplegar con `JEV_MODE=composio-proxy` si hay claves; si no, el README y `/qa` declaran el modo. La meta de calibración sigue pendiente de medirse con JEV real |
| 2 | media | Con el mock, un reto con varias señales a la vez da `preliminar` aunque el n.º 1 sea claro (el Choice del mock sigue el orden del catálogo, no el fit del motor) | aceptado | Es comportamiento del mock; con JEV real el Choice lo decide el modelo |
| 3 | media | Las 3 compuertas de revisión del blueprint (pasos 7, 11, 16) se hicieron en una sola pasada al final, no al cerrar cada bloque | aceptado | Decisión por falta de tiempo, registrada aquí; la compuerta final cubre todo el código |
| 4 | baja | `scripts/calibrar.ts` (paso 18) no está implementado: `npm run calibrar` falla. `/qa` ya muestra la medición | aceptado | Pendiente; no bloquea el demo |
| 5 | baja | El texto libre del reto puede contener datos personales y viaja a JEV | aceptado | El aviso de privacidad lo dice: a JEV va el texto del reto |
| 6 | baja | La persona nunca ve error técnico ni la palabra «revisión»: cubierto por e2e (502 con asesor, ruta preliminar) | aceptado | — |
| 7 | baja | Máximo 2 llamadas a JEV por diagnóstico: `aclarar` solo una vez (409) y `finalizar` nunca llama | aceptado | — |

## Notas

Hallazgos críticos abiertos: 0
