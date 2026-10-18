// Único módulo que toca las tablas `leads` y `resultados`. Todo con prepare + bind.

export type FilaLead = {
  id: number;
  token: string;
  estado: "en_curso" | "completo" | "error";
  nombre: string;
  perfil: string;
  etapa: string | null;
  edad_hijo: number | null;
  reto: string;
  dolores_elegidos: string | null;
  metas_elegidas: string | null;
  jev_respuestas: string | null;
  llamadas_jev: number;
  latencia_ms: number;
  costo_usd: number;
  resultado_id: string | null;
};

export type NuevoLead = {
  token: string;
  estado: "en_curso" | "error";
  nombre: string;
  email: string;
  whatsapp: string;
  empresa: string | null;
  perfil: string;
  etapa: string | null;
  edad_hijo: number | null;
  reto: string;
  jev_modo: string;
  jev_modelo: string;
  jev_respuestas: string | null;
  jev_error: string | null;
  latencia_ms: number;
  costo_usd: number;
};

export type FilaResultado = {
  id: string;
  created_at: string;
  nombre_pila: string;
  tipo: "recomendado" | "preliminar" | "conversacion";
  requiere_revision: number;
  programa_id: string | null;
  fit: number | null;
  detalle: string;
};

export async function crearLead(db: D1Database, l: NuevoLead): Promise<void> {
  const ahora = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO leads (token, estado, nombre, email, whatsapp, empresa, consentimiento,
        consentimiento_at, perfil, etapa, edad_hijo, reto, jev_modo, jev_modelo, jev_respuestas,
        jev_error, llamadas_jev, latencia_ms, costo_usd)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .bind(
      l.token,
      l.estado,
      l.nombre,
      l.email,
      l.whatsapp,
      l.empresa,
      ahora,
      l.perfil,
      l.etapa,
      l.edad_hijo,
      l.reto,
      l.jev_modo,
      l.jev_modelo,
      l.jev_respuestas,
      l.jev_error,
      l.latencia_ms,
      l.costo_usd,
    )
    .run();
}

export async function obtenerLead(db: D1Database, token: string): Promise<FilaLead | null> {
  return db
    .prepare(
      `SELECT id, token, estado, nombre, perfil, etapa, edad_hijo, reto, dolores_elegidos,
        metas_elegidas, jev_respuestas, llamadas_jev, latencia_ms, costo_usd, resultado_id
       FROM leads WHERE token = ?`,
    )
    .bind(token)
    .first<FilaLead>();
}

export async function guardarAclaracion(
  db: D1Database,
  token: string,
  datos: {
    dolores_elegidos: string[];
    metas_elegidas: string[];
    jev_respuestas: string | null;
    latencia_ms: number;
    costo_usd: number;
  },
): Promise<void> {
  // Con jev_respuestas null (la 2.ª llamada falló) se conservan las de la 1.ª llamada.
  await db
    .prepare(
      `UPDATE leads SET llamadas_jev = 2, dolores_elegidos = ?, metas_elegidas = ?,
        jev_respuestas = COALESCE(?, jev_respuestas), latencia_ms = latencia_ms + ?,
        costo_usd = costo_usd + ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE token = ?`,
    )
    .bind(
      JSON.stringify(datos.dolores_elegidos),
      JSON.stringify(datos.metas_elegidas),
      datos.jev_respuestas,
      datos.latencia_ms,
      datos.costo_usd,
      token,
    )
    .run();
}

export async function guardarConfirmacion(
  db: D1Database,
  token: string,
  dolores: string[],
): Promise<void> {
  await db
    .prepare(
      `UPDATE leads SET dolores_confirmados = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE token = ?`,
    )
    .bind(JSON.stringify(dolores), token)
    .run();
}

export async function completarLead(
  db: D1Database,
  datos: {
    token: string;
    resultado: Omit<FilaResultado, "created_at">;
    respuestas_seguimiento: Record<string, string> | null;
    confianza_choice: number | null;
  },
): Promise<void> {
  const r = datos.resultado;
  await db.batch([
    db
      .prepare(
        `INSERT INTO resultados (id, nombre_pila, tipo, requiere_revision, programa_id, fit, detalle)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(r.id, r.nombre_pila, r.tipo, r.requiere_revision, r.programa_id, r.fit, r.detalle),
    db
      .prepare(
        `UPDATE leads SET estado = 'completo', respuestas_seguimiento = ?, programa_top = ?,
          fit_top = ?, confianza_choice = ?, requiere_revision = ?, resultado_id = ?,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE token = ?`,
      )
      .bind(
        datos.respuestas_seguimiento ? JSON.stringify(datos.respuestas_seguimiento) : null,
        r.programa_id,
        r.fit,
        datos.confianza_choice,
        r.requiere_revision,
        r.id,
        datos.token,
      ),
  ]);
}

export async function marcarAsesor(db: D1Database, token: string): Promise<boolean> {
  const r = await db
    .prepare(
      `UPDATE leads SET quiere_asesor = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE token = ?`,
    )
    .bind(token)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

export async function obtenerResultado(db: D1Database, id: string): Promise<FilaResultado | null> {
  return db
    .prepare(
      `SELECT id, created_at, nombre_pila, tipo, requiere_revision, programa_id, fit, detalle
       FROM resultados WHERE id = ?`,
    )
    .bind(id)
    .first<FilaResultado>();
}
