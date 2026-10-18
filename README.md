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
19/24 en top-1 y deja igual la validación (28/30). Ese valor ya está aplicado.

### Regla de la Inmersión Ejecutiva

Los 3 fallos de Inmersión eran el mismo patrón: founder que factura USD 1M o más, con «todo
depende de mí» o «quiero expandirme» por encima de 0.8, enviado a Operaciones con AI o Advanced
Strategy. La regla (`src/motor/reglas.ts`) aplica el criterio que Andrés dice en voz alta
(«milloncitos de dólares para arriba») solo cuando la facturación fue respondida. Con las mismas
respuestas de JEV: **49/54 en top-1 (91 %)**, sin perder ningún acierto.

**Cómo leer estas cifras.** Los casos y sus respuestas esperadas los escribió el mismo equipo que
diseñó las preguntas y las reglas, y la regla de la Inmersión se diseñó mirando los fallos. Las
paráfrasis de validación salen de los mismos casos. Es una prueba de consistencia, no una medición
independiente: la medición real necesita retos reales etiquetados por 30X.

### Línea base contra un LLM genérico

`npm run comparar-llm -- --modelo <id-de-openrouter>` manda los mismos casos, con la misma
información que recibe JEV, a un LLM de chat por OpenRouter y reporta aciertos, latencia y costo
(gasta saldo: una llamada por caso; detalle en `.wrangler/comparacion-llm.json`).

## Ver los leads

**Para el equipo comercial:** [`/leads.html`](/leads.html) lista los últimos 200 leads calificados
(caliente: pidió asesor o su n.º 1 es Inmersión, Multipliers o Planes Corporativos; tibio:
recomendación completa; frío: el resto). Pide el secreto `LEADS_TOKEN`
(`npx wrangler secret put LEADS_TOKEN`, 32 caracteres o más); sin él, la ruta responde 401 siempre.

**Desde la terminal** (sesión de Cloudflare en la cuenta dueña, `npx wrangler login`):

- `npm run leads`: últimos 200 en una tabla.
- `npm run leads:exportar`: todos a `.wrangler/leads.json` (carpeta ignorada por git).

## Revisiones

Las revisiones de seguridad y de puntos ciegos se hicieron en una sola pasada al final (no por bloque) y están en `docs/revisiones/`.

## Privacidad y seguridad

- El aviso está en [`/privacidad.html`](/privacidad.html). Ahí mismo la persona borra sus datos con
  su correo y su WhatsApp (los dos deben coincidir; la respuesta es igual exista o no el lead).
- Un cron diario (`0 7 * * *`) borra los leads con más de 90 días y las tarjetas sin lead.
- Cabeceras CSP estrictas, validación con zod en toda entrada, límite de peticiones por IP y errores sin stack.
- Nunca se llama a ningún webhook ni número de WhatsApp de 30X; compartir usa `wa.me/?text=` sin número.

## Licencia

MIT.
