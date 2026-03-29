// ═══════════════════════════════════════════════════════
//  Helpers para respuestas JSON consistentes
// ═══════════════════════════════════════════════════════

function success(res, data, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    ...data
  });
}

function error(res, message, statusCode = 500, code = null) {
  const response = {
    success: false,
    error: message
  };
  if (code) response.code = code;
  if (process.env.NODE_ENV === 'development') {
    response.stack = new Error().stack;
  }
  res.status(statusCode).json(response);
}

function paginated(res, data) {
  res.json({
    success: true,
    ...data
  });
}

module.exports = { success, error, paginated };
