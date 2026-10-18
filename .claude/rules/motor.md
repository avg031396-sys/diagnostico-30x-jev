---
description: Convenciones del motor de decisión puro (ranking, requisitos, seguimientos, QA)
paths:
  - "src/motor/**"
  - "src/qa/**"
  - "src/data/**"
---

# Motor puro

- `src/motor/` y `src/qa/` son puros: sin `fetch`, sin `console`, sin `Date.now()`, sin `crypto`,
  sin `D1Database`, `HTMLRewriter`, `Env` ni DOM. Reciben datos, devuelven datos.
- Los umbrales entran siempre por parámetro (`Umbrales`). Solo el borde (Worker, scripts) lee
  `src/data/umbrales.json`.
- Comparaciones: `>=` para `umbral_recomendar`, `umbral_mostrar` y `umbral_choice`; `>` (estricto)
  para `umbral_dolor` y `umbral_vaga`. `delta_hermanos` se compara con `<`.
- El fit de un programa sale del Noul `fit_<id en minúsculas>` (`Sales_Machine` → `fit_sales_machine`).
  Un Noul ausente vale 0.
- `src/motor/catalogo.ts` es una copia escrita a mano de lo que dice `src/data/insumos-jev.json`
  (programas en el orden de las opciones del Choice, familias, dolores). `tests/jev/preguntas.test.ts`
  falla si se separan: si cambias uno, cambia el otro en el mismo commit.
- Nunca edites `src/data/insumos-jev.json`. Es el insumo de radar-30x y no lo produce este repo.
- Requisitos de tipo `texto` (AI_for_Executives, AI_for_Developers, Advanced_Strategy) se tratan como
  cumplidos. No inventes requisitos que no estén en `requisitos_programas`.
- Cada cambio de comportamiento llega con su prueba en `tests/motor/` o `tests/qa/`.
- Imports relativos con extensión `.ts` explícita. JSON con `with { type: "json" }`. Sin alias.
- Sintaxis borrable solamente (`erasableSyntaxOnly`): nada de `enum`, `namespace` ni propiedades
  de parámetro en constructores. Los tipos se importan con `import type`.
