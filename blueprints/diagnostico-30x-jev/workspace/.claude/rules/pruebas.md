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
