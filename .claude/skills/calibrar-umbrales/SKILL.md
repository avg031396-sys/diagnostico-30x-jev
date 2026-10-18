---
name: calibrar-umbrales
description: Recalibra src/data/umbrales.json con una corrida guardada de /qa (búsqueda en rejilla fuera de línea, sin red). Úsala cuando pidan "calibrar umbrales", "ajustar umbrales", "mejorar aciertos de QA" o tras una corrida nueva de QA con JEV real.
---

# Calibrar umbrales

## Cuándo usarla

Después de una corrida de QA cerrada con JEV real (`modo` = `composio-proxy`). Con `modo` = `mock`
la calibración no significa nada: el mock no es JEV.

## Pasos

1. Exporta la última corrida: abre `https://<dominio>/api/qa/ultima` (o `http://127.0.0.1:8787/api/qa/ultima`)
   y guarda el JSON como `.wrangler/qa-export.json` (carpeta ignorada por git y por Biome).
2. Corre sin escribir: `npm run calibrar -- .wrangler/qa-export.json`. Lee la tabla: cada fila es una
   combinación de `umbral_recomendar`, `umbral_mostrar`, `umbral_choice` con aciertos top-1 y top-3
   sobre los casos de calibración (id sin `parafrasis-`) y sobre los de validación (`parafrasis-`).
3. Elige la combinación que el script marca como mejor. Si la validación cae más de 10 puntos
   frente a la calibración, hay sobreajuste: no escribas, repórtalo.
4. Escribe: `npm run calibrar -- .wrangler/qa-export.json --escribir`. Solo cambia `src/data/umbrales.json`.
5. Corre la compuerta y vuelve a correr QA desde `/qa.html`.

## Verify

```bash
npm test -- tests/scripts/calibrar.test.ts   # expect: exit 0, 0 failed
npm test -- tests/motor                      # expect: exit 0, 0 failed
```

## No hagas

- No calibres con los casos `parafrasis-`: son la validación.
- No cambies `umbral_dolor`, `umbral_vaga` ni `delta_hermanos` con este script: no están en la rejilla.
- No uses el alias `~typesafe/jev-latest` para calibrar: los umbrales valen solo para el modelo pinneado.
