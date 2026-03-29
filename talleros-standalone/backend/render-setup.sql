-- Script de configuración inicial para PostgreSQL en Render
-- Ejecutar esto después de crear las tablas

-- Insertar configuración de la tienda
INSERT INTO configuracion (clave, valor, updated_at) VALUES
('taller_nombre', 'iGSM Servicio Técnico', NOW()),
('taller_direccion', 'C/Margarita Xirgu 9 Local', NOW()),
('taller_ciudad', '33213 Gijón, Asturias', NOW()),
('taller_telefono', '984 205 111', NOW()),
('taller_email', 'info@igsm.com', NOW()),
('taller_web', 'www.igsm.com', NOW()),
('taller_horario_lunes_viernes', '9:00 - 14:00 / 17:00 - 20:00', NOW()),
('taller_horario_sabados', '', NOW()),
('taller_lat', '43.5322', NOW()),
('taller_lng', '-5.6611', NOW())
ON CONFLICT (clave) DO UPDATE SET
  valor = EXCLUDED.valor,
  updated_at = NOW();

-- Crear usuario admin por defecto (contraseña: admin123)
-- El hash es para bcrypt con 12 rounds
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

-- Insertar algunas órdenes de ejemplo (opcional)
INSERT INTO clientes (nombre, email, telefono, direccion, tipo, created_at)
SELECT 'Cliente Ejemplo', 'cliente@ejemplo.com', '612345678', 'Dirección de prueba', 'particular', NOW()
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE email = 'cliente@ejemplo.com');

-- Crear tabla ordenes_timeline si no existe
CREATE TABLE IF NOT EXISTS ordenes_timeline (
  id SERIAL PRIMARY KEY,
  orden_id INTEGER REFERENCES ordenes(id),
  evento TEXT,
  descripcion TEXT,
  usuario_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
