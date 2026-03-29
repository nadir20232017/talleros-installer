// ═══════════════════════════════════════════════════════
//  Manejo centralizado de errores
// ═══════════════════════════════════════════════════════

function errorHandler(err, req, res, next) {
  // Asegurar CORS en respuestas de error
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  console.error('[ERROR HANDLER]', err.message, '| Status:', err.status || 500);
  console.error('[ERROR STACK]', err.stack);

  // Error de CORS
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ error: err.message });
  }

  // Errores de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token invalido' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expirado, inicia sesion de nuevo' });
  }

  // Error de PostgreSQL - duplicado
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Ya existe un registro con ese valor' });
  }

  // Error de PostgreSQL - foreign key
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Registro referenciado no existe' });
  }

  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = { errorHandler };
