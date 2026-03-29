// Script para crear usuario admin por defecto si no existe ninguno
const bcrypt = require('bcryptjs');
const { query } = require('../src/utils/database');

async function initAdmin() {
  try {
    // Verificar si existe algun usuario
    const result = await query('SELECT COUNT(*) as count FROM usuarios');
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
      console.log('[INIT] No hay usuarios. Creando admin por defecto...');

      const hash = await bcrypt.hash('admin123', 12);
      await query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol, iniciales, color, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Administrador', 'admin@igsm.com', hash, 'admin', 'AD', '#ff3d5a', true]
      );

      console.log('[INIT] Usuario admin creado:');
      console.log('  Email: admin@igsm.com');
      console.log('  Password: admin123');
      console.log('  Rol: admin');
    } else {
      console.log(`[INIT] Ya existen ${count} usuarios en la base de datos`);

      // Mostrar usuarios existentes
      const users = await query('SELECT id, nombre, email, rol FROM usuarios WHERE activo = 1');
      console.log('[INIT] Usuarios activos:');
      users.rows.forEach(u => {
        console.log(`  - ${u.nombre} (${u.email}) [${u.rol}]`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('[INIT ERROR]', err);
    process.exit(1);
  }
}

initAdmin();
