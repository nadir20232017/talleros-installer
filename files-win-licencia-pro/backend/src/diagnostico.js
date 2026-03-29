// Script de diagnóstico para PostgreSQL en Render
// Añade esto temporalmente a src/index.js para verificar el estado de la BD

const express = require('express');
const { pool, isPostgres } = require('./utils/database');

async function diagnosticarDB() {
  if (!isPostgres) {
    console.log('[DIAG] No es PostgreSQL, saltando diagnóstico');
    return;
  }

  const client = await pool.connect();
  try {
    console.log('[DIAG] === DIAGNÓSTICO DE BASE DE DATOS ===');

    // Verificar si existe la tabla usuarios
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    console.log('[DIAG] Tablas existentes:', tablesResult.rows.map(r => r.table_name));

    // Verificar usuarios
    try {
      const usersResult = await client.query('SELECT COUNT(*) as total FROM usuarios');
      console.log('[DIAG] Total usuarios:', usersResult.rows[0].total);

      const adminResult = await client.query('SELECT id, email, rol, activo FROM usuarios WHERE email = $1', ['admin@igsm.com']);
      if (adminResult.rows.length > 0) {
        console.log('[DIAG] Usuario admin encontrado:', adminResult.rows[0]);
      } else {
        console.log('[DIAG] ⚠️ Usuario admin NO EXISTE');
      }
    } catch (e) {
      console.log('[DIAG] ⚠️ Error consultando usuarios:', e.message);
    }

    console.log('[DIAG] === FIN DIAGNÓSTICO ===');
  } catch (err) {
    console.error('[DIAG] Error:', err.message);
  } finally {
    client.release();
  }
}

module.exports = { diagnosticarDB };
