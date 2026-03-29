const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');

// Configuración de logs
const log = require('electron-log');
log.transports.file.level = 'info';

// Verificador de dependencias
const DependencyChecker = require('./dependency-checker');

// Sistema de licencias
const LicenseManager = require('./license-validator');

// Variables globales
let mainWindow;
let backendProcess;
let isQuitting = false;
let licenseManager;
let appMode = 'free'; // 'free', 'trial', 'licensed'

// Inicializar gestor de licencias
const licenseDir = process.platform === 'darwin'
  ? path.join(os.homedir(), 'Library', 'Application Support', 'TallerOS-Licensed')
  : path.join(os.homedir(), 'AppData', 'Roaming', 'TallerOS-Licensed');

if (!fs.existsSync(licenseDir)) {
  fs.mkdirSync(licenseDir, { recursive: true });
}

licenseManager = new LicenseManager(licenseDir);

// Directorio de trabajo
const workDir = path.join(os.homedir(), 'Library', 'Application Support', 'TallerOS-Electron');
const logFile = path.join(workDir, 'server.log');

// Asegurar que existe el directorio de trabajo
if (!fs.existsSync(workDir)) {
  fs.mkdirSync(workDir, { recursive: true });
}

// Función para matar procesos zombie que usen el puerto 3003
function killZombieProcesses() {
  return new Promise((resolve) => {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      exec('lsof -ti:3003 | xargs kill -9 2>/dev/null || true', () => {
        log.info('Procesos zombie en puerto 3003 eliminados');
        resolve();
      });
    } else {
      exec('for /f "tokens=5" %a in (\'netstat -ano ^| findstr :3003\') do taskkill /F /PID %a 2>nul', () => {
        resolve();
      });
    }
  });
}

// Función para copiar recursos la primera vez
function setupResources() {
  // En producción, extraResources están en process.resourcesPath (no dentro de app.asar)
  const isPackaged = process.resourcesPath && process.resourcesPath.includes('Resources');
  const resourcesDir = isPackaged ? process.resourcesPath : path.join(__dirname, '..');
  const devDir = path.join(__dirname, '..');

  // Buscar backend: primero en Resources (producción), luego en desarrollo
  let backendSrc = path.join(resourcesDir, 'backend');
  let frontendSrc = path.join(resourcesDir, 'frontend');
  let nodeSrc = path.join(resourcesDir, 'node');

  // Si no existe en resources, buscar en desarrollo
  if (!fs.existsSync(backendSrc)) {
    backendSrc = path.join(devDir, 'backend');
  }
  if (!fs.existsSync(frontendSrc)) {
    frontendSrc = path.join(devDir, 'frontend');
  }
  if (!fs.existsSync(nodeSrc)) {
    nodeSrc = path.join(devDir, 'node');
  }

  const backendDest = path.join(workDir, 'backend');
  const frontendDest = path.join(workDir, 'frontend');
  const nodeDest = path.join(workDir, 'node');

  log.info('Resources dir:', resourcesDir);
  log.info('Is packaged:', isPackaged);
  log.info('Backend src:', backendSrc, 'exists:', fs.existsSync(backendSrc));
  log.info('Frontend src:', frontendSrc, 'exists:', fs.existsSync(frontendSrc));
  log.info('Node src:', nodeSrc, 'exists:', fs.existsSync(nodeSrc));

  // Copiar si no existen o si son más antiguos
  if (fs.existsSync(backendSrc) && (!fs.existsSync(backendDest) || isNewer(backendSrc, backendDest))) {
    log.info('Copiando backend...');
    copyRecursive(backendSrc, backendDest);
  }

  if (fs.existsSync(frontendSrc) && (!fs.existsSync(frontendDest) || isNewer(frontendSrc, frontendDest))) {
    log.info('Copiando frontend...');
    copyRecursive(frontendSrc, frontendDest);
  }

  if (fs.existsSync(nodeSrc) && (!fs.existsSync(nodeDest) || isNewer(nodeSrc, nodeDest))) {
    log.info('Copiando node...');
    copyRecursive(nodeSrc, nodeDest);
    const nodeBin = path.join(nodeDest, process.platform === 'win32' ? 'node.exe' : 'node');
    if (fs.existsSync(nodeBin)) {
      fs.chmodSync(nodeBin, '755');
    }
  }

  return { backendDest, frontendDest, nodeDest };
}

function isNewer(src, dest) {
  try {
    const srcStat = fs.statSync(src);
    const destStat = fs.statSync(dest);
    return srcStat.mtime > destStat.mtime;
  } catch {
    return true;
  }
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copiar node_modules desde los recursos empaquetados
function copyNodeModules(backendDest, nodeDest) {
  const nodeModulesDest = path.join(backendDest, 'node_modules');

  if (fs.existsSync(nodeModulesDest)) {
    log.info('node_modules ya existe');
    return;
  }

  // Buscar node_modules en los recursos
  const isPackaged = process.resourcesPath && process.resourcesPath.includes('Resources');
  const resourcesDir = isPackaged ? process.resourcesPath : path.join(__dirname, '..');
  const devDir = path.join(__dirname, '..');

  let nodeModulesSrc = path.join(resourcesDir, 'backend', 'node_modules');

  if (!fs.existsSync(nodeModulesSrc)) {
    nodeModulesSrc = path.join(devDir, 'backend', 'node_modules');
  }

  if (fs.existsSync(nodeModulesSrc)) {
    log.info('Copiando node_modules desde recursos...');
    copyRecursive(nodeModulesSrc, nodeModulesDest);
    log.info('node_modules copiado');
  } else {
    log.warn('No se encontró node_modules en los recursos');
  }
}

// Iniciar el backend Node.js
async function startBackend() {
  // Verificar dependencias primero
  const checker = new DependencyChecker();
  const dependencyCheck = await checker.checkAll();

  if (!dependencyCheck.ok) {
    const criticalErrors = checker.getCriticalErrors();

    if (criticalErrors.length > 0) {
      // Hay errores críticos, mostrar mensaje detallado
      const message = checker.getFormattedMessage();
      dialog.showErrorBox(
        `Error - ${process.platform === 'win32' ? 'Windows' : 'macOS'}`,
        message || 'Error desconocido al verificar dependencias'
      );

      // Si es Windows y falta Visual C++, dar opción de continuar
      const hasOnlyVisualCppWarning = checker.warnings.some(w => w.type === 'VISUAL_CPP_MISSING') &&
                                        checker.errors.length === 0;

      if (!hasOnlyVisualCppWarning) {
        return; // No continuar si hay errores críticos
      }
    } else if (checker.warnings.length > 0) {
      // Solo advertencias, mostrar pero continuar
      log.warn('Advertencias de dependencias:', checker.warnings);
    }
  }

  // Matar procesos zombie primero
  await killZombieProcesses();
  await new Promise(resolve => setTimeout(resolve, 500));

  const { backendDest, nodeDest } = setupResources();

  const nodeBin = path.join(nodeDest, process.platform === 'win32' ? 'node.exe' : 'node');
  const backendEntry = path.join(backendDest, 'src', 'index.js');

  // Verificar que exista node
  if (!fs.existsSync(nodeBin)) {
    const platform = process.platform;
    let message = '';

    if (platform === 'win32') {
      message = 'No se encontró Node.js embebido (node.exe).\n\n' +
        'El instalador de TallerOS está incompleto.\n\n' +
        'Soluciones:\n' +
        '1. Reinstala TallerOS desde el instalador oficial\n' +
        '2. Descarga la última versión desde: https://igsm.es/talleros\n' +
        '3. Contacta soporte: soporte@igsm.es';
    } else {
      message = 'No se encontró Node.js embebido.\n\n' +
        'Por favor, instala Node.js:\n' +
        'brew install node';
    }

    dialog.showErrorBox('Error - Node.js no encontrado', message);
    return;
  }

  // Copiar node_modules si existe en recursos
  copyNodeModules(backendDest, nodeDest);

  // Configurar variables de entorno
  const env = {
    ...process.env,
    PORT: '3003',
    NODE_ENV: 'production',
    FRONTEND_PATH: path.join(workDir, 'frontend'),
    DATABASE_URL: `postgresql://${os.userInfo().username}@localhost:5432/talleros`,
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_NAME: 'talleros',
    DB_USER: os.userInfo().username,
    DB_PASSWORD: ''
  };

  log.info('Iniciando backend...');

  backendProcess = spawn(nodeBin, [backendEntry], {
    cwd: backendDest,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Guardar logs
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  backendProcess.stdout.pipe(logStream);
  backendProcess.stderr.pipe(logStream);

  let serverReady = false;

  backendProcess.stdout.on('data', (data) => {
    const output = data.toString();
    log.info('[Backend]', output);

    // Detectar cuando el servidor está listo
    if (!serverReady && (output.includes('API iniciada') || output.includes('Servidor iniciado') || output.includes('3003'))) {
      serverReady = true;
      log.info('Servidor detectado como listo');
      // Exportar licencia al frontend
      exportLicenseToFrontend();
      if (mainWindow) {
        setTimeout(() => {
          mainWindow.loadURL('http://localhost:3003');
        }, 1000);
      }
    }
  });

  // Timeout de seguridad: si en 15 segundos no arranca, mostrar error
  setTimeout(async () => {
    if (!serverReady && mainWindow) {
      log.info('Timeout: servidor no arrancó en 15 segundos');

      // Verificar dependencias específicas según la plataforma
      const checker = new DependencyChecker();
      await checker.checkAll();

      const criticalErrors = checker.getCriticalErrors();

      if (criticalErrors.length > 0) {
        // Mostrar error específico de la dependencia que falta
        const error = criticalErrors[0];
        dialog.showErrorBox(`Error - ${error.type.replace(/_/g, ' ')}`,
          error.message + '\n\n' + error.solution);
      } else if (process.platform === 'win32') {
        // Mensaje específico para Windows
        dialog.showErrorBox('Error - Servidor no responde',
          'No se pudo iniciar el servidor de TallerOS.\n\n' +
          'Verifica los siguientes requisitos:\n\n' +
          '1. PostgreSQL instalado y ejecutándose\n' +
          '   - Presiona Win+R, escribe: services.msc\n' +
          '   - Busca "postgresql" y asegúrate de que esté iniciado\n\n' +
          '2. Visual C++ Redistributable instalado\n' +
          '   - Descarga desde: https://aka.ms/vs/17/release/vc_redist.x64.exe\n\n' +
          '3. Si el problema persiste, revisa los logs en:\n' +
          '   %APPDATA%\\TallerOS-Electron\\server.log\n\n' +
          'Contacta soporte: soporte@igsm.es');
      } else {
        // Mensaje para Mac
        exec('which pg_isready', (err) => {
          if (err) {
            dialog.showErrorBox('Error - PostgreSQL no encontrado',
              'No se pudo iniciar el servidor de TallerOS.\n\n' +
              'Causa probable: PostgreSQL no está instalado.\n\n' +
              'Para instalarlo en este Mac:\n' +
              '1. Abre Terminal\n' +
              '2. Ejecuta: brew install postgresql@14\n' +
              '3. Ejecuta: brew services start postgresql@14\n' +
              '4. Vuelve a abrir TallerOS\n\n' +
              'O instala desde: https://postgresapp.com/');
          } else {
            dialog.showErrorBox('Error - Servidor no responde',
              'No se pudo iniciar el servidor de TallerOS.\n\n' +
              'Verifica que PostgreSQL esté corriendo:\n' +
              'brew services start postgresql@14\n\n' +
              'Si el problema persiste, revisa los logs:\n' +
              logFile);
          }
        });
      }
    }
  }, 15000);

  backendProcess.stderr.on('data', (data) => {
    log.error('[Backend Error]', data.toString());
  });

  backendProcess.on('close', (code) => {
    log.info(`Backend cerrado con código ${code}`);
    if (!isQuitting && code !== 0) {
      dialog.showErrorBox('Error', 'El servidor de TallerOS se ha cerrado inesperadamente.');
    }
  });

  return backendProcess;
}

// Exportar información de licencia para el frontend
function exportLicenseToFrontend() {
  try {
    const licenseData = {
      type: appMode,
      timestamp: new Date().toISOString()
    };

    if (appMode === 'licensed') {
      const result = licenseManager.verificar();
      if (result.valida) {
        licenseData.license = result.licencia;
      }
    } else if (appMode === 'trial') {
      const trialFile = path.join(licenseDir, 'trial.json');
      if (fs.existsSync(trialFile)) {
        const trial = JSON.parse(fs.readFileSync(trialFile, 'utf8'));
        const daysLeft = 14 - Math.floor((new Date() - new Date(trial.started)) / (1000 * 60 * 60 * 24));
        licenseData.daysLeft = daysLeft;
        licenseData.started = trial.started;
      }
    }

    // Guardar en el directorio del frontend para que pueda ser leído
    const licenseExportPath = path.join(workDir, 'frontend', 'license.json');
    fs.writeFileSync(licenseExportPath, JSON.stringify(licenseData, null, 2));
    log.info('Licencia exportada al frontend:', licenseExportPath);
  } catch (error) {
    log.error('Error exportando licencia:', error);
  }
}

// Crear ventana de activación
async function createActivationWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 800,
    minWidth: 500,
    minHeight: 700,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 20, y: 20 } : undefined,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '..', 'resources', 'icon.png'),
    show: false,
    resizable: true
  });

  // Mostrar cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Cargar pantalla de activación
  // Cuando está empaquetado, activation.html está en app.asar.unpacked
  const isPackaged = process.resourcesPath && process.resourcesPath.includes('Resources');
  let activationPath;
  if (isPackaged) {
    activationPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'activation.html');
  } else {
    activationPath = path.join(__dirname, 'activation.html');
  }
  log.info('Loading activation.html from:', activationPath);
  mainWindow.loadFile(activationPath);

  // Manejar cierre
  mainWindow.on('close', (event) => {
    if (!isQuitting && appMode === 'free') {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Salir', 'Cancelar'],
        title: 'Confirmar',
        message: 'Si cierras ahora, no podrás usar TallerOS hasta que actives una licencia o continues con la versión libre.',
        defaultId: 1
      });

      if (choice === 1) {
        event.preventDefault();
      } else {
        isQuitting = true;
        app.quit();
      }
    }
  });
}

// Crear ventana principal
async function createWindow() {
  // Determinar título según modo
  let titleSuffix = '';
  if (appMode === 'free') titleSuffix = ' - Versión Libre';
  else if (appMode === 'trial') titleSuffix = ' - Prueba';
  else if (appMode === 'licensed') titleSuffix = ' - Licenciado';

  // Verificar si está empaquetado
  const isPackagedWin = process.resourcesPath && process.resourcesPath.includes('Resources');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: `TallerOS${titleSuffix}`,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 20 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: isPackagedWin
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'preload.js')
        : path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '..', 'resources', 'icon.png'),
    show: false
  });

  // Configurar menú nativo de macOS
  setupMenu();

  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Abrir DevTools en desarrollo (opcional)
    // mainWindow.webContents.openDevTools();
  });

  // Manejar cierre
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Mostrar página de carga inicial
  let loadingPath;
  if (isPackagedWin) {
    loadingPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'loading.html');
  } else {
    loadingPath = path.join(__dirname, 'loading.html');
  }
  mainWindow.loadFile(loadingPath);

  // Iniciar backend
  await startBackend();
}

// Configurar menú nativo
function setupMenu() {
  // Obtener info de licencia para el menú
  let licenseInfo = 'Versión Libre';
  if (appMode === 'licensed') {
    const result = licenseManager.verificar();
    if (result.valida) {
      licenseInfo = `Licencia ${result.licencia.tipo.toUpperCase()}`;
    }
  } else if (appMode === 'trial') {
    const trialFile = path.join(licenseDir, 'trial.json');
    if (fs.existsSync(trialFile)) {
      const trial = JSON.parse(fs.readFileSync(trialFile, 'utf8'));
      const daysLeft = 14 - Math.floor((new Date() - new Date(trial.started)) / (1000 * 60 * 60 * 24));
      licenseInfo = `Prueba (${daysLeft} días restantes)`;
    }
  }

  const template = [
    {
      label: 'TallerOS',
      submenu: [
        {
          label: `Modo: ${licenseInfo}`,
          enabled: false
        },
        { type: 'separator' },
        {
          label: 'Gestionar Licencia...',
          click: () => {
            // Abrir pantalla de activación
            const activationWin = new BrowserWindow({
              width: 600,
              height: 700,
              parent: mainWindow,
              modal: true,
              webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
              }
            });
            activationWin.loadFile(path.join(__dirname, 'activation.html'));
          }
        },
        { type: 'separator' },
        {
          label: 'Acerca de TallerOS',
          click: () => {
            const result = licenseManager.verificar();
            let detail = 'Sistema de gestión de taller\n© 2024 iGSM\n\n';

            if (result.valida) {
              detail += `Licencia: ${result.licencia.tipo.toUpperCase()}\n`;
              detail += `Equipos permitidos: ${result.licencia.equipos === -1 ? 'Ilimitados' : result.licencia.equipos}\n`;
              detail += `Activada: ${new Date(result.licencia.activada).toLocaleDateString()}`;
            } else if (appMode === 'trial') {
              const trialFile = path.join(licenseDir, 'trial.json');
              if (fs.existsSync(trialFile)) {
                const trial = JSON.parse(fs.readFileSync(trialFile, 'utf8'));
                const daysLeft = 14 - Math.floor((new Date() - new Date(trial.started)) / (1000 * 60 * 60 * 24));
                detail += `Periodo de Prueba\n`;
                detail += `${daysLeft} días restantes\n`;
                detail += `Iniciado: ${new Date(trial.started).toLocaleDateString()}`;
              } else {
                detail += 'Periodo de Prueba\nAlgunas funciones están limitadas.';
              }
            } else {
              detail += 'Versión Libre\nAlgunas funciones están limitadas.';
            }

            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Acerca de TallerOS',
              message: 'TallerOS v2.0',
              detail: detail
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Ocultar TallerOS',
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Ocultar otros',
          accelerator: 'Command+Shift+H',
          role: 'hideOthers'
        },
        { type: 'separator' },
        {
          label: 'Salir',
          accelerator: 'Command+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Recargar',
          accelerator: 'Command+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        {
          label: 'Forzar recarga',
          accelerator: 'Command+Shift+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
          }
        }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        {
          label: 'Pantalla completa',
          accelerator: 'Ctrl+Command+F',
          role: 'togglefullscreen'
        },
        {
          label: 'Zoom +',
          accelerator: 'Command+Plus',
          click: () => {
            if (mainWindow) {
              const level = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(level + 1);
            }
          }
        },
        {
          label: 'Zoom -',
          accelerator: 'Command+-',
          click: () => {
            if (mainWindow) {
              const level = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(level - 1);
            }
          }
        },
        {
          label: 'Restablecer zoom',
          accelerator: 'Command+0',
          click: () => {
            if (mainWindow) mainWindow.webContents.setZoomLevel(0);
          }
        }
      ]
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'close', label: 'Cerrar' },
        { type: 'separator' },
        { role: 'front', label: 'Traer todo al frente' }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Abrir en navegador',
          click: () => {
            shell.openExternal('http://localhost:3003');
          }
        },
        {
          label: 'Ver logs',
          click: () => {
            shell.openPath(logFile);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Handlers IPC para sistema de licencias
ipcMain.handle('get-license-status', async () => {
  const result = licenseManager.verificar();

  if (result.valida) {
    return {
      type: 'licensed',
      license: result.licencia
    };
  }

  // Verificar si hay trial activo
  const trialFile = path.join(licenseDir, 'trial.json');
  if (fs.existsSync(trialFile)) {
    const trial = JSON.parse(fs.readFileSync(trialFile, 'utf8'));
    const now = new Date();
    const started = new Date(trial.started);
    const daysLeft = 14 - Math.floor((now - started) / (1000 * 60 * 60 * 24));

    if (daysLeft > 0) {
      return {
        type: 'trial',
        daysLeft: daysLeft
      };
    }
  }

  return { type: 'free' };
});

ipcMain.handle('activate-license', async (event, code) => {
  const result = licenseManager.activar(code);

  if (result.valida) {
    appMode = 'licensed';
    // Exportar licencia actualizada al frontend
    exportLicenseToFrontend();
    // Iniciar backend si aún no está corriendo
    if (!backendProcess) {
      await startBackend();
    }
    return { valid: true, license: result.licencia };
  }

  return { valid: false, error: result.error };
});

ipcMain.handle('set-free-mode', async () => {
  appMode = 'free';

  // Iniciar trial si es la primera vez
  const trialFile = path.join(licenseDir, 'trial.json');
  if (!fs.existsSync(trialFile)) {
    fs.writeFileSync(trialFile, JSON.stringify({
      started: new Date().toISOString(),
      active: true
    }, null, 2));
    appMode = 'trial';
  }

  // Iniciar backend
  if (!backendProcess) {
    await startBackend();
  }

  return { success: true };
});

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
  return { success: true };
});

// Obtener información completa de licencia para el frontend
ipcMain.handle('get-license-info', async () => {
  const result = licenseManager.verificar();

  if (result.valida) {
    return {
      valid: true,
      license: result.licencia
    };
  }

  // Verificar trial
  const trialFile = path.join(licenseDir, 'trial.json');
  if (fs.existsSync(trialFile)) {
    const trial = JSON.parse(fs.readFileSync(trialFile, 'utf8'));
    const now = new Date();
    const started = new Date(trial.started);
    const daysLeft = 14 - Math.floor((now - started) / (1000 * 60 * 60 * 24));

    if (daysLeft > 0) {
      return {
        valid: false,
        mode: 'trial',
        daysLeft: daysLeft,
        started: trial.started
      };
    }
  }

  return { valid: false, mode: 'free' };
});

ipcMain.on('log', (event, message) => {
  log.info('[Renderer]', message);
});

// Eventos de la app
app.whenReady().then(async () => {
  // Verificar licencia antes de iniciar
  const licenseCheck = licenseManager.verificar();

  if (licenseCheck.valida) {
    // Tiene licencia válida, iniciar normalmente
    appMode = 'licensed';
    await createWindow();
  } else {
    // Verificar trial
    const trialFile = path.join(licenseDir, 'trial.json');
    if (fs.existsSync(trialFile)) {
      const trial = JSON.parse(fs.readFileSync(trialFile, 'utf8'));
      const now = new Date();
      const started = new Date(trial.started);
      const daysLeft = 14 - Math.floor((now - started) / (1000 * 60 * 60 * 24));

      if (daysLeft > 0) {
        appMode = 'trial';
        await createWindow();
        return;
      }
    }

    // Sin licencia ni trial activo, mostrar pantalla de activación
    await createActivationWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;

  // Cerrar backend forzosamente
  if (backendProcess) {
    log.info('Cerrando backend...');
    try {
      backendProcess.kill('SIGTERM');
      // Esperar un poco y forzar cierre si persiste
      setTimeout(() => {
        try {
          process.kill(backendProcess.pid, 'SIGKILL');
        } catch (e) {
          // Proceso ya cerrado
        }
      }, 2000);
    } catch (e) {
      log.error('Error cerrando backend:', e);
    }
  }
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  dialog.showErrorBox('Error inesperado', error.message);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Rejection:', reason);
});
