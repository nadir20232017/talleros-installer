// ═══════════════════════════════════════════════════════
//  TallerOS API — Servidor principal (LIMPIO)
// ═══════════════════════════════════════════════════════
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');

const app = express();

// ── INICIALIZAR BASE DE DATOS ────────────────────────
const { initDatabase, isPostgres } = require('./utils/database');

// ── MIDDLEWARES GLOBALES ─────────────────────────────

// CORS PRIMERO - antes que cualquier otro middleware
app.use(function(req, res, next) {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Responder inmediatamente a OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

app.use(morgan('combined'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - NO aplicar a OPTIONS
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  max: parseInt(process.env.RATE_LIMIT_MAX || 100),
  message: { error: 'Demasiadas peticiones, intenta de nuevo en 15 minutos' },
  skip: function(req) {
    return req.method === 'OPTIONS';
  }
});
app.use('/api/', limiter);

// Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── RUTAS API ────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clientes', require('./routes/clientes'));
// NOTA: /api/ordenes se carga después de las rutas públicas
app.use('/api/facturacion', require('./routes/facturacion'));
app.use('/api/notificaciones', require('./routes/notificaciones'));
app.use('/api/inventario', require('./routes/inventario'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/configuracion', require('./routes/configuracion'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    version: '1.0.0',
    app: 'TallerOS API',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// GET /api/ordenes/consulta/:numero — consulta pública para clientes (sin auth)
// IMPORTANTE: Esta ruta debe ir ANTES de montar el router de /api/ordenes
const db = require('./db/conexion');
app.get('/api/ordenes/consulta/:numero', async function(req, res) {
  try {
    const numero = req.params.numero;

    const result = await db.query(`
      SELECT o.*, c.telefono AS cliente_tel
      FROM ordenes o
      LEFT JOIN clientes c ON c.id = o.cliente_id
      WHERE o.numero = $1
    `, [numero]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const orden = result.rows[0];

    const estadoLabels = {
      'pendiente': 'Pendiente',
      'proceso': 'En proceso',
      'espera_piezas': 'Esperando repuestos',
      'terminado': 'Listo para recoger',
      'entregado': 'Entregado',
      'cancelado': 'Cancelado'
    };

    res.json({
      numero: orden.numero,
      estado: orden.estado,
      estadoLabel: estadoLabels[orden.estado] || orden.estado,
      tipo: orden.dispositivo,
      modelo: orden.modelo,
      averia: orden.problema,
      fecha: orden.created_at,
      precio: orden.precio_final || orden.precio_estimado,
      telefono: orden.cliente_tel
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Montar router de ordenes DESPUÉS de la ruta pública
app.use('/api/ordenes', require('./routes/ordenes'));

// ── FRONTEND ESTATICO ────────────────────────────────
const frontendPath = path.resolve(process.env.FRONTEND_PATH || path.join(__dirname, '../../frontend'));
app.use(express.static(frontendPath, {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }
}));

// Service Worker con headers correctos
app.get('/service-worker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.resolve(frontendPath, 'service-worker.js'));
});

// Endpoint de diagnóstico temporal
app.get('/api/diagnostico', async (req, res) => {
  const { pool, isPostgres, initDatabase } = require('./utils/database');

  if (!isPostgres()) {
    return res.json({ db: 'SQLite', message: 'Usando SQLite local' });
  }

  const result = {
    db: 'PostgreSQL',
    tables: [],
    usuarios: 0,
    adminExists: false,
    error: null,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? 'Configurado' : 'NO CONFIGURADO',
      NODE_ENV: process.env.NODE_ENV || 'development'
    }
  };

  try {
    const client = await pool.connect();
    try {
      // Listar tablas
      const tables = await client.query(`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
      `);
      result.tables = tables.rows.map(r => r.table_name);

      // Contar usuarios
      if (result.tables.includes('usuarios')) {
        const users = await client.query('SELECT COUNT(*) as total FROM usuarios');
        result.usuarios = parseInt(users.rows[0].total);

        const admin = await client.query('SELECT id, email, rol FROM usuarios WHERE email = $1', ['admin@igsm.com']);
        result.adminExists = admin.rows.length > 0;
        if (admin.rows.length > 0) {
          result.adminData = admin.rows[0];
        }
      }
    } finally {
      client.release();
    }
  } catch (err) {
    result.error = err.message;
    result.stack = err.stack;
  }

  res.json(result);
});

// Endpoint para forzar la creación del admin (emergencia)
app.get('/api/setup', async (req, res) => {
  const { pool, isPostgres } = require('./utils/database');

  if (!isPostgres()) {
    return res.json({ message: 'SQLite no necesita setup' });
  }

  const results = [];

  try {
    const client = await pool.connect();
    try {
      // Crear tabla usuarios
      await client.query(`
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
        )
      `);
      results.push('Tabla usuarios creada');

      // Crear admin
      const hash = '$2a$12$K0ByB.6Y.i2O5RYh9j3Y0OPxXq8E/1qCkLvRcMlZjkTzKUJxRqKi';
      await client.query(`
        INSERT INTO usuarios (nombre, email, password_hash, rol, iniciales, color, activo)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO NOTHING
      `, ['Administrador', 'admin@igsm.com', hash, 'admin', 'AD', '#ff3d5a', true]);
      results.push('Usuario admin creado');

      // Verificar
      const users = await client.query('SELECT COUNT(*) as total FROM usuarios');
      results.push(`Total usuarios: ${users.rows[0].total}`);

    } finally {
      client.release();
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.resolve(frontendPath, 'index.html');
  res.sendFile(indexPath);
});

// ── MANEJO DE ERRORES ────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── INICIALIZAR USUARIO ADMIN ───────────────────────
const bcrypt = require('bcryptjs');
const { query } = require('./utils/database');

async function initAdminUser() {
  try {
    const result = await query('SELECT COUNT(*) as count FROM usuarios');
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
      console.log('[INIT] Creando usuario admin por defecto...');
      const hash = await bcrypt.hash('admin123', 12);
      await query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol, iniciales, color, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Administrador', 'admin@igsm.com', hash, 'admin', 'AD', '#ff3d5a', true]
      );
      console.log('[INIT] ✅ Usuario admin creado:');
      console.log('[INIT]    Email: admin@igsm.com');
      console.log('[INIT]    Password: admin123');
    } else {
      console.log(`[INIT] ✅ ${count} usuarios encontrados en la BD`);
      console.log('[INIT]    Reset de password del admin existente...');
      // Reset password del admin existente
      const hash = await bcrypt.hash('admin123', 12);
      await query(
        "UPDATE usuarios SET password_hash = $1 WHERE rol = 'admin'",
        [hash]
      );
      console.log('[INIT]    ✅ Contraseña del admin reseteada a: admin123');
    }
  } catch (err) {
    console.error('[INIT ERROR]', err.message);
  }
}

// Ejecutar inicialización (esperar a que DB esté lista)
async function startup() {
  try {
    // Inicializar DB (crear tablas si no existen)
    await initDatabase();
    console.log('[STARTUP] ✅ Base de datos inicializada');

    // Luego crear usuario admin
    await initAdminUser();
  } catch (err) {
    console.error('[STARTUP ERROR]', err.message);
  }
}

startup();

// ── INICIAR SERVIDOR ─────────────────────────────────
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('');
  console.log('  ████████╗ █████╗ ██╗     ██╗     ███████╗██████╗  ██████╗ ███████╗');
  console.log('  ╚══██╔══╝██╔══██╗██║     ██║     ██╔════╝██╔══██╗██╔═══██╗██╔════╝');
  console.log('     ██║   ███████║██║     ██║     █████╗  ██████╔╝██║   ██║███████╗');
  console.log('     ██║   ██╔══██║██║     ██║     ██╔══╝  ██╔══██╗██║   ██║╚════██║');
  console.log('     ██║   ██║  ██║███████╗███████╗███████╗██║  ██║╚██████╔╝███████║');
  console.log('     ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝');
  console.log('');
  console.log(`  🚀 API iniciada en http://${HOST}:${PORT}`);
  console.log(`  📊 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`  🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
});

module.exports = app;
