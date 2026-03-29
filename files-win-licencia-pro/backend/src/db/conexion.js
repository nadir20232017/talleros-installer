// Compatibilidad con código existente - redirige al nuevo utils/database
const { query, run, transaction } = require('../utils/database');

// Mock pool para compatibilidad
const pool = {
  query: query,
  connect: async () => {
    return {
      query: query,
      release: () => {}
    };
  }
};

module.exports = { pool, query, run, transaction };
