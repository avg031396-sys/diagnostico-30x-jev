# Revisión 07 — correcciones del abogado del diablo — cyber-neo

Herramienta: cyber-neo (versión reducida: revisión manual enfocada sobre el diff, `npm audit`)
Fecha: 2026-10-18
Alcance: regla de la Inmersión, borrado y purga, vista de leads, contacto al final, `comparar-llm`

## Hallazgos

| # | Severidad | Hallazgo | Estado | Corrección |
|---|---|---|---|---|
| 1 | alta | `/api/leads` devuelve datos de contacto: si la ruta fuera pública sería una fuga de leads | mitigado | Exige `LEADS_TOKEN` (secreto aparte) con `compararSeguro()`; sin secreto, 401 siempre; `Cache-Control: no-store`; límite de 10 por minuto por IP; la página no guarda el token y lleva `noindex`. E2E: 401 sin token o con token equivocado |
| 2 | media | Borrado a pedido sin verificación de identidad: con solo el correo cualquiera borraría a otra persona | mitigado | Deben coincidir correo y WhatsApp; límite por IP; la respuesta es igual exista o no el lead (no sirve para averiguar quién hizo el diagnóstico) |
| 3 | media | Datos personales sin plazo de borrado | corregido | Cron diario borra leads de más de 90 días y tarjetas sin lead; el aviso lo dice |
| 4 | media | El aviso decía que «alguien de 30X» contactaría a la persona, pero 30X no recibe los datos | corregido | El aviso dice quién contacta y que 30X no recibe los datos |
| 5 | baja | El borrado por GitHub issues obligaba a publicar datos personales para pedir el borrado | corregido | Formulario propio en `/privacidad.html` |
| 6 | baja | `comparar-llm` manda texto a un tercero (OpenRouter) | aceptado | Solo los casos sintéticos de `insumos-jev.json`, nunca leads; lo corre solo quien tiene la clave |
| 7 | baja | SQL nuevo (`borrado.ts`, `listarLeads`) | aceptado | Todo con `prepare().bind()`; los `IN` se arman con una sentencia por id, sin concatenar |

## Notas

El botón «Habla con un asesor de 30X» sigue con ese texto en la interfaz: promete un contacto de 30X
que hoy no existe. Se deja para decisión del dueño del proyecto (ver README, «Ver los leads»).

Hallazgos críticos abiertos: 0
