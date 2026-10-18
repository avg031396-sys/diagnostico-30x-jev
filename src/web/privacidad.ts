import { api } from "./comun.ts";

// Formulario de borrado del aviso de privacidad. La API responde lo mismo exista o no el
// diagnóstico, así que el mensaje tampoco lo distingue.
const form = document.getElementById("form-borrado") as HTMLFormElement | null;
const estado = document.getElementById("borrado-estado");

form?.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!estado) {
    return;
  }
  const datos = new FormData(form);
  const email = String(datos.get("email") ?? "").trim();
  const whatsapp = String(datos.get("whatsapp") ?? "").trim();
  if (!email || !whatsapp) {
    estado.textContent = "Escribe tu correo y tu WhatsApp.";
    return;
  }
  const boton = form.querySelector("button");
  if (boton) {
    boton.disabled = true;
  }
  const r = await api("/api/borrado", { email, whatsapp });
  if (r.estado === 202) {
    estado.textContent =
      "Listo. Si había un diagnóstico con ese correo y ese WhatsApp, ya no existe.";
    form.reset();
  } else if (r.estado === 400) {
    estado.textContent = "Revisa el correo y el WhatsApp.";
  } else if (r.estado === 429) {
    estado.textContent = "Demasiados intentos. Espera un minuto.";
  } else {
    estado.textContent = "No pudimos borrar ahora. Intenta de nuevo en un momento.";
  }
  if (boton) {
    boton.disabled = false;
  }
});
