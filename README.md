# Diagnóstico 30X con JEV

> Este es un prototipo no oficial para el Hackatón 30X. No tiene relación formal con 30X.

## Qué es

Su diagnóstico de hoy le pregunta a la persona qué programa quiere. El nuestro escucha su problema
y decide como decide Andrés.

La persona escribe su reto en texto libre. JEV (el modelo de decisión de TypeSafe, con respuestas
tipadas `noul`, `choice` y `score`) lo lee y un motor de reglas puro convierte esas respuestas en una
recomendación entre los 17 programas de 30X:

1. **Contacto y consentimiento**, perfil, etapa y reto (una pregunta por pantalla).
2. **«Esto entendí de tu reto»**: chips con los dolores detectados que la persona confirma o ajusta.
   Si el reto es vago, una pantalla de aclaración (segunda y última llamada a JEV).
3. **Seguimientos** (máximo 2 preguntas) solo cuando dos programas están muy parejos.
4. **Tarjeta de resultado** compartible (`/r/<id>`): programa, afinidad, escala de otras rutas,
   requisitos pendientes y botón para hablar con un asesor. Solo muestra el nombre de pila.

Nada personal viaja a JEV: solo el texto del reto, el perfil y la etapa.

## Demo

Demo en vivo (modo mock): <https://diagnostico-30x-jev.alo-finanzas.workers.dev>

## Correr local en modo mock

Requiere Node 24 (o 22.12+) y Git. No hace falta ninguna cuenta: en modo `mock` JEV es un adaptador
determinista sin red.

```bash
git clone https://github.com/avg031396-sys/diagnostico-30x-jev.git
cd diagnostico-30x-jev
cp .dev.vars.example .dev.vars
npm install
npx playwright install chromium
npm run db:migrar
npm run dev
```

Abre <http://127.0.0.1:8787>. Para probar un fallo de JEV, escribe «simular falla de jev» en el reto.

Compuerta de calidad: `npm run typecheck && npm run lint && npm test && npm run test:e2e`.

## Conectar JEV

El camino de producción es Composio con el permiso **Proxy execute** hacia la conexión de OpenRouter:

1. Crea una clave de API en Composio con permiso «Proxy execute» y anota el `connected_account_id`
   de la conexión de OpenRouter.
2. Ponlas en `.dev.vars` (local) o con `npx wrangler secret put` (producción):
   `COMPOSIO_API_KEY` y `COMPOSIO_OPENROUTER_ACCOUNT_ID`. Pon `JEV_MODE=composio-proxy`.
3. Prueba una llamada real (gasta saldo, solo una): `JEV_MODE=composio-proxy npm run jev:vivo`.

El modelo está fijado en `typesafe/jev-1.14` (nunca un alias `latest`). Hay un respaldo
`composio-jev` sin verificar contra la cuenta real.

## Resultados de /qa

La página [`/qa.html`](/qa.html) muestra la última corrida de calidad: los casos de prueba de
`src/data/insumos-jev.json` evaluados contra el motor, con aciertos top-1 y top-3, latencia y costo.
En modo `mock` mide un buscador de palabras clave (hoy 29/54 en top-1 y 44/54 en top-3), no a JEV: la medición real se hace con `JEV_MODE=composio-proxy`. El script `npm run calibrar` está pendiente.

## Revisiones

Las revisiones de seguridad y de puntos ciegos se hicieron en una sola pasada al final (no por bloque) y están en `docs/revisiones/`.

## Privacidad y seguridad

- El aviso está en [`/privacidad.html`](/privacidad.html).
- Cabeceras CSP estrictas, validación con zod en toda entrada, límite de peticiones por IP y errores sin stack.
- Nunca se llama a ningún webhook ni número de WhatsApp de 30X; compartir usa `wa.me/?text=` sin número.

## Licencia

MIT.
