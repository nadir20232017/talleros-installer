-- Script completo para configurar PostgreSQL en Render
-- Ejecutar TODO este script en el panel SQL de Render

-- =====================================================
-- 1. CREAR TABLAS
-- =====================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol TEXT DEFAULT 'tecnico',
  iniciales TEXT,
  color TEXT DEFAULT '#00d4ff',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  nif TEXT,
  direccion TEXT,
  tipo TEXT DEFAULT 'particular',
  notas TEXT,
  etiquetas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ordenes (
  id SERIAL PRIMARY KEY,
  numero TEXT UNIQUE NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  dispositivo TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  imei TEXT,
  problema TEXT,
  estado TEXT DEFAULT 'pendiente',
  prioridad TEXT DEFAULT 'normal',
  tecnico_id INTEGER REFERENCES usuarios(id),
  precio_estimado REAL DEFAULT 0,
  precio_final REAL DEFAULT 0,
  notas_internas TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ordenes_timeline (
  id SERIAL PRIMARY KEY,
  orden_id INTEGER REFERENCES ordenes(id),
  evento TEXT,
  descripcion TEXT,
  usuario_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventario (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  sku TEXT UNIQUE,
  categoria TEXT,
  precio_venta REAL DEFAULT 0,
  precio_coste REAL DEFAULT 0,
  stock INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facturas (
  id SERIAL PRIMARY KEY,
  numero TEXT UNIQUE NOT NULL,
  tipo TEXT NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  fecha DATE DEFAULT CURRENT_DATE,
  estado TEXT DEFAULT 'borrador',
  base REAL DEFAULT 0,
  iva REAL DEFAULT 0,
  total REAL DEFAULT 0,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. INSERTAR USUARIO ADMIN
-- =====================================================
-- Password: admin123 (hash bcrypt con 12 rounds)
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

-- =====================================================
-- 3. INSERTAR CONFIGURACIÓN DE TIENDA
-- =====================================================
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

-- =====================================================
-- 4. VERIFICAR INSTALACIÓN
-- =====================================================
SELECT 'Tablas creadas:' as info;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

SELECT 'Usuario admin:' as info;
SELECT id, nombre, email, rol, iniciales, activo FROM usuarios WHERE email = 'admin@igsm.com';

SELECT 'Configuración:' as info;
SELECT clave, valor FROM configuracion ORDER BY clave;
