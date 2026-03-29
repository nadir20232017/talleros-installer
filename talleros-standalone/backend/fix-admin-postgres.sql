-- Script para crear usuario admin en PostgreSQL (Render)
-- Ejecutar esto en el panel SQL de Render

-- Insertar usuario admin con hash bcrypt pre-calculado para 'admin123'
INSERT INTO usuarios (nombre, email, password_hash, rol, iniciales, color, activo)
SELECT
  'Administrador',
  'admin@igsm.com',
  '$2a$12$K0ByB.6Y.i2O5RYh9j3Y0OPxXq8E/1qCkLvRcMlZjkTzKUJxRqKi',
  'admin',
  'AD',
  '#ff3d5a',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios WHERE email = 'admin@igsm.com'
);

-- Verificar que se creó
SELECT id, nombre, email, rol, iniciales, activo FROM usuarios WHERE email = 'admin@igsm.com';
