/**
 * Generador de Licencias TallerOS v2.0
 * Uso: node generar-licencia.js
 */

const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const SECRET_KEY = 'TallerOS_Secret_2024_License_Key_v2';

// Tipos de licencia
const TIERS = {
  base: { equipos: 3, nombre: 'Base', precio: '99 EUR' },
  pro: { equipos: 5, nombre: 'Pro', precio: '149 EUR' },
  premium: { equipos: -1, nombre: 'Premium', precio: '299 EUR' }
};

function generarChecksum(tallerId, tipo) {
  const data = `${tallerId}-${tipo}-${SECRET_KEY}`;
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();
}

function generarLicencia(nombreTaller, tipo) {
  // Normalizar nombre del taller (quitar espacios, caracteres especiales)
  const tallerId = nombreTaller
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 12);

  const tipoUpper = tipo.toUpperCase();
  const checksum = generarChecksum(tallerId, tipoUpper);

  return `TALLER-${tallerId}-${tipoUpper}-${checksum}`;
}

function validarLicencia(codigo) {
  const partes = codigo.trim().toUpperCase().split('-');

  if (partes.length !== 4 || partes[0] !== 'TALLER') {
    return { valida: false, error: 'Formato inválido' };
  }

  const [, tallerId, tipo, checksum] = partes;

  if (!TIERS[tipo.toLowerCase()]) {
    return { valida: false, error: 'Tipo de licencia inválido' };
  }

  const checksumEsperado = generarChecksum(tallerId, tipo);

  if (checksum !== checksumEsperado) {
    return { valida: false, error: 'Checksum inválido' };
  }

  return {
    valida: true,
    tallerId,
    tipo: tipo.toLowerCase(),
    equipos: TIERS[tipo.toLowerCase()].equipos,
    nombre: TIERS[tipo.toLowerCase()].nombre
  };
}

function mostrarMenu() {
  console.log('\n========================================');
  console.log('   GENERADOR DE LICENCIAS TALLEROS');
  console.log('========================================\n');

  console.log('Tipos de licencia disponibles:\n');

  Object.entries(TIERS).forEach(([key, info]) => {
    const equiposTexto = info.equipos === -1 ? 'Ilimitados' : info.equipos;
    console.log(`  ${key.toUpperCase().padEnd(8)} - ${info.nombre.padEnd(8)} | ${equiposTexto.toString().padStart(3)} equipos | ${info.precio}`);
  });

  console.log('\n----------------------------------------\n');
}

function preguntarDatos() {
  rl.question('Nombre del Taller/Cliente: ', (nombre) => {
    if (!nombre.trim()) {
      console.log('\n[ERROR] El nombre es obligatorio\n');
      preguntarDatos();
      return;
    }

    rl.question('Tipo de licencia (base/pro/premium): ', (tipo) => {
      const tipoLower = tipo.toLowerCase().trim();

      if (!TIERS[tipoLower]) {
        console.log('\n[ERROR] Tipo inválido. Use: base, pro o premium\n');
        preguntarDatos();
        return;
      }

      const licencia = generarLicencia(nombre, tipoLower);
      const info = validarLicencia(licencia);

      console.log('\n========================================');
      console.log('   LICENCIA GENERADA');
      console.log('========================================\n');
      console.log(`Codigo: ${licencia}`);
      console.log(`Cliente: ${nombre}`);
      console.log(`Tipo: ${info.nombre} (${TIERS[tipoLower].precio})`);
      console.log(`Equipos permitidos: ${info.equipos === -1 ? 'Ilimitados' : info.equipos}`);
      console.log(`\nValidacion: ${info.valida ? 'OK ✓' : 'ERROR ✗'}`);
      console.log('\n----------------------------------------');
      console.log('IMPORTANTE: Guarda este codigo. No se puede recuperar.');
      console.log('----------------------------------------\n');

      rl.question('Generar otra licencia? (s/n): ', (respuesta) => {
        if (respuesta.toLowerCase() === 's') {
          mostrarMenu();
          preguntarDatos();
        } else {
          console.log('\nHasta luego!\n');
          rl.close();
        }
      });
    });
  });
}

// Menu de opciones adicionales
function menuPrincipal() {
  console.log('\n========================================');
  console.log('   GENERADOR DE LICENCIAS TALLEROS');
  console.log('========================================\n');
  console.log('1. Generar nueva licencia');
  console.log('2. Validar licencia existente');
  console.log('3. Salir\n');

  rl.question('Elige una opcion (1-3): ', (opcion) => {
    switch(opcion.trim()) {
      case '1':
        mostrarMenu();
        preguntarDatos();
        break;
      case '2':
        validarLicenciaExistente();
        break;
      case '3':
        console.log('\nHasta luego!\n');
        rl.close();
        break;
      default:
        console.log('\n[ERROR] Opcion invalida\n');
        menuPrincipal();
    }
  });
}

function validarLicenciaExistente() {
  rl.question('\nIntroduce el codigo de licencia: ', (codigo) => {
    const resultado = validarLicencia(codigo);

    console.log('\n========================================');
    console.log('   RESULTADO DE VALIDACION');
    console.log('========================================\n');

    if (resultado.valida) {
      console.log('Estado: VALIDA ✓');
      console.log(`Taller ID: ${resultado.tallerId}`);
      console.log(`Tipo: ${resultado.nombre}`);
      console.log(`Equipos: ${resultado.equipos === -1 ? 'Ilimitados' : resultado.equipos}`);
    } else {
      console.log('Estado: INVALIDA ✗');
      console.log(`Error: ${resultado.error}`);
    }

    console.log('\n----------------------------------------\n');

    rl.question('Volver al menu? (s/n): ', (respuesta) => {
      if (respuesta.toLowerCase() === 's') {
        menuPrincipal();
      } else {
        console.log('\nHasta luego!\n');
        rl.close();
      }
    });
  });
}

// Iniciar
menuPrincipal();
