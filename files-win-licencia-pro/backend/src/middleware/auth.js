// ═══════════════════════════════════════════════════════
//  Middleware de autenticacion JWT
// ═══════════════════════════════════════════════════════
const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  // Asegurar CORS en respuestas de auth
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
    if (err) {
      console.error('[AUTH ERROR]', err.name, '-', err.message);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado, inicia sesion de nuevo' });
      }
      return res.status(403).json({ error: 'Token invalido: ' + err.message });
    }
    req.usuario = usuario;
    next();
  });
}

function soloAdmin(req, res, next) {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administradores' });
  }
  next();
}

function adminOTecnico(req, res, next) {
  if (!['admin', 'tecnico'].includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Acceso no autorizado para este rol' });
  }
  next();
}

module.exports = { autenticar, soloAdmin, adminOTecnico };
