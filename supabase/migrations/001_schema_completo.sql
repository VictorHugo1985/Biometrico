-- ============================================================
-- Biometrico — Esquema Completo v1.0
-- Basado en: specs/005-db-data-dictionary/spec.md
-- Fecha: 2026-05-19
-- 21 tablas · 7 dominios · single-tenant
-- ============================================================

-- ============================================================
-- FUNCIONES COMPARTIDAS
-- ============================================================

CREATE OR REPLACE FUNCTION fn_actualizar_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_bloquear_mutacion_eventos()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'eventos_biometricos es append-only (Principio I de la Constitución)';
END;
$$;

-- ============================================================
-- TIPOS ENUM
-- ============================================================

DO $$ BEGIN
  CREATE TYPE rol_usuario AS ENUM ('administrador', 'supervisor', 'colaborador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_sesion AS ENUM ('activo', 'expirado', 'cerrado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_token AS ENUM ('pendiente', 'usado', 'expirado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE origen_evento AS ENUM ('webhook', 'sincronizacion_api');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_ajuste AS ENUM ('correccion', 'adicion', 'marca_eliminacion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_ajuste AS ENUM ('pendiente', 'aprobado', 'rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_periodo AS ENUM ('abierto', 'cerrado', 'reabierto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_resultado AS ENUM ('borrador', 'aprobado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_linea_nomina AS ENUM ('ordinario', 'hora_extra', 'bono_transporte', 'bono_alimentacion', 'descuento', 'ajuste');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_justificacion AS ENUM ('medica', 'personal', 'permiso_aprobado', 'otro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_justificacion AS ENUM ('pendiente', 'aprobado', 'rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_entidad_aprobacion AS ENUM ('ajuste_biometrico', 'justificacion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE decision_aprobacion AS ENUM ('aprobado', 'rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_procesamiento_webhook AS ENUM ('procesado', 'rechazado', 'fallido', 'duplicado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- WAVE 1: Sin dependencias FK externas
-- ============================================================

-- tipos_verificacion (tabla de referencia; valores fijos del proveedor CrossChex)
CREATE TABLE IF NOT EXISTS tipos_verificacion (
  codigo    INTEGER  PRIMARY KEY,
  descripcion TEXT   NOT NULL,
  activo    BOOLEAN  NOT NULL DEFAULT true
);

INSERT INTO tipos_verificacion (codigo, descripcion) VALUES
  (1,   'ID + Contraseña'),
  (6,   'Predeterminado'),
  (8,   'Tarjeta + Contraseña'),
  (56,  'Tarjeta'),
  (64,  'Huella + Contraseña / Facial + Contraseña'),
  (128, 'Referencia interna'),
  (144, 'Huella + Tarjeta / Facial + Contraseña'),
  (192, 'Huella / Facial'),
  (193, 'Huella + Tarjeta + Contraseña')
ON CONFLICT (codigo) DO NOTHING;

-- usuarios (FK self-ref creado_por y colaborador_id se agregan después)
CREATE TABLE IF NOT EXISTS usuarios (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  correo           TEXT        NOT NULL,
  hash_contrasena  TEXT        NOT NULL,
  rol              rol_usuario NOT NULL,
  colaborador_id   UUID,
  activo           BOOLEAN     NOT NULL DEFAULT true,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por       UUID,
  CONSTRAINT uq_usuarios_correo UNIQUE (correo)
);

CREATE OR REPLACE TRIGGER trg_actualizar_usuarios
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

-- departamentos (FK self-ref padre_id se agrega después)
CREATE TABLE IF NOT EXISTS departamentos (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         TEXT        NOT NULL,
  descripcion    TEXT,
  padre_id       UUID,
  activo         BOOLEAN     NOT NULL DEFAULT true,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_departamentos_nombre UNIQUE (nombre)
);

CREATE OR REPLACE TRIGGER trg_actualizar_departamentos
BEFORE UPDATE ON departamentos
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

-- tokens_api_externa
CREATE TABLE IF NOT EXISTS tokens_api_externa (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  valor_token  TEXT        NOT NULL,
  obtenido_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_en    TIMESTAMPTZ NOT NULL,
  activo       BOOLEAN     NOT NULL DEFAULT true,
  revocado_en  TIMESTAMPTZ
);

-- ============================================================
-- WAVE 2: Depende de Wave 1
-- ============================================================

-- dispositivos_biometricos
CREATE TABLE IF NOT EXISTS dispositivos_biometricos (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_serie   TEXT        NOT NULL,
  nombre         TEXT        NOT NULL,
  ubicacion      TEXT,
  activo         BOOLEAN     NOT NULL DEFAULT true,
  registrado_en  DATE        NOT NULL,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_dispositivos_numero_serie UNIQUE (numero_serie)
);

CREATE OR REPLACE TRIGGER trg_actualizar_dispositivos
BEFORE UPDATE ON dispositivos_biometricos
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

-- colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_empleado  TEXT        NOT NULL,
  nombre           TEXT        NOT NULL,
  apellido         TEXT        NOT NULL,
  correo           TEXT,
  departamento_id  UUID        REFERENCES departamentos(id),
  fecha_ingreso    DATE        NOT NULL,
  fecha_baja       DATE,
  activo           BOOLEAN     NOT NULL DEFAULT true,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por       UUID        NOT NULL REFERENCES usuarios(id),
  CONSTRAINT uq_colaboradores_codigo UNIQUE (codigo_empleado),
  CONSTRAINT uq_colaboradores_correo UNIQUE (correo)
);

CREATE OR REPLACE TRIGGER trg_actualizar_colaboradores
BEFORE UPDATE ON colaboradores
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

-- FK diferidas en usuarios (ahora que colaboradores existe)
DO $$ BEGIN
  ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_colaborador
    FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) DEFERRABLE INITIALLY DEFERRED;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_creado_por
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) DEFERRABLE INITIALLY DEFERRED;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FK diferida en departamentos
DO $$ BEGIN
  ALTER TABLE departamentos ADD CONSTRAINT fk_departamentos_padre
    FOREIGN KEY (padre_id) REFERENCES departamentos(id) DEFERRABLE INITIALLY DEFERRED;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- sesiones_usuario
CREATE TABLE IF NOT EXISTS sesiones_usuario (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID          NOT NULL REFERENCES usuarios(id),
  hash_token       TEXT          NOT NULL,
  direccion_ip     TEXT,
  info_dispositivo TEXT,
  creado_en        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  expira_en        TIMESTAMPTZ   NOT NULL,
  cerrado_en       TIMESTAMPTZ,
  estado           estado_sesion NOT NULL DEFAULT 'activo',
  CONSTRAINT uq_sesiones_hash_token UNIQUE (hash_token)
);

-- tokens_recuperacion
CREATE TABLE IF NOT EXISTS tokens_recuperacion (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID         NOT NULL REFERENCES usuarios(id),
  hash_token  TEXT         NOT NULL,
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expira_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW() + INTERVAL '60 minutes',
  usado_en    TIMESTAMPTZ,
  estado      estado_token NOT NULL DEFAULT 'pendiente',
  CONSTRAINT uq_tokens_recuperacion_hash UNIQUE (hash_token)
);

-- intentos_login
CREATE TABLE IF NOT EXISTS intentos_login (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        UUID        REFERENCES usuarios(id),
  correo_intentado  TEXT        NOT NULL,
  direccion_ip      TEXT,
  exitoso           BOOLEAN     NOT NULL,
  intentado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- plantillas_horario
CREATE TABLE IF NOT EXISTS plantillas_horario (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              TEXT        NOT NULL,
  descripcion         TEXT,
  dias_laborales      INTEGER[]   NOT NULL,
  hora_entrada        TIME        NOT NULL,
  hora_salida         TIME        NOT NULL,
  tolerancia_minutos  INTEGER     NOT NULL DEFAULT 0,
  activo              BOOLEAN     NOT NULL DEFAULT true,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por          UUID        NOT NULL REFERENCES usuarios(id)
);

CREATE OR REPLACE TRIGGER trg_actualizar_plantillas
BEFORE UPDATE ON plantillas_horario
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

-- reglas_nomina
CREATE TABLE IF NOT EXISTS reglas_nomina (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                    TEXT          NOT NULL,
  tarifa_por_hora           NUMERIC(10,2) NOT NULL,
  umbral_horas_extra        NUMERIC(4,1)  NOT NULL,
  multiplicador_hora_extra  NUMERIC(3,2)  NOT NULL,
  bono_transporte_diario    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  bono_alimentacion_diario  NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  vigente_desde             DATE          NOT NULL,
  vigente_hasta             DATE,
  activo                    BOOLEAN       NOT NULL DEFAULT true,
  creado_en                 TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  creado_por                UUID          NOT NULL REFERENCES usuarios(id)
);

-- periodos_semanales
CREATE TABLE IF NOT EXISTS periodos_semanales (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  inicio_periodo  DATE           NOT NULL,
  fin_periodo     DATE           NOT NULL,
  estado          estado_periodo NOT NULL DEFAULT 'abierto',
  abierto_en      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  cerrado_en      TIMESTAMPTZ,
  cerrado_por     UUID           REFERENCES usuarios(id),
  reabierto_en    TIMESTAMPTZ,
  reabierto_por   UUID           REFERENCES usuarios(id),
  notas           TEXT,
  creado_en       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_periodos_inicio UNIQUE (inicio_periodo),
  CONSTRAINT uq_periodos_fin    UNIQUE (fin_periodo),
  CONSTRAINT chk_inicio_lunes   CHECK (EXTRACT(DOW FROM inicio_periodo) = 1),
  CONSTRAINT chk_duracion_semana CHECK (fin_periodo = inicio_periodo + INTERVAL '6 days')
);

-- registros_aprobacion
CREATE TABLE IF NOT EXISTS registros_aprobacion (
  id           UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_entidad tipo_entidad_aprobacion NOT NULL,
  entidad_id   UUID                    NOT NULL,
  decision     decision_aprobacion     NOT NULL,
  notas        TEXT,
  decidido_por UUID                    NOT NULL REFERENCES usuarios(id),
  decidido_en  TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WAVE 3: Depende de Wave 2
-- ============================================================

-- asignaciones_horario
CREATE TABLE IF NOT EXISTS asignaciones_horario (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_horario_id UUID        NOT NULL REFERENCES plantillas_horario(id),
  colaborador_id       UUID        REFERENCES colaboradores(id),
  departamento_id      UUID        REFERENCES departamentos(id),
  vigente_desde        DATE        NOT NULL,
  vigente_hasta        DATE,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por           UUID        NOT NULL REFERENCES usuarios(id),
  CONSTRAINT chk_xor_asignacion_horario CHECK (
    (colaborador_id IS NOT NULL AND departamento_id IS NULL) OR
    (colaborador_id IS NULL     AND departamento_id IS NOT NULL)
  )
);

-- asignaciones_regla_nomina
CREATE TABLE IF NOT EXISTS asignaciones_regla_nomina (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  regla_nomina_id UUID        NOT NULL REFERENCES reglas_nomina(id),
  colaborador_id  UUID        REFERENCES colaboradores(id),
  departamento_id UUID        REFERENCES departamentos(id),
  vigente_desde   DATE        NOT NULL,
  vigente_hasta   DATE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por      UUID        NOT NULL REFERENCES usuarios(id),
  CONSTRAINT chk_xor_asignacion_nomina CHECK (
    (colaborador_id IS NOT NULL AND departamento_id IS NULL) OR
    (colaborador_id IS NULL     AND departamento_id IS NOT NULL)
  )
);

-- eventos_biometricos (APPEND-ONLY — Principio I)
CREATE TABLE IF NOT EXISTS eventos_biometricos (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  id_solicitud_externo     TEXT          NOT NULL,
  colaborador_id           UUID          NOT NULL REFERENCES colaboradores(id),
  dispositivo_id           UUID          NOT NULL REFERENCES dispositivos_biometricos(id),
  codigo_tipo_verificacion INTEGER       NOT NULL REFERENCES tipos_verificacion(codigo),
  hora_marcacion           TIMESTAMPTZ   NOT NULL,
  origen                   origen_evento NOT NULL,
  recibido_en              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  payload_crudo            JSONB,
  CONSTRAINT uq_eventos_id_solicitud UNIQUE (id_solicitud_externo)
);

CREATE OR REPLACE TRIGGER trg_bloquear_mutacion_eventos
BEFORE UPDATE OR DELETE ON eventos_biometricos
FOR EACH ROW EXECUTE FUNCTION fn_bloquear_mutacion_eventos();

-- resultados_nomina
CREATE TABLE IF NOT EXISTS resultados_nomina (
  id                       UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id               UUID           NOT NULL REFERENCES periodos_semanales(id),
  colaborador_id           UUID           NOT NULL REFERENCES colaboradores(id),
  regla_nomina_id          UUID           NOT NULL REFERENCES reglas_nomina(id),
  total_horas_ordinarias   NUMERIC(5,2)   NOT NULL DEFAULT 0.00,
  total_horas_extra        NUMERIC(5,2)   NOT NULL DEFAULT 0.00,
  total_pago_ordinario     NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
  total_pago_extra         NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
  total_bono_transporte    NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
  total_bono_alimentacion  NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
  total_descuentos         NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
  total_bruto              NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
  estado                   estado_resultado NOT NULL DEFAULT 'borrador',
  calculado_en             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  calculado_por            UUID           NOT NULL REFERENCES usuarios(id),
  CONSTRAINT uq_resultado_periodo_colaborador UNIQUE (periodo_id, colaborador_id)
);

-- ============================================================
-- WAVE 4: Depende de Wave 3
-- ============================================================

-- ajustes_biometricos
CREATE TABLE IF NOT EXISTS ajustes_biometricos (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_original_id      UUID          REFERENCES eventos_biometricos(id),
  colaborador_id          UUID          NOT NULL REFERENCES colaboradores(id),
  periodo_id              UUID          NOT NULL REFERENCES periodos_semanales(id),
  tipo_ajuste             tipo_ajuste   NOT NULL,
  hora_marcacion_ajustada TIMESTAMPTZ,
  motivo                  TEXT          NOT NULL,
  estado                  estado_ajuste NOT NULL DEFAULT 'pendiente',
  creado_por              UUID          NOT NULL REFERENCES usuarios(id),
  creado_en               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  aprobado_por            UUID          REFERENCES usuarios(id),
  aprobado_en             TIMESTAMPTZ
);

-- auditoria_webhooks
CREATE TABLE IF NOT EXISTS auditoria_webhooks (
  id_solicitud_crosschex  TEXT,
  id                      UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
  recibido_en             TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
  cabeceras               JSONB                       NOT NULL,
  payload                 JSONB,
  firma_valida            BOOLEAN                     NOT NULL,
  estado_procesamiento    estado_procesamiento_webhook NOT NULL,
  notas_procesamiento     TEXT,
  evento_biometrico_id    UUID                        REFERENCES eventos_biometricos(id)
);

-- justificaciones
CREATE TABLE IF NOT EXISTS justificaciones (
  id                 UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id     UUID                NOT NULL REFERENCES colaboradores(id),
  periodo_id         UUID                NOT NULL REFERENCES periodos_semanales(id),
  fecha_ausencia     DATE                NOT NULL,
  tipo_justificacion tipo_justificacion  NOT NULL,
  descripcion        TEXT                NOT NULL,
  afecta_pago        BOOLEAN             NOT NULL DEFAULT false,
  estado             estado_justificacion NOT NULL DEFAULT 'pendiente',
  creado_por         UUID                NOT NULL REFERENCES usuarios(id),
  creado_en          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WAVE 5: Depende de Wave 4
-- ============================================================

-- lineas_resultado_nomina
CREATE TABLE IF NOT EXISTS lineas_resultado_nomina (
  id                   UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  resultado_nomina_id  UUID              NOT NULL REFERENCES resultados_nomina(id),
  tipo_linea           tipo_linea_nomina NOT NULL,
  descripcion          TEXT              NOT NULL,
  fecha_referencia     DATE              NOT NULL,
  cantidad             NUMERIC(5,2)      NOT NULL,
  valor_unitario       NUMERIC(10,2)     NOT NULL,
  total                NUMERIC(10,2)     NOT NULL,
  evento_biometrico_id UUID              REFERENCES eventos_biometricos(id),
  ajuste_id            UUID              REFERENCES ajustes_biometricos(id)
);

-- ============================================================
-- ÍNDICES ADICIONALES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_eventos_colaborador_hora
  ON eventos_biometricos(colaborador_id, hora_marcacion);

CREATE INDEX IF NOT EXISTS idx_eventos_hora
  ON eventos_biometricos(hora_marcacion);

CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_estado
  ON sesiones_usuario(usuario_id, estado);

CREATE INDEX IF NOT EXISTS idx_auditoria_id_solicitud
  ON auditoria_webhooks(id_solicitud_crosschex);

CREATE INDEX IF NOT EXISTS idx_ajustes_colaborador_estado
  ON ajustes_biometricos(colaborador_id, estado);

CREATE INDEX IF NOT EXISTS idx_intentos_correo_tiempo
  ON intentos_login(correo_intentado, intentado_en);
