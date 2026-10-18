---
name: revision-seguridad
description: Compuerta de revisión obligatoria al cerrar un bloque de código (motor y JEV, API, interfaz, QA y entrega). Úsala cuando una tarea diga "revisión", al terminar los pasos 7, 11, 16 y 20, o cuando pidan "abogado del diablo", "cyber-neo" o "revisar seguridad antes de cerrar".
---

# Revisión de puntos ciegos y seguridad

Cada bloque de código cierra con dos revisiones guardadas en el repo y cero hallazgos críticos
o altos abiertos. Es una compuerta: el paso de revisión no se cierra sin ella.

## Cuándo usarla

| Paso | Bloque | Archivos de salida |
|---|---|---|
| 7 | motor y JEV | `docs/revisiones/02-motor-jev-abogado.md` · `docs/revisiones/02-motor-jev-cyber-neo.md` |
| 11 | API | `docs/revisiones/03-api-abogado.md` · `docs/revisiones/03-api-cyber-neo.md` |
| 16 | interfaz | `docs/revisiones/04-interfaz-abogado.md` · `docs/revisiones/04-interfaz-cyber-neo.md` |
| 20 | QA y entrega | `docs/revisiones/05-qa-y-entrega-abogado.md` · `docs/revisiones/05-qa-y-entrega-cyber-neo.md` |

## Pasos

1. `mkdir -p docs/revisiones`
2. Lista el alcance: los directorios del bloque (tabla del paso en `tasks.json` / epic).
   Nunca incluyas `blueprints/`, `node_modules/`, `dist/` ni `.wrangler/`.
3. Invoca la skill `anthropic-skills:abogado-del-diablo` con la herramienta Skill. Pídele puntos
   ciegos del alcance contra estas reglas: datos personales nunca a JEV, logs ni `/r`; máximo 2
   llamadas a JEV por diagnóstico; motor puro; umbrales por parámetro; la persona nunca ve un error
   ni la palabra "revisión".
4. Invoca la skill `cyber-neo` con la herramienta Skill sobre la raíz del proyecto, excluyendo
   `blueprints/`. Pide foco en: secretos, CSP y cabeceras, validación de entrada, inyección SQL,
   comparación del `QA_TOKEN`, abuso del endpoint público (costo de JEV), XSS en el render del
   resultado y en la meta OG.
5. Guarda cada salida con esta plantilla exacta (una por archivo):

   ```markdown
   # Revisión NN — <bloque> — <abogado del diablo | cyber-neo>

   Herramienta: <anthropic-skills:abogado-del-diablo | cyber-neo | revisión manual (skill no disponible)>
   Fecha: AAAA-MM-DD
   Alcance: <directorios>

   ## Hallazgos

   | # | Severidad | Hallazgo | Estado | Corrección |
   |---|---|---|---|---|
   | 1 | crítica / alta / media / baja | qué encontró | corregido / aceptado | archivo y cambio |

   ## Notas

   Hallazgos críticos abiertos: 0
   ```

6. Corrige todo hallazgo de severidad crítica o alta. Un hallazgo medio o bajo puede quedar
   `aceptado` con su razón en la fila.
7. Escribe la última línea con el número real de críticos + altos sin corregir. Solo si es 0 la
   línea queda exactamente `Hallazgos críticos abiertos: 0`.
8. Corre el Verify del paso.

## Verify

```bash
test -f docs/revisiones/02-motor-jev-abogado.md                                  # expect: exit 0
grep -qx "Hallazgos críticos abiertos: 0" docs/revisiones/02-motor-jev-abogado.md  # expect: exit 0
npm run typecheck && npm run lint && npm test                                     # expect: exit 0
```

## Si una skill no está instalada

No te detengas. Haz la revisión a mano con la lista del punto 3 o 4, escribe
`Herramienta: revisión manual (skill no disponible)` y deja una fila que diga qué skill faltó.

## No hagas

- No escribas `Hallazgos críticos abiertos: 0` antes de corregir. Esa línea es la compuerta.
- No borres hallazgos para que la tabla se vea limpia: márcalos `corregido` o `aceptado`.
- No pegues secretos, tokens ni datos de leads en los documentos de revisión.
