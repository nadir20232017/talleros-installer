// ── Rutas de Configuracion del taller ────────────────
const express = require('express');
const router  = express.Router();
const db      = require('../db/conexion');
const { autenticar, soloAdmin } = require('../middleware/auth');
const { isPostgres, now } = require('../utils/database');

// GET /api/configuracion/publica — sin autenticacion (para el frontend)
// NOTA: Esta ruta debe ir ANTES del middleware de autenticacion
router.get('/publica', async function(req, res) {
  try {
    const claves = ['taller_nombre','taller_telefono','taller_email','taller_direccion','taller_ciudad','taller_web','taller_horario_lunes_viernes','taller_horario_sabados','taller_lat','taller_lng'];
    const result = await db.query('SELECT clave, valor FROM configuracion WHERE clave IN (' + claves.map((_,i) => '$'+(i+1)).join(',') + ')', claves);
    var config = {};
    result.rows.forEach(function(r) { config[r.clave] = r.valor; });
    res.json(config);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Middleware de autenticacion para rutas protegidas
router.use(autenticar);

// GET /api/configuracion — obtener toda la configuracion
router.get('/', async function(req, res) {
  try {
    const result = await db.query('SELECT clave, valor FROM configuracion ORDER BY clave');
    // Convertir array a objeto {clave: valor}
    var config = {};
    result.rows.forEach(function(r) { config[r.clave] = r.valor; });
    res.json(config);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/configuracion — guardar configuracion (solo admin)
router.put('/', soloAdmin, async function(req, res) {
  try {
    var datos = req.body;
    for (var clave in datos) {
      const sql = isPostgres()
        ? "INSERT INTO configuracion (clave, valor, updated_at) VALUES ($1,$2,NOW()) ON CONFLICT (clave) DO UPDATE SET valor=$2, updated_at=NOW()"
        : "INSERT OR REPLACE INTO configuracion (clave, valor, updated_at) VALUES ($1,$2,datetime('now'))";
      await db.query(sql, [clave, datos[clave]]);
    }
    res.json({ mensaje: 'Configuracion guardada correctamente' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
