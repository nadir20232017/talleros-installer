// ═══════════════════════════════════════════════════════
//  Handler para rutas no encontradas
// ═══════════════════════════════════════════════════════

function notFound(req, res) {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
}

module.exports = { notFound };
