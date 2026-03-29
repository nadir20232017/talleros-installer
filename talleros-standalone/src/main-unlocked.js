/**
 * TallerOS v2.0 - Main Process (UNLOCKED VERSION)
 * Version libre para admin/supervisor - Sin sistema de licencias
 */

const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');

// Configuracion de logs
const log = require('electron-log');
log.transports.file.level = 'info';

// Variables globales
let mainWindow;
let backendProcess;
let isQuitting = false;

// Directorio de trabajo
const workDir = process.platform === 'darwin'
  ? path.join(os.homedir(), 'Library', 'Application Support', 'TallerOS-Unlocked')
  : path.join(os.homedir(), 'AppData', 'Roaming', 'TallerOS-Unlocked');

const logFile = path.join(workDir, 'server.log');

// Asegurar que existe el directorio de trabajo
if (!fs.existsSync(workDir)) {
  fs.mkdirSync(workDir, { recursive: true });
}

// Funcion para matar procesos zombie que usen el puerto 3003
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

// Funcion para copiar recursos la primera vez
function setupResources() {
  const isPackaged = process.resourcesPath && process.resourcesPath.includes('Resources');
  const resourcesDir = isPackaged ? process.resourcesPath : path.join(__dirname, '..');
  const devDir = path.join(__dirname, '..');

  let backendSrc = path.join(resourcesDir, 'backend');
  let frontendSrc = path.join(resourcesDir, 'frontend');

  if (!fs.existsSync(backendSrc)) {
    backendSrc = path.join(devDir, 'backend');
  }
  if (!fs.existsSync(frontendSrc)) {
    frontendSrc = path.join(devDir, 'frontend');
  }

  const backendDest = path.join(workDir, 'backend');
  const frontendDest = path.join(workDir, 'frontend');

  log.info('Backend src:', backendSrc, 'exists:', fs.existsSync(backendSrc));
  log.info('Frontend src:', frontendSrc, 'exists:', fs.existsSync(frontendSrc));

  if (fs.existsSync(backendSrc) && (!fs.existsSync(backendDest))) {
    log.info('Copiando backend...');
    copyRecursive(backendSrc, backendDest);
  }

  if (fs.existsSync(frontendSrc) && (!fs.existsSync(frontendDest))) {
    log.info('Copiando frontend...');
    copyRecursive(frontendSrc, frontendDest);
  }

  return { backendDest, frontendDest };
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

// Crear archivo .env para SQLite
function createEnvFile() {
  const envPath = path.join(workDir, '.env');
  if (!fs.existsSync(envPath)) {
    const envContent = `DATABASE_URL=sqlite:./talleros.db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=talleros
DB_USER=talleros
DB_PASSWORD=talleros123
NODE_ENV=production
PORT=3003
`;
    fs.writeFileSync(envPath, envContent);
    log.info('Archivo .env creado');
  }
  return envPath;
}

// Verificar si Node.js esta instalado
async function checkNodeInstalled() {
  return new Promise((resolve) => {
    exec('node --version', (error) => {
      if (error) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// Funcion para iniciar el backend
async function startBackend() {
  const { backendDest } = setupResources();
  const envPath = createEnvFile();

  const nodeInstalled = await checkNodeInstalled();

  if (!nodeInstalled) {
    log.error('Node.js no esta instalado');
    dialog.showErrorBox('Error', 'Node.js no esta instalado.\n\nPor favor, instala Node.js desde:\nhttps://nodejs.org');
    app.quit();
    return;
  }

  log.info('Iniciando backend en:', backendDest);

  const indexPath = path.join(backendDest, 'src', 'index.js');

  if (!fs.existsSync(indexPath)) {
    log.error('No se encuentra backend/src/index.js');
    dialog.showErrorBox('Error', 'Archivos del backend no encontrados');
    return;
  }

  // Instalar dependencias si es necesario
  const nodeModulesPath = path.join(backendDest, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log.info('Instalando dependencias del backend...');
    await new Promise((resolve) => {
      const npmInstall = spawn('npm', ['install'], {
        cwd: backendDest,
        stdio: 'inherit'
      });
      npmInstall.on('close', resolve);
    });
  }

  // Iniciar servidor
  backendProcess = spawn('node', ['src/index.js'], {
    cwd: backendDest,
    env: { ...process.env, NODE_ENV: 'production' }
  });

  backendProcess.stdout.on('data', (data) => {
    const output = data.toString();
    log.info('[Backend]:', output);

    if (output.includes('Servidor iniciado') || output.includes('API iniciada')) {
      log.info('Backend listo, abriendo ventana principal...');
      createMainWindow();
    }
  });

  backendProcess.stderr.on('data', (data) => {
    log.error('[Backend Error]:', data.toString());
  });

  backendProcess.on('close', (code) => {
    log.info(`Backend cerrado con codigo ${code}`);
    if (!isQuitting) {
      dialog.showErrorBox('Error', 'El servidor se detuvo inesperadamente');
    }
  });
}

// Crear ventana principal (UNLOCKED - Sin verificacion de licencia)
function createMainWindow() {
  if (mainWindow) {
    mainWindow.focus();
    return;
  }

  log.info('Creando ventana principal (UNLOCKED)...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '..', 'resources', 'icon.png'),
    title: 'TallerOS v2.0 - Version Admin',
    show: false,
    backgroundColor: '#080a0e'
  });

  // Cargar directamente la aplicacion (sin pantalla de activacion)
  mainWindow.loadURL('http://localhost:3003');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log.info('Ventana principal mostrada');
  });

  // Manejar cierre
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Crear menu
  createMenu();
}

// Crear menu de aplicacion
function createMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Generar Licencias',
          click: () => {
            shell.openExternal('http://localhost:3003/admin-licencias.html');
          }
        },
        { type: 'separator' },
        {
          label: 'Recargar',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        {
          label: 'Consola de Desarrollo',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) mainWindow.webContents.openDevTools();
          }
        },
        { type: 'separator' },
        {
          label: 'Salir',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Soporte Tecnico',
          click: () => {
            shell.openExternal('mailto:soporte@igsm.es');
          }
        },
        {
          label: 'Acerca de',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Acerca de TallerOS',
              message: 'TallerOS v2.0 - Version Admin (Unlocked)',
              detail: 'Sistema de Gestion de Talleres\n\nVersion: 2.0.0\nModo: ADMIN - Sin restricciones de licencia\n\n(C) 2024 iGSM'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Eventos de Electron
app.whenReady().then(async () => {
  log.info('App iniciada - Version UNLOCKED');
  await killZombieProcesses();
  await startBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  if (backendProcess) {
    backendProcess.kill();
  }
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  log.error('Error no capturado:', error);
});
