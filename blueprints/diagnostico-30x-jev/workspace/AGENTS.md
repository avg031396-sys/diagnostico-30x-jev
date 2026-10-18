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
