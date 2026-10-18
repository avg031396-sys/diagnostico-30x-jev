# Diagnóstico 30X con JEV

[![CI](https://github.com/avg031396-sys/diagnostico-30x-jev/actions/workflows/ci.yml/badge.svg)](https://github.com/avg031396-sys/diagnostico-30x-jev/actions/workflows/ci.yml)

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

Demo en vivo, con JEV real (`typesafe/jev-1.14` vía OpenRouter): <https://diagnostico-30x-jev.alo-finanzas.workers.dev>

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

`JEV_MODE` elige el adaptador (`src/jev/cliente.ts`):

| Modo | Para qué | Secretos |
|---|---|---|
| `mock` | Desarrollo y pruebas. Determinista, sin red. | ninguno |
| `openrouter` | **Producción actual.** Llamada directa a `/api/alpha/decisions`. | `OPENROUTER_API_KEY` |
| `composio-proxy` | Alternativa vía el proxy de Composio hacia la conexión de OpenRouter. | `COMPOSIO_API_KEY`, `COMPOSIO_OPENROUTER_ACCOUNT_ID` |
| `composio-jev` | Respaldo con el toolkit `jev` de Composio (sin verificar contra la cuenta real). | `COMPOSIO_API_KEY` |

Los secretos van en `.dev.vars` (local) o con `npx wrangler secret put <NOMBRE>` (producción).
Prueba de una sola llamada real (gasta saldo): `JEV_MODE=openrouter npm run jev:vivo`.

El modelo está fijado en `typesafe/jev-1.14` (nunca un alias `latest`): los umbrales están
calibrados para esa versión.

## Resultados de /qa

La página [`/qa.html`](/qa.html) muestra la última corrida de calidad: los casos de prueba de
`src/data/insumos-jev.json` evaluados contra el motor, con aciertos top-1 y top-3, latencia y costo.
Última corrida con JEV real (18 oct 2026): **46/54 en top-1 (85 %) y 52/54 en top-3 (96 %)**, latencia p50 408 ms y p95 1401 ms, costo total USD 0.0073 por los 60 casos. Como referencia, el modo `mock` (buscador de palabras clave) logra 29/54 y 44/54.

### Calibración de umbrales

`npm run calibrar -- <export.json>` vuelve a correr el motor, sin red, sobre las respuestas de JEV
guardadas en una corrida (`/api/qa/ultima`), con una rejilla de `umbral_recomendar`,
`umbral_mostrar` y `umbral_choice`. Calibra con los casos originales y valida con las paráfrasis
(`parafrasis-*`). Si la validación cae más de 10 puntos, no escribe. Con `--escribir` actualiza
`src/data/umbrales.json`.

Con la corrida anterior, bajar `umbral_mostrar` de 0.40 a 0.35 sube la calibración de 18/24 a
19/24 en top-1 y deja igual la validación (28/30). En total: **47/54 en top-1 (87 %)**. Ese valor
ya está aplicado.

## Ver los leads (solo la persona dueña de la cuenta)

Los leads se guardan en la tabla `leads` de D1 y ninguna ruta pública los expone. Para verlos hay que tener sesión de Cloudflare en la cuenta dueña (`npx wrangler login`):

- `npm run leads`: últimos 200 en una tabla.
- `npm run leads:exportar`: todos a `.wrangler/leads.json` (carpeta ignorada por git).

## Revisiones

Las revisiones de seguridad y de puntos ciegos se hicieron en una sola pasada al final (no por bloque) y están en `docs/revisiones/`.

## Privacidad y seguridad

- El aviso está en [`/privacidad.html`](/privacidad.html).
- Cabeceras CSP estrictas, validación con zod en toda entrada, límite de peticiones por IP y errores sin stack.
- Nunca se llama a ningún webhook ni número de WhatsApp de 30X; compartir usa `wa.me/?text=` sin número.

## Licencia

MIT.
