-- ============================================================
-- Biometrico — Migración 009: Índices de Performance
-- Specs: todos
-- Depende de: 008_registros_observados.sql (todas las tablas existen)
-- ============================================================

-- Asignaciones vigentes hoy
CREATE INDEX IF NOT EXISTS idx_asignaciones_horario_vigencia
  ON asignaciones_horario(colaborador_id, vigente_desde, vigente_hasta);

CREATE INDEX IF NOT EXISTS idx_asignaciones_horario_depto_vigencia
  ON asignaciones_horario(departamento_id, vigente_desde, vigente_hasta)
  WHERE departamento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_asignaciones_nomina_vigencia
  ON asignaciones_regla_nomina(colaborador_id, vigente_desde, vigente_hasta);

CREATE INDEX IF NOT EXISTS idx_asignaciones_nomina_depto_vigencia
  ON asignaciones_regla_nomina(departamento_id, vigente_desde, vigente_hasta)
  WHERE departamento_id IS NOT NULL;


-- Dashboard: estado de asistencia del día por área
CREATE INDEX IF NOT EXISTS idx_eventos_hora_colaborador
  ON eventos_biometricos(hora_marcacion, colaborador_id);

CREATE INDEX IF NOT EXISTS idx_colaboradores_departamento_activo
  ON colaboradores(departamento_id, activo);


-- Caja: cola de resultados pendientes de pago
CREATE INDEX IF NOT EXISTS idx_resultados_periodo_estado
  ON resultados_nomina(periodo_id, estado);

CREATE INDEX IF NOT EXISTS idx_resultados_colaborador_estado
  ON resultados_nomina(colaborador_id, estado);


-- Justificaciones por colaborador y fecha
CREATE INDEX IF NOT EXISTS idx_justificaciones_colaborador_fecha
  ON justificaciones(colaborador_id, fecha_ausencia);

CREATE INDEX IF NOT EXISTS idx_justificaciones_periodo_estado
  ON justificaciones(periodo_id, estado);


-- Reglas de nómina vigentes
CREATE INDEX IF NOT EXISTS idx_reglas_nomina_vigencia
  ON reglas_nomina(vigente_desde, vigente_hasta)
  WHERE activo = true;


-- Plantillas de horario vigentes
CREATE INDEX IF NOT EXISTS idx_plantillas_horario_vigencia
  ON plantillas_horario(vigente_desde, vigente_hasta)
  WHERE activo = true;


-- Sesiones activas por usuario
CREATE INDEX IF NOT EXISTS idx_sesiones_activas
  ON sesiones_usuario(usuario_id)
  WHERE estado = 'activo';
