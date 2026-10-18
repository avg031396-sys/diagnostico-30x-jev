-- Esquema inicial de Diagnóstico 30X con JEV.
-- Escrito a mano. Una vez comiteado no se edita: un cambio de esquema es un archivo nuevo.
-- Las fechas son texto ISO 8601 en UTC. Los campos que guardan JSON son TEXT.

-- Tarjeta pública de resultado. NUNCA lleva datos de contacto.
CREATE TABLE resultados (
  id TEXT PRIMARY KEY CHECK (length(id) = 10),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  nombre_pila TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('recomendado', 'preliminar', 'conversacion')),
  requiere_revision INTEGER NOT NULL DEFAULT 0 CHECK (requiere_revision IN (0, 1)),
  programa_id TEXT,
  fit REAL,
  detalle TEXT NOT NULL
);

-- Lead privado: contacto, consentimiento, respuestas de JEV y resultado. Nunca se expone por HTTP.
CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE CHECK (length(token) = 22),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  estado TEXT NOT NULL DEFAULT 'en_curso' CHECK (estado IN ('en_curso', 'completo', 'error')),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  empresa TEXT,
  consentimiento INTEGER NOT NULL CHECK (consentimiento = 1),
  consentimiento_at TEXT NOT NULL,
  perfil TEXT NOT NULL,
  etapa TEXT,
  edad_hijo INTEGER,
  reto TEXT NOT NULL,
  dolores_elegidos TEXT,
  metas_elegidas TEXT,
  dolores_confirmados TEXT,
  respuestas_seguimiento TEXT,
  jev_modo TEXT,
  jev_modelo TEXT,
  jev_respuestas TEXT,
  jev_error TEXT,
  llamadas_jev INTEGER NOT NULL DEFAULT 0 CHECK (llamadas_jev BETWEEN 0 AND 2),
  latencia_ms INTEGER NOT NULL DEFAULT 0,
  costo_usd REAL NOT NULL DEFAULT 0,
  programa_top TEXT,
  fit_top REAL,
  confianza_choice REAL,
  requiere_revision INTEGER NOT NULL DEFAULT 0 CHECK (requiere_revision IN (0, 1)),
  quiere_asesor INTEGER NOT NULL DEFAULT 0 CHECK (quiere_asesor IN (0, 1)),
  resultado_id TEXT REFERENCES resultados (id)
);

CREATE INDEX idx_leads_creado ON leads (created_at);

-- Corridas de QA sobre los casos de prueba de insumos-jev.json.
CREATE TABLE qa_runs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  estado TEXT NOT NULL DEFAULT 'en_curso' CHECK (estado IN ('en_curso', 'cerrado')),
  modo TEXT NOT NULL,
  modelo TEXT NOT NULL,
  umbrales TEXT NOT NULL,
  lotes_total INTEGER NOT NULL,
  lotes_procesados TEXT NOT NULL DEFAULT '[]',
  total INTEGER,
  evaluables INTEGER,
  aciertos_top1 INTEGER,
  aciertos_top3 INTEGER,
  latencia_p50 INTEGER,
  latencia_p95 INTEGER,
  costo_total REAL,
  detalle TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_qa_runs_estado_fecha ON qa_runs (estado, created_at);
