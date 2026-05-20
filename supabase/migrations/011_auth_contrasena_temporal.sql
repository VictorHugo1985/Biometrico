-- Agrega columna contrasena_temporal a usuarios
-- Requerida por el servicio de autenticación para flujo de reset de contraseña

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS contrasena_temporal BOOLEAN NOT NULL DEFAULT false;
