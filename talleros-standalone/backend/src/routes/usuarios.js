// ── Rutas de Usuarios ────────────────────────────────
const express  = require('express');
const bcrypt   = require('bcryptjs');
const router   = express.Router();
const db       = require('../db/conexion');
const { autenticar, soloAdmin } = require('../middleware/auth');

router.use(autenticar);

router.get('/', soloAdmin, async function(req, res) {
  try {
    const result = await db.query(
      'SELECT id, nombre, email, rol, iniciales, color, activo, ultimo_acceso, created_at FROM usuarios ORDER BY nombre'
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', soloAdmin, async function(req, res) {
  try {
    const { nombre, email, password, rol, iniciales, color } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ error: 'Nombre, email y contraseña requeridos' });
    const hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol, iniciales, color) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, nombre, email, rol, iniciales, color',
      [nombre, email, hash, rol || 'tecnico', iniciales, color || '#4a9eff']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email ya en uso' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', soloAdmin, async function(req, res) {
  try {
    const { nombre, email, rol, iniciales, color, activo } = req.body;
    const result = await db.query(
      "UPDATE usuarios SET nombre=$1, email=$2, rol=$3, iniciales=$4, color=$5, activo=$6, updated_at=datetime('now') WHERE id=$7 RETURNING id, nombre, email, rol, iniciales, color, activo",
      [nombre, email, rol, iniciales, color, activo, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/reset-password', soloAdmin, async function(req, res) {
  try {
    const { nueva_password } = req.body;
    if (!nueva_password || nueva_password.length < 6) return res.status(400).json({ error: 'Min 6 caracteres' });
    const hash = await bcrypt.hash(nueva_password, 12);
    await db.query('UPDATE usuarios SET password_hash=$1 WHERE id=$2', [hash, req.params.id]);
    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', soloAdmin, async function(req, res) {
  try {
    const result = await db.query('DELETE FROM usuarios WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario eliminado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
