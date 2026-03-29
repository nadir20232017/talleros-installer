// ── Rutas de Inventario ──────────────────────────────
const express = require('express');
const router  = express.Router();
const db      = require('../db/conexion');
const { autenticar } = require('../middleware/auth');

router.use(autenticar);

router.get('/', async function(req, res) {
  try {
    const { q, categoria, stock_bajo } = req.query;
    let where = 'WHERE activo = true';
    const params = [];
    if (q) { params.push('%' + q + '%'); where += ' AND (nombre LIKE $' + params.length + ' OR sku LIKE $' + params.length + ')'; }
    if (categoria) { params.push(categoria); where += ' AND categoria = $' + params.length; }
    if (stock_bajo === 'true') where += ' AND stock <= stock_minimo';
    const result = await db.query('SELECT * FROM inventario ' + where + ' ORDER BY nombre', params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async function(req, res) {
  try {
    const { nombre, sku, categoria, precio_venta, precio_coste, stock, stock_minimo, proveedor } = req.body;
    const result = await db.query(
      'INSERT INTO inventario (nombre, sku, categoria, precio_venta, precio_coste, stock, stock_minimo, proveedor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [nombre, sku, categoria, precio_venta, precio_coste, stock || 0, stock_minimo || 0, proveedor]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/stock', async function(req, res) {
  try {
    const { cantidad, tipo, notas } = req.body;
    const cant = parseFloat(cantidad);
    const op = tipo === 'entrada' ? '+' : '-';
    const result = await db.query(
      "UPDATE inventario SET stock = stock " + op + " $1, updated_at = datetime('now') WHERE id = $2 RETURNING *",
      [Math.abs(cant), req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Articulo no encontrado' });
    await db.query(
      'INSERT INTO movimientos_stock (articulo_id, tipo, cantidad, notas, usuario_id) VALUES ($1,$2,$3,$4,$5)',
      [req.params.id, tipo, cant, notas, req.usuario.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
