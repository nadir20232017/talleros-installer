// ═══════════════════════════════════════════════════════
//  Conexion a Base de Datos - SQLite local / PostgreSQL (Render)
// ═══════════════════════════════════════════════════════
const path = require('path');

// Cargar pg solo si es necesario (PostgreSQL) - LAZY
let Pool;
function getPool() {
  console.log('[DB] getPool called, DATABASE_URL:', process.env.DATABASE_URL ? 'exists' : 'NOT SET');
  if (!Pool && process.env.DATABASE_URL?.includes('postgresql')) {
    console.log('[DB] Loading pg module...');
    try {
      Pool = require('pg').Pool;
      console.log('[DB] pg module loaded successfully');
    } catch (err) {
      console.error('[DB] ERROR loading pg:', err.message);
    }
  }
  return Pool;
}

// Cargar sqlite3 solo si es necesario (lazy load) - opcional
let sqlite3;
function getSQLite() {
  if (!sqlite3) {
    try {
      sqlite3 = require('sqlite3').verbose();
    } catch (err) {
      console.log('[DB] sqlite3 no disponible (opcional)');
      return null;
    }
  }
  return sqlite3;
}

// Detectar si usamos PostgreSQL (Render) o SQLite (local)
// Usar función para evaluar en tiempo de ejecución, no al cargar el módulo
function isPostgres() {
  return process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql');
}

let pool;
let db;
let dbInitialized = false;

function initSQLite() {
  if (!dbInitialized && !isPostgres()) {
    const sqlite3Lib = getSQLite();
    if (!sqlite3Lib) {
      throw new Error('SQLite3 no disponible. Instala sqlite3 o usa PostgreSQL (DATABASE_URL).');
    }
    const dbPath = path.join(__dirname, '../../talleros.db');
    db = new sqlite3Lib.Database(dbPath);
    console.log('[DB] Usando SQLite (local):', dbPath);
    dbInitialized = true;
  }
}

// Configuracion PostgreSQL para Render
function initPool() {
  console.log('[DB] initPool called');
  console.log('[DB] isPostgres():', isPostgres());
  console.log('[DB] DATABASE_URL:', process.env.DATABASE_URL ? 'exists' : 'NOT SET');

  if (!isPostgres()) {
    console.log('[DB] No es PostgreSQL, saltando inicialización de pool');
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error('[DB] ERROR: DATABASE_URL no está definida');
    return;
  }

  const PoolClass = getPool();
  if (!PoolClass) {
    console.error('[DB] ERROR: No se pudo cargar pg.Pool');
    return;
  }

  try {
    console.log('[DB] Creando pool PostgreSQL...');
    // Detectar si es conexión local (sin SSL) o remota (con SSL)
    const isLocalConnection = process.env.DATABASE_URL?.includes('localhost') ||
                                process.env.DATABASE_URL?.includes('127.0.0.1');

    pool = new PoolClass({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocalConnection ? false : { rejectUnauthorized: false }
    });
    console.log('[DB] PostgreSQL pool creado');

    // Probar conexion
    pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('[DB] ERROR conectando a PostgreSQL:', err.message);
      } else {
        console.log('[DB] PostgreSQL conectado, server time:', res.rows[0].now);
      }
    });
  } catch (err) {
    console.error('[DB] ERROR creando pool PostgreSQL:', err.message);
  }
}

// Inicializar pool inmediatamente si es PostgreSQL
initPool();

// Funcion para obtener timestamp segun la BD
function now() {
  return isPostgres() ? 'NOW()' : "datetime('now')";
}

// Funcion para obtener fecha segun la BD
function date(field) {
  return isPostgres() ? `EXTRACT(YEAR FROM ${field})` : `strftime('%Y', ${field})`;
}

// Convertir parametros segun la BD
function convertParams(sql, params) {
  if (isPostgres()) return { sql, params };

  // SQLite: reemplazar $1, $2 con ?
  let newSql = sql;
  for (let i = params.length; i >= 1; i--) {
    newSql = newSql.replace(new RegExp('\\$' + i, 'g'), '?');
  }
  return { sql: newSql, params };
}

// Ejecutar query
async function query(sql, params = []) {
  const { sql: convertedSql, params: convertedParams } = convertParams(sql, params);

  if (isPostgres()) {
    if (!pool) {
      throw new Error('PostgreSQL pool no inicializado. Verifica DATABASE_URL.');
    }
    const result = await pool.query(convertedSql, convertedParams);
    return { rows: result.rows };
  } else {
    // SQLite - lazy init
    initSQLite();
    return new Promise((resolve, reject) => {
      db.all(convertedSql, convertedParams, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows });
      });
    });
  }
}

// Ejecutar comando (INSERT, UPDATE, DELETE)
async function run(sql, params = []) {
  const { sql: convertedSql, params: convertedParams } = convertParams(sql, params);

  if (isPostgres()) {
    if (!pool) {
      throw new Error('PostgreSQL pool no inicializado. Verifica DATABASE_URL.');
    }
    const result = await pool.query(convertedSql, convertedParams);
    return {
      lastID: result.rows[0]?.id || null,
      changes: result.rowCount
    };
  } else {
    // SQLite - lazy init
    initSQLite();
    return new Promise((resolve, reject) => {
      db.run(convertedSql, convertedParams, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
}

// Inicializar tablas para PostgreSQL
async function initPostgres() {
  if (!isPostgres()) return;

  if (!pool) {
    console.error('[DB] ERROR: pool no está definido');
    throw new Error('PostgreSQL pool no inicializado');
  }

  const client = await pool.connect();
  try {
    // Crear tablas en PostgreSQL
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

    await client.query(`
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
      )
    `);

    await client.query(`
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
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ordenes_timeline (
        id SERIAL PRIMARY KEY,
        orden_id INTEGER REFERENCES ordenes(id),
        evento TEXT,
        descripcion TEXT,
        usuario_id INTEGER REFERENCES usuarios(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
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
      )
    `);

    await client.query(`
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
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insertar usuario admin si no existe
    const result = await client.query('SELECT * FROM usuarios WHERE email = $1', ['admin@igsm.com']);
    if (result.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('admin123', 12);
      await client.query(`
        INSERT INTO usuarios (nombre, email, password_hash, rol, iniciales, color, activo)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['Administrador', 'admin@igsm.com', hash, 'admin', 'AD', '#ff3d5a', true]);
      console.log('[DB] Usuario admin creado en PostgreSQL');
    }

    console.log('[DB] PostgreSQL tablas listas');
  } catch (err) {
    console.error('[DB] Error PostgreSQL:', err.message);
  } finally {
    client.release();
  }
}

// Transaccion
async function transaction(callback) {
  if (isPostgres()) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback({ query: (sql, params) => client.query(sql, params).then(r => ({ rows: r.rows })), run: (sql, params) => client.query(sql, params).then(r => ({ lastID: r.rows[0]?.id, changes: r.rowCount })) });
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    // SQLite
    await run('BEGIN TRANSACTION');
    try {
      const result = await callback({ query, run });
      await run('COMMIT');
      return result;
    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }
  }
}

// Inicializar tablas (solo para SQLite local)
async function initDatabase() {
  const pg = isPostgres();
  console.log('[DB] initDatabase called, isPostgres:', pg);
  console.log('[DB] DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

  if (pg) {
    console.log('[DB] Usando PostgreSQL, llamando initPostgres...');
    // PostgreSQL: Crear tablas si no existen
    await initPostgres();
    return;
  }

  console.log('[DB] Usando SQLite, inicializando...');
  // SQLite - lazy init
  initSQLite();

  // SQLite: Crear tablas si no existen
  await run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rol TEXT DEFAULT 'tecnico',
      iniciales TEXT,
      color TEXT DEFAULT '#00d4ff',
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT,
      telefono TEXT,
      nif TEXT,
      direccion TEXT,
      tipo TEXT DEFAULT 'particular',
      notas TEXT,
      etiquetas TEXT,
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ordenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT UNIQUE NOT NULL,
      cliente_id INTEGER,
      dispositivo TEXT NOT NULL,
      marca TEXT,
      modelo TEXT,
      imei TEXT,
      problema TEXT,
      estado TEXT DEFAULT 'pendiente',
      prioridad TEXT DEFAULT 'normal',
      tecnico_id INTEGER,
      precio_estimado REAL,
      precio_final REAL,
      notas_internas TEXT,
      activa INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ordenes_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orden_id INTEGER,
      evento TEXT,
      descripcion TEXT,
      usuario_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      sku TEXT UNIQUE,
      categoria TEXT,
      precio_venta REAL DEFAULT 0,
      precio_coste REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      activo INTEGER DEFAULT 1,
      updated_at DATETIME
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT UNIQUE NOT NULL,
      tipo TEXT NOT NULL,
      cliente_id INTEGER,
      fecha DATE DEFAULT CURRENT_DATE,
      estado TEXT DEFAULT 'borrador',
      base REAL DEFAULT 0,
      iva REAL DEFAULT 0,
      total REAL DEFAULT 0,
      updated_at DATETIME
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insertar usuario admin si no existe
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('admin123', 12);
  const existing = await query('SELECT * FROM usuarios WHERE email = $1', ['admin@igsm.com']);
  if (existing.rows.length === 0) {
    await run(`
      INSERT INTO usuarios (nombre, email, password_hash, rol, iniciales, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['Administrador', 'admin@igsm.com', hash, 'admin', 'AD', '#ff3d5a']);
    console.log('[DB] Usuario admin creado');
  }

  console.log('[DB] Base de datos SQLite lista');
}

// NO ejecutar initDatabase aquí - dejar que lo haga el servidor
// initDatabase().catch(err => console.error('[DB] Error:', err.message));

module.exports = { query, run, transaction, initDatabase, now, date, isPostgres, pool };
