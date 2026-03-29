// ── Rutas de Ordenes de Reparacion ───────────────────
const express = require('express');
const router  = express.Router();
const db      = require('../db/conexion');
const { autenticar, adminOTecnico } = require('../middleware/auth');
const { isPostgres } = require('../utils/database');

// GET /api/ordenes/consulta/:numero — consulta pública para clientes (sin auth)
// NOTA: Esta ruta ahora está definida en src/index.js para evitar el middleware de autenticación

// Middleware de autenticación para rutas protegidas
router.use(autenticar);

// GET /api/ordenes — listar con filtros
router.get('/', async function(req, res) {
  try {
    const { estado, tecnico_id, q, pagina = 1, limite = 50, fecha_desde, fecha_hasta } = req.query;
    const params = [];
    let where = 'WHERE o.activa = ' + (isPostgres() ? 'true' : '1');

    if (estado)      { params.push(estado);         where += ' AND o.estado = $' + params.length; }
    if (tecnico_id)  { params.push(tecnico_id);      where += ' AND o.tecnico_id = $' + params.length; }
    if (fecha_desde) { params.push(fecha_desde);     where += ' AND o.created_at >= $' + params.length; }
    if (fecha_hasta) { params.push(fecha_hasta);     where += ' AND o.created_at <= $' + params.length; }
    if (q) {
      params.push('%' + q + '%');
      where += ' AND (o.numero LIKE $' + params.length +
               ' OR c.nombre LIKE $' + params.length +
               ' OR o.dispositivo LIKE $' + params.length + ')';
    }

    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    params.push(parseInt(limite));
    params.push(offset);

    const sql = `
      SELECT o.*,
        c.nombre  AS cliente_nombre,
        c.telefono AS cliente_tel,
        u.nombre  AS tecnico_nombre,
        u.iniciales AS tecnico_ini,
        u.color   AS tecnico_color
      FROM ordenes o
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN usuarios u ON u.id = o.tecnico_id
      ${where}
      ORDER BY
        CASE o.estado
          WHEN 'pendiente'  THEN 1
          WHEN 'proceso'    THEN 2
          WHEN 'terminado'  THEN 3
          WHEN 'entregado'  THEN 4
          ELSE 5
        END,
        o.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const [result, total] = await Promise.all([
      db.query(sql, params),
      db.query('SELECT COUNT(*) FROM ordenes o LEFT JOIN clientes c ON c.id = o.cliente_id ' + where,
               params.slice(0, params.length - 2))
    ]);

    res.json({
      datos: result.rows,
      total: parseInt(total.rows[0].count),
      pagina: parseInt(pagina),
      limite: parseInt(limite)
    });
  } catch (err) {
    console.error('[DEBUG] Error en POST /api/ordenes:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ordenes/:id
router.get('/:id', async function(req, res) {
  try {
    const result = await db.query(`
      SELECT o.*,
        c.nombre AS cliente_nombre, c.telefono AS cliente_tel, c.email AS cliente_email,
        u.nombre AS tecnico_nombre, u.iniciales AS tecnico_ini, u.color AS tecnico_color,
        (SELECT json_agg(json_build_object('id', t.id, 'evento', t.evento, 'descripcion', t.descripcion, 'created_at', t.created_at)) FROM ordenes_timeline t WHERE t.orden_id = o.id) AS timeline
      FROM ordenes o
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN usuarios u ON u.id = o.tecnico_id
      LEFT JOIN ordenes_timeline t ON t.orden_id = o.id
      WHERE o.id = $1
      GROUP BY o.id, c.nombre, c.telefono, c.email, u.nombre, u.iniciales, u.color
    `, [req.params.id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ordenes
router.post('/', async function(req, res) {
  try {
    console.log('[DEBUG] Body recibido:', JSON.stringify(req.body, null, 2));
    const {
      cliente_id, dispositivo, marca, modelo, imei, problema,
      tecnico_id, prioridad, precio_estimado, notas_internas
    } = req.body;

    if (!cliente_id || !dispositivo) {
      return res.status(400).json({ error: 'Cliente y dispositivo son requeridos' });
    }

    const result = await db.transaction(async function(client) {
      // Generar numero correlativo simple: ORD-0001, ORD-0002, etc.
      const numResult = await client.query(
        "SELECT COUNT(*) as total FROM ordenes WHERE numero LIKE 'ORD-%'"
      );
      const nextNum = parseInt(numResult.rows[0].total) + 1;
      const numero = 'ORD-' + String(nextNum).padStart(4, '0');

      const orden = await client.query(`
        INSERT INTO ordenes
          (numero, cliente_id, dispositivo, marca, modelo, imei, problema,
           tecnico_id, prioridad, precio_estimado, notas_internas, estado)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pendiente')
        RETURNING *
      `, [numero, cliente_id, dispositivo, marca, modelo, imei, problema,
          tecnico_id, prioridad || 'normal', precio_estimado, notas_internas]);

      // Registrar en timeline
      await client.query(
        'INSERT INTO ordenes_timeline (orden_id, evento, descripcion, usuario_id) VALUES ($1,$2,$3,$4)',
        [orden.rows[0].id, 'creada', 'Orden de reparacion creada', req.usuario.id]
      );

      return orden.rows[0];
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('[DEBUG] Error completo:', err);
    console.error('[DEBUG] Error message:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ordenes/:id
router.put('/:id', async function(req, res) {
  try {
    const { dispositivo, marca, modelo, imei, problema, tecnico_id,
            prioridad, precio_estimado, precio_final, notas_internas } = req.body;

    const timeFn = isPostgres() ? 'NOW()' : "datetime('now')";
    const result = await db.query(`
      UPDATE ordenes SET
        dispositivo=$1, marca=$2, modelo=$3, imei=$4, problema=$5,
        tecnico_id=$6, prioridad=$7, precio_estimado=$8, precio_final=$9,
        notas_internas=$10, updated_at=${timeFn}
      WHERE id=$11 RETURNING *
    `, [dispositivo, marca, modelo, imei, problema, tecnico_id,
        prioridad, precio_estimado, precio_final, notas_internas, req.params.id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/ordenes/:id/estado — cambiar estado
router.patch('/:id/estado', async function(req, res) {
  try {
    const { estado, notas } = req.body;
    const estados = ['pendiente', 'proceso', 'espera_piezas', 'terminado', 'entregado', 'cancelado'];
    if (!estados.includes(estado)) {
      return res.status(400).json({ error: 'Estado no valido: ' + estado });
    }

    // Obtener orden actual para saber el estado anterior
    const ordenActual = await db.query('SELECT * FROM ordenes WHERE id = $1', [req.params.id]);
    if (!ordenActual.rows.length) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    const estadoAnterior = ordenActual.rows[0].estado;

    const extra = {};
    if (estado === 'entregado') extra.fecha_entrega = new Date();
    if (estado === 'proceso')   extra.fecha_inicio   = new Date();

    const timeFn2 = isPostgres() ? 'NOW()' : "datetime('now')";
    const result = await db.query(`
      UPDATE ordenes SET estado=$1, updated_at=${timeFn2} WHERE id=$2 RETURNING *
    `, [estado, req.params.id]);

    const orden = result.rows[0];

    // Registrar en timeline
    await db.query(
      'INSERT INTO ordenes_timeline (orden_id, evento, descripcion, usuario_id) VALUES ($1,$2,$3,$4)',
      [req.params.id, 'cambio_estado', 'Estado cambiado a: ' + estado + (notas ? ' — ' + notas : ''), req.usuario.id]
    );

    // Enviar notificación al cliente (si cambió el estado y no es el estado inicial)
    if (estado !== estadoAnterior && process.env.NOTIFICACIONES_ACTIVAS === 'true') {
      const { notificarCambioEstado } = require('../services/notificaciones');

      // Obtener info del cliente
      const clienteInfo = await db.query(
        'SELECT telefono FROM clientes WHERE id = $1',
        [orden.cliente_id]
      );
      orden.cliente_tel = clienteInfo.rows[0]?.telefono;

      // URL base para el portal de consulta
      const urlBase = process.env.FRONTEND_URL || `https://${req.headers.host}`;

      // Enviar notificación (no esperamos respuesta para no bloquear)
      notificarCambioEstado(orden, estadoAnterior, urlBase)
        .then(() => console.log('[ORDEN] Notificación enviada'))
        .catch(err => console.error('[ORDEN] Error notificación:', err.message));
    }

    res.json(orden);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ordenes/:id (baja logica)
router.delete('/:id', adminOTecnico, async function(req, res) {
  try {
    await db.query('UPDATE ordenes SET activa = ' + (isPostgres() ? 'false' : '0') + ' WHERE id = $1', [req.params.id]);
    res.json({ mensaje: 'Orden eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
