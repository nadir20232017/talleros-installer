// ── Rutas de Clientes ────────────────────────────────
const express = require('express');
const router  = express.Router();
const db      = require('../db/conexion');
const { autenticar } = require('../middleware/auth');
const { isPostgres } = require('../utils/database');

router.use(autenticar);

// GET /api/clientes — listar con filtros y paginacion
router.get('/', async function(req, res) {
  try {
    const { q, etiqueta, pagina = 1, limite = 50 } = req.query;
    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    const params = [];
    let where = 'WHERE c.activo = ' + (isPostgres() ? 'true' : '1');

    if (q) {
      params.push('%' + q + '%');
      where += ' AND (c.nombre LIKE $' + params.length +
               ' OR c.email LIKE $' + params.length +
               ' OR c.telefono LIKE $' + params.length +
               ' OR c.nif LIKE $' + params.length + ')';
    }
    if (etiqueta) {
      params.push('%' + etiqueta + '%');
      where += ' AND c.etiquetas LIKE $' + params.length;
    }

    params.push(parseInt(limite));
    params.push(offset);

    const sql = `
      SELECT c.*,
        COUNT(DISTINCT o.id) AS total_ordenes,
        COUNT(DISTINCT CASE WHEN o.estado NOT IN ('entregado','cancelado') THEN o.id END) AS ordenes_activas,
        COALESCE(SUM(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END), 0) AS total_facturado
      FROM clientes c
      LEFT JOIN ordenes o ON o.cliente_id = c.id
      LEFT JOIN facturas f ON f.cliente_id = c.id
      ${where}
      GROUP BY c.id
      ORDER BY c.nombre ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const total = await db.query(
      'SELECT COUNT(*) FROM clientes c ' + where,
      params.slice(0, params.length - 2)
    );
    const result = await db.query(sql, params);

    res.json({
      datos: result.rows,
      total: parseInt(total.rows[0].count),
      pagina: parseInt(pagina),
      limite: parseInt(limite)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clientes/:id
router.get('/:id', async function(req, res) {
  try {
    const result = await db.query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clientes
router.post('/', async function(req, res) {
  try {
    const { nombre, email, telefono, nif, direccion, tipo, notas, etiquetas } = req.body;
    console.log('[CLIENTE] tipo recibido:', JSON.stringify(tipo));
    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

    // Normalizar tipo: 'persona' -> 'particular'
    var tipoNorm = tipo === 'empresa' ? 'empresa' : 'particular';
    const result = await db.query(`
      INSERT INTO clientes (nombre, email, telefono, nif, direccion, tipo, notas, etiquetas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `, [nombre, email, telefono, nif, direccion, tipoNorm, notas, etiquetas || []]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[CLIENTE ERROR]', err.message);
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un cliente con ese email o NIF' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clientes/:id
router.put('/:id', async function(req, res) {
  try {
    const { nombre, email, telefono, nif, direccion, tipo, notas, etiquetas } = req.body;
    const timeFn = isPostgres() ? 'NOW()' : "datetime('now')";
    const result = await db.query(`
      UPDATE clientes
      SET nombre=$1, email=$2, telefono=$3, nif=$4, direccion=$5, tipo=$6, notas=$7, etiquetas=$8, updated_at=${timeFn}
      WHERE id=$9 RETURNING *
    `, [nombre, email, telefono, nif, direccion, tipo, notas, etiquetas || [], req.params.id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clientes/:id (baja logica)
router.delete('/:id', async function(req, res) {
  try {
    await db.query('UPDATE clientes SET activo = ' + (isPostgres() ? 'false' : '0') + ' WHERE id = $1', [req.params.id]);
    res.json({ mensaje: 'Cliente eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clientes/:id/historial
router.get('/:id/historial', async function(req, res) {
  try {
    const ordenes = await db.query(
      'SELECT * FROM ordenes WHERE cliente_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.params.id]
    );
    const facturas = await db.query(
      'SELECT * FROM facturas WHERE cliente_id = $1 ORDER BY fecha DESC LIMIT 20',
      [req.params.id]
    );
    res.json({ ordenes: ordenes.rows, facturas: facturas.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
