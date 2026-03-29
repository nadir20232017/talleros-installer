// Simplified auth for SQLite
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { query, run, isPostgres } = require('../utils/database');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    // Buscar usuario
    const result = await query('SELECT * FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario = result.rows[0];

    // Verificar password
    const passwordOk = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Crear JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        ini: usuario.iniciales
      },
      process.env.JWT_SECRET || 'secreto',
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        ini: usuario.iniciales,
        color: usuario.color
      }
    });

  } catch (err) {
    console.error('[AUTH ERROR login]', err.message);
    console.error('[AUTH ERROR stack]', err.stack);
    res.status(500).json({ error: 'Error interno: ' + err.message });
  }
});

// GET /api/auth/usuarios-publicos
router.get('/usuarios-publicos', async (req, res) => {
  try {
    console.log('[AUTH] Fetching usuarios-publicos, isPostgres:', isPostgres);
    const result = await query('SELECT id, nombre, email, rol, iniciales, color FROM usuarios WHERE activo = ' + (isPostgres() ? 'true' : '1'));
    console.log('[AUTH] usuarios-publicos result:', result);
    res.json(result.rows || []);
  } catch (err) {
    console.error('[AUTH ERROR usuarios-publicos]', err.message);
    console.error('[AUTH ERROR stack]', err.stack);
    res.status(500).json({ error: 'Error interno: ' + err.message });
  }
});

module.exports = router;
