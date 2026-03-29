// ── Rutas de Facturacion ─────────────────────────────
const express = require('express');
const router  = express.Router();
const db      = require('../db/conexion');
const { autenticar, soloAdmin } = require('../middleware/auth');

router.use(autenticar);

// GET /api/facturacion — listar documentos con filtros
router.get('/', async function(req, res) {
  try {
    const { tipo, serie, estado, cliente_id, anio, mes, trimestre, q, pagina = 1, limite = 50 } = req.query;
    const params = [];
    let where = 'WHERE f.activa = true';

    if (tipo)       { params.push(tipo);       where += ' AND f.tipo = $' + params.length; }
    if (serie)      { params.push(serie);      where += ' AND f.serie = $' + params.length; }
    if (estado)     { params.push(estado);     where += ' AND f.estado = $' + params.length; }
    if (cliente_id) { params.push(cliente_id); where += ' AND f.cliente_id = $' + params.length; }
    if (anio)       { params.push(anio);       where += " AND strftime('%Y', f.fecha) = $" + params.length; }
    if (mes)        { params.push(mes);        where += " AND CAST(strftime('%m', f.fecha) AS INTEGER) = $" + params.length; }
    if (trimestre)  { params.push(trimestre);  where += " AND CEIL(CAST(strftime('%m', f.fecha) AS INTEGER) / 3.0) = $" + params.length; }
    if (q) {
      params.push('%' + q + '%');
      where += ' AND (f.numero LIKE $' + params.length + ' OR c.nombre LIKE $' + params.length + ')';
    }

    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    params.push(parseInt(limite));
    params.push(offset);

    const sql = `
      SELECT f.*,
        c.nombre AS cliente_nombre,
        c.nif    AS cliente_nif,
        COALESCE((SELECT SUM(lc.importe) FROM lineas_cobro lc WHERE lc.factura_id = f.id), 0) AS total_cobrado
      FROM facturas f
      LEFT JOIN clientes c ON c.id = f.cliente_id
      ${where}
      ORDER BY f.fecha DESC, f.numero DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const [result, total] = await Promise.all([
      db.query(sql, params),
      db.query('SELECT COUNT(*) FROM facturas f LEFT JOIN clientes c ON c.id = f.cliente_id ' + where,
               params.slice(0, params.length - 2))
    ]);

    res.json({ datos: result.rows, total: parseInt(total.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/facturacion/resumen — KPIs por periodo
router.get('/resumen', async function(req, res) {
  try {
    const { anio, trimestre } = req.query;
    let where = "WHERE f.activa = true AND f.tipo IN ('factura_art','factura_ser')";
    const params = [];
    if (anio) { params.push(anio); where += " AND strftime('%Y', f.fecha) = $" + params.length; }
    if (trimestre) { params.push(trimestre); where += " AND CEIL(CAST(strftime('%m', f.fecha) AS INTEGER) / 3.0) = $" + params.length; }

    const result = await db.query(`
      SELECT
        SUM(CASE WHEN f.tipo='factura_ser' THEN 1 ELSE 0 END) AS facturas_servicios,
        SUM(CASE WHEN f.tipo='factura_art' THEN 1 ELSE 0 END) AS facturas_articulos,
        SUM(f.base)  AS total_base,
        SUM(f.iva)   AS total_iva,
        SUM(f.total) AS total_facturado,
        SUM(CASE WHEN f.estado='pagada' THEN f.total ELSE 0 END) AS total_cobrado,
        SUM(CASE WHEN f.estado IN ('enviada','vencida') THEN f.total ELSE 0 END) AS total_pendiente,
        SUM(CASE WHEN f.estado='vencida' THEN 1 ELSE 0 END) AS facturas_vencidas
      FROM facturas f ${where}
    `, params);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/facturacion/:id
router.get('/:id', async function(req, res) {
  try {
    const [factura, lineas, cobros] = await Promise.all([
      db.query('SELECT f.*, c.nombre AS cliente_nombre, c.nif AS cliente_nif FROM facturas f LEFT JOIN clientes c ON c.id = f.cliente_id WHERE f.id = $1', [req.params.id]),
      db.query('SELECT * FROM lineas_factura WHERE factura_id = $1 ORDER BY posicion', [req.params.id]),
      db.query('SELECT * FROM lineas_cobro WHERE factura_id = $1 ORDER BY fecha', [req.params.id])
    ]);

    if (!factura.rows.length) return res.status(404).json({ error: 'Documento no encontrado' });
    res.json({ ...factura.rows[0], lineas: lineas.rows, cobros: cobros.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/facturacion
router.post('/', async function(req, res) {
  try {
    const { tipo, serie, cliente_id, fecha, vence, orden_id, notas, lineas } = req.body;
    if (!tipo || !cliente_id) return res.status(400).json({ error: 'Tipo y cliente requeridos' });

    const result = await db.transaction(async function(client) {
      // Obtener siguiente numero de serie
      const serieResult = await client.query(
        'UPDATE series_facturacion SET siguiente = siguiente + 1 WHERE tipo = $1 RETURNING prefijo, ejercicio, siguiente - 1 AS num',
        [tipo]
      );
      if (!serieResult.rows.length) return res.status(400).json({ error: 'Serie no configurada: ' + tipo });
      const s = serieResult.rows[0];
      const numero = s.prefijo + '-' + s.ejercicio + '-' + String(s.num).padStart(4, '0');

      // Calcular totales
      let base = 0, iva_amt = 0;
      (lineas || []).forEach(function(l) {
        const precio = parseFloat(l.precio) || 0;
        const qty    = parseFloat(l.qty)    || 0;
        const ivaPct = parseFloat(l.iva)    || 21;
        const sub    = l.ivainc ? qty * precio / (1 + ivaPct / 100) : qty * precio;
        base    += sub;
        iva_amt += sub * (ivaPct / 100);
      });
      const total = base + iva_amt;

      const factura = await client.query(`
        INSERT INTO facturas (numero, tipo, serie, cliente_id, fecha, vence, orden_id, notas, base, iva, total, estado)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'borrador')
        RETURNING *
      `, [numero, tipo, serie || tipo, cliente_id, fecha || new Date(), vence, orden_id, notas,
          base.toFixed(2), iva_amt.toFixed(2), total.toFixed(2)]);

      // Insertar lineas
      for (let i = 0; i < (lineas || []).length; i++) {
        const l = lineas[i];
        await client.query(
          'INSERT INTO lineas_factura (factura_id, descripcion, qty, precio, iva, ivainc, posicion) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [factura.rows[0].id, l.descripcion || l.desc, l.qty, l.precio, l.iva || 21, l.ivainc || false, i + 1]
        );
      }

      return factura.rows[0];
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/facturacion/:id/estado
router.patch('/:id/estado', async function(req, res) {
  try {
    const { estado } = req.body;
    const result = await db.query(
      "UPDATE facturas SET estado=$1, updated_at=datetime('now') WHERE id=$2 RETURNING *",
      [estado, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/facturacion/:id/cobros — registrar cobro parcial
router.post('/:id/cobros', async function(req, res) {
  try {
    const { importe, metodo, notas } = req.body;
    const result = await db.query(
      'INSERT INTO lineas_cobro (factura_id, importe, metodo, notas, usuario_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, importe, metodo || 'efectivo', notas, req.usuario.id]
    );

    // Auto-actualizar estado si ya esta pagado
    const totales = await db.query(
      'SELECT f.total, COALESCE(SUM(lc.importe),0) AS cobrado FROM facturas f LEFT JOIN lineas_cobro lc ON lc.factura_id = f.id WHERE f.id = $1 GROUP BY f.total',
      [req.params.id]
    );
    if (totales.rows.length && parseFloat(totales.rows[0].cobrado) >= parseFloat(totales.rows[0].total)) {
      await db.query('UPDATE facturas SET estado=$1 WHERE id=$2', ['pagada', req.params.id]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/facturacion/:id
router.delete('/:id', soloAdmin, async function(req, res) {
  try {
    await db.query('UPDATE facturas SET activa = false WHERE id = $1', [req.params.id]);
    res.json({ mensaje: 'Documento eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
