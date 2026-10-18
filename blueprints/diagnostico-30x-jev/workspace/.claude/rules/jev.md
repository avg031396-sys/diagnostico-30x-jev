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
