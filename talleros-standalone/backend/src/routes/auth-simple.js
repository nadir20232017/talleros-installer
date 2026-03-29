// Simplified auth for SQLite
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { query, run } = require('../utils/database');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    // Buscar usuario
    const result = await query('SELECT * FROM usuarios WHERE email = ?', [email.toLowerCase().trim()]);

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
    console.error('[AUTH ERROR]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/usuarios-publicos
router.get('/usuarios-publicos', async (req, res) => {
  try {
    const result = await query('SELECT id, nombre, email, rol, iniciales, color FROM usuarios WHERE activo = 1');
    res.json(result.rows || []);
  } catch (err) {
    console.error('[AUTH ERROR]', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
