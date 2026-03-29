// ── Rutas de Notificaciones ──────────────────────────
const express    = require('express');
const router     = express.Router();
const db         = require('../db/conexion');
const nodemailer = require('nodemailer');
const { autenticar } = require('../middleware/auth');

router.use(autenticar);

// Transporter email
function crearTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// GET /api/notificaciones/historial
router.get('/historial', async function(req, res) {
  try {
    const result = await db.query(
      'SELECT n.*, u.nombre AS enviado_por FROM notificaciones n LEFT JOIN usuarios u ON u.id = n.usuario_id ORDER BY n.created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/notificaciones/email
router.post('/email', async function(req, res) {
  try {
    const { destinatario, asunto, mensaje, cliente_id, tipo } = req.body;
    if (!destinatario || !asunto || !mensaje) {
      return res.status(400).json({ error: 'Destinatario, asunto y mensaje requeridos' });
    }

    const transporter = crearTransporter();
    await transporter.sendMail({
      from:    process.env.SMTP_FROM || 'TallerOS',
      to:      destinatario,
      subject: asunto,
      text:    mensaje,
      html:    '<div style="font-family:sans-serif;max-width:600px">' +
               '<h2>' + asunto + '</h2>' +
               '<p>' + mensaje.replace(/\n/g, '<br>') + '</p>' +
               '<hr><p style="color:#888;font-size:12px">TallerOS</p>' +
               '</div>'
    });

    await db.query(
      'INSERT INTO notificaciones (tipo, canal, destinatario, mensaje, estado, cliente_id, usuario_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [tipo || 'manual', 'email', destinatario, asunto, 'enviada', cliente_id, req.usuario.id]
    );

    res.json({ mensaje: 'Email enviado a ' + destinatario });
  } catch (err) {
    res.status(500).json({ error: 'Error enviando email: ' + err.message });
  }
});

// POST /api/notificaciones/whatsapp
router.post('/whatsapp', async function(req, res) {
  try {
    const { telefono, mensaje, cliente_id, tipo } = req.body;
    if (!telefono || !mensaje) {
      return res.status(400).json({ error: 'Telefono y mensaje requeridos' });
    }

    await db.query(
      'INSERT INTO notificaciones (tipo, canal, destinatario, mensaje, estado, cliente_id, usuario_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [tipo || 'manual', 'whatsapp', telefono, mensaje.slice(0, 200), 'simulado', cliente_id, req.usuario.id]
    );

    res.json({ mensaje: 'WhatsApp simulado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
