/**
 * Verificador de Dependencias para TallerOS
 * Detecta qué componentes faltan en Windows
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class DependencyChecker {
  constructor() {
    this.platform = process.platform;
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Verifica todas las dependencias necesarias
   */
  async checkAll() {
    const checks = [];

    if (this.platform === 'win32') {
      checks.push(this.checkVisualCppRedist());
      checks.push(this.checkPostgreSQL());
      checks.push(this.checkNode());
    } else {
      checks.push(this.checkPostgreSQL());
    }

    await Promise.all(checks);

    return {
      ok: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Verifica Visual C++ Redistributable en Windows
   */
  checkVisualCppRedist() {
    return new Promise((resolve) => {
      if (this.platform !== 'win32') {
        resolve(true);
        return;
      }

      // Verificar en el registro de Windows
      const regCommand = 'reg query "HKLM\\SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\VCRedist\\x64" /v Installed 2>nul || reg query "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\VisualStudio\\14.0\\VC\\VCRedist\\x64" /v Installed 2>nul';

      exec(regCommand, { windowsHide: true }, (error, stdout) => {
        if (error || !stdout.includes('0x1')) {
          this.warnings.push({
            type: 'VISUAL_CPP_MISSING',
            message: 'Visual C++ Redistributable no encontrado',
            solution: 'Descarga e instala desde:\nhttps://aka.ms/vs/17/release/vc_redist.x64.exe',
            critical: false
          });
        }
        resolve(true);
      });
    });
  }

  /**
   * Verifica PostgreSQL
   */
  checkPostgreSQL() {
    return new Promise((resolve) => {
      // Verificar si pg_isready está disponible
      exec('pg_isready --version 2>nul || echo NOT_FOUND', { windowsHide: true }, (error, stdout) => {
        if (stdout.includes('NOT_FOUND') || error) {
          if (this.platform === 'win32') {
            this.errors.push({
              type: 'POSTGRESQL_MISSING',
              message: 'PostgreSQL no está instalado en este equipo',
              solution: 'Para instalar PostgreSQL en Windows:\n\n1. Descarga desde: https://www.postgresql.org/download/windows/\n2. Ejecuta el instalador y sigue los pasos\n3. Establece una contraseña para el usuario postgres\n4. Reinicia TallerOS\n\nO usa el instalador de EnterpriseDB: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads',
              critical: true
            });
          } else {
            this.errors.push({
              type: 'POSTGRESQL_MISSING',
              message: 'PostgreSQL no está instalado',
              solution: 'Instala PostgreSQL con Homebrew:\n\nbrew install postgresql@14\nbrew services start postgresql@14\n\nO descarga desde: https://postgresapp.com/',
              critical: true
            });
          }
        } else {
          // Verificar si el servicio está corriendo
          this.checkPostgreSQLRunning();
        }
        resolve(true);
      });
    });
  }

  /**
   * Verifica si PostgreSQL está corriendo
   */
  checkPostgreSQLRunning() {
    return new Promise((resolve) => {
      exec('pg_isready -h localhost', { windowsHide: true }, (error) => {
        if (error) {
          if (this.platform === 'win32') {
            this.errors.push({
              type: 'POSTGRESQL_NOT_RUNNING',
              message: 'PostgreSQL está instalado pero no está ejecutándose',
              solution: 'Inicia el servicio de PostgreSQL:\n\n1. Presiona Win + R y escribe: services.msc\n2. Busca "postgresql-x64-14" (o similar)\n3. Haz clic derecho → Iniciar\n\nO desde Símbolo del sistema como Administrador:\nnet start postgresql-x64-14',
              critical: true
            });
          } else {
            this.errors.push({
              type: 'POSTGRESQL_NOT_RUNNING',
              message: 'PostgreSQL no está ejecutándose',
              solution: 'Inicia PostgreSQL:\n\nbrew services start postgresql@14',
              critical: true
            });
          }
        }
        resolve(true);
      });
    });
  }

  /**
   * Verifica Node.js embebido
   */
  checkNode() {
    return new Promise((resolve) => {
      const isPackaged = process.resourcesPath && process.resourcesPath.includes('resources');
      const resourcesDir = isPackaged ? process.resourcesPath : path.join(__dirname, '..');

      const nodePath = path.join(resourcesDir, 'node', this.platform === 'win32' ? 'node.exe' : 'node');

      if (!fs.existsSync(nodePath)) {
        if (this.platform === 'win32') {
          this.errors.push({
            type: 'NODE_MISSING',
            message: 'No se encontró Node.js embebido (node.exe)',
            solution: 'El instalador de TallerOS está incompleto.\n\nPor favor, reinstala TallerOS desde:\n- El instalador oficial\n- O contacta soporte: soporte@igsm.es',
            critical: true
          });
        } else {
          this.errors.push({
            type: 'NODE_MISSING',
            message: 'No se encontró Node.js embebido',
            solution: 'Instala Node.js:\n\nbrew install node\n\nO descarga desde: https://nodejs.org/',
            critical: true
          });
        }
      }
      resolve(true);
    });
  }

  /**
   * Obtiene mensaje formateado para mostrar al usuario
   */
  getFormattedMessage() {
    if (this.errors.length === 0 && this.warnings.length === 0) {
      return null;
    }

    let message = '';

    if (this.errors.length > 0) {
      message += '❌ ERRORES CRÍTICOS:\n\n';
      this.errors.forEach((err, index) => {
        message += `${index + 1}. ${err.message}\n\n`;
        message += `Solución:\n${err.solution}\n\n`;
        message += '─'.repeat(60) + '\n\n';
      });
    }

    if (this.warnings.length > 0) {
      message += '⚠️  ADVERTENCIAS:\n\n';
      this.warnings.forEach((warn, index) => {
        message += `${index + 1}. ${warn.message}\n\n`;
        message += `Recomendación:\n${warn.solution}\n\n`;
        message += '─'.repeat(60) + '\n\n';
      });
    }

    return message;
  }

  /**
   * Obtiene solo errores críticos
   */
  getCriticalErrors() {
    return this.errors.filter(e => e.critical);
  }
}

module.exports = DependencyChecker;
