// Script para resetear la contraseña del admin
const bcrypt = require('bcryptjs');
const { query } = require('../src/utils/database');

async function resetAdminPassword() {
  try {
    const newPassword = 'admin123';
    const hash = await bcrypt.hash(newPassword, 12);

    // Buscar usuario admin
    const result = await query(
      "UPDATE usuarios SET password_hash = $1 WHERE email = $2 OR rol = 'admin' RETURNING id, nombre, email",
      [hash, 'admin@talleros.local']
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('[RESET] Contraseña actualizada:');
      console.log(`  Usuario: ${user.nombre}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Nueva contraseña: ${newPassword}`);
    } else {
      console.log('[RESET] No se encontró usuario admin');
    }

    process.exit(0);
  } catch (err) {
    console.error('[RESET ERROR]', err);
    process.exit(1);
  }
}

resetAdminPassword();
