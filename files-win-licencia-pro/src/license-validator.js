/**
 * Validador de Licencias TallerOS v2.0
 * Para integrar en la app Electron local
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SECRET_KEY = 'TallerOS_Secret_2024_License_Key_v2';

const TIERS = {
  base: { equipos: 3, nombre: 'Base' },
  pro: { equipos: 5, nombre: 'Pro' },
  premium: { equipos: -1, nombre: 'Premium' }
};

class LicenseManager {
  constructor(appDataPath) {
    this.licenseFile = path.join(appDataPath, 'license.json');
    this.devicesFile = path.join(appDataPath, 'devices.json');
    this.deviceId = this.getDeviceId();
  }

  // Generar ID único del dispositivo
  getDeviceId() {
    const interfaces = os.networkInterfaces();
    const mac = Object.values(interfaces)
      .flat()
      .find(iface => !iface.internal && iface.mac)?.mac;

    return crypto
      .createHash('sha256')
      .update(mac || os.hostname())
      .digest('hex')
      .substring(0, 16);
  }

  // Validar formato de licencia
  validarFormato(codigo) {
    if (!codigo || typeof codigo !== 'string') {
      return { valida: false, error: 'Código requerido' };
    }

    const partes = codigo.trim().toUpperCase().split('-');
    if (partes.length !== 4 || partes[0] !== 'TALLER') {
      return { valida: false, error: 'Formato inválido' };
    }

    return { valida: true };
  }

  // Activar licencia
  activar(codigo) {
    const formato = this.validarFormato(codigo);
    if (!formato.valida) return formato;

    const partes = codigo.trim().toUpperCase().split('-');
    const [, tallerId, tipo] = partes;
    const tier = tipo.toLowerCase();

    if (!TIERS[tier]) {
      return { valida: false, error: 'Tipo de licencia inválido' };
    }

    // Verificar si ya está activada en otro dispositivo (solo si no es premium)
    if (tier !== 'premium') {
      const devices = this.getDevices();
      const equipoActual = devices[codigo];

      if (equipoActual && equipoActual.deviceId !== this.deviceId) {
        return {
          valida: false,
          error: 'Licencia ya activada en otro dispositivo'
        };
      }

      // Verificar límite de equipos
      const equiposActivos = Object.values(devices).filter(
        d => d.codigo === codigo && d.activa
      ).length;

      if (equiposActivos >= TIERS[tier].equipos) {
        return {
          valida: false,
          error: `Límite de ${TIERS[tier].equipos} equipos alcanzado`
        };
      }
    }

    // Guardar licencia
    const licencia = {
      codigo,
      tallerId,
      tipo: tier,
      equipos: TIERS[tier].equipos,
      equiposTexto: TIERS[tier].equipos === -1 ? 'Ilimitado' : TIERS[tier].equipos,
      deviceId: this.deviceId,
      activada: new Date().toISOString(),
      activa: true
    };

    fs.writeFileSync(this.licenseFile, JSON.stringify(licencia, null, 2));

    // Registrar dispositivo
    this.registerDevice(codigo);

    return { valida: true, licencia };
  }

  // Verificar licencia actual
  verificar() {
    try {
      if (!fs.existsSync(this.licenseFile)) {
        return { valida: false, error: 'No hay licencia activada' };
      }

      const licencia = JSON.parse(fs.readFileSync(this.licenseFile, 'utf8'));

      if (!licencia.activa) {
        return { valida: false, error: 'Licencia desactivada' };
      }

      // Verificar que sea este dispositivo
      if (licencia.deviceId && licencia.deviceId !== this.deviceId) {
        return { valida: false, error: 'Licencia no corresponde a este equipo' };
      }

      return { valida: true, licencia };
    } catch (error) {
      return { valida: false, error: 'Error al verificar licencia' };
    }
  }

  // Registrar dispositivo
  registerDevice(codigo) {
    const devices = this.getDevices();
    devices[codigo] = {
      codigo,
      deviceId: this.deviceId,
      hostname: os.hostname(),
      activa: true,
      ultimaConexion: new Date().toISOString()
    };
    fs.writeFileSync(this.devicesFile, JSON.stringify(devices, null, 2));
  }

  // Obtener dispositivos registrados
  getDevices() {
    try {
      if (!fs.existsSync(this.devicesFile)) return {};
      return JSON.parse(fs.readFileSync(this.devicesFile, 'utf8'));
    } catch {
      return {};
    }
  }

  // Desactivar licencia
  desactivar() {
    try {
      if (fs.existsSync(this.licenseFile)) {
        const licencia = JSON.parse(fs.readFileSync(this.licenseFile, 'utf8'));
        licencia.activa = false;
        fs.writeFileSync(this.licenseFile, JSON.stringify(licencia, null, 2));
      }
      return { exito: true };
    } catch (error) {
      return { exito: false, error: error.message };
    }
  }

  // Obtener info de la licencia
  getInfo() {
    const resultado = this.verificar();
    if (!resultado.valida) return resultado;

    const devices = this.getDevices();
    const equiposRegistrados = Object.values(devices).filter(
      d => d.codigo === resultado.licencia.codigo && d.activa
    ).length;

    return {
      valida: true,
      licencia: {
        ...resultado.licencia,
        equiposRegistrados,
        equiposDisponibles: resultado.licencia.equipos === -1
          ? 'Ilimitado'
          : resultado.licencia.equipos - equiposRegistrados
      }
    };
  }
}

module.exports = LicenseManager;
