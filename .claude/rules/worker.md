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
