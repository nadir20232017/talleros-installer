/**
 * Preload script para TallerOS Licensed
 * Expone funciones seguras al frontend
 */

const { contextBridge, ipcRenderer } = require('electron');

// Exponer API segura al frontend
contextBridge.exposeInMainWorld('electronAPI', {
  // Información de licencia
  getLicenseStatus: () => ipcRenderer.invoke('get-license-status'),
  activateLicense: (code) => ipcRenderer.invoke('activate-license', code),
  setFreeMode: () => ipcRenderer.invoke('set-free-mode'),

  // Información del sistema
  getAppVersion: () => '2.0.0',
  getPlatform: () => process.platform,

  // Logs
  log: (message) => ipcRenderer.send('log', message),

  // Abrir enlaces externos
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});

// Escuchar eventos del main process
ipcRenderer.on('license-status-changed', (event, status) => {
  window.dispatchEvent(new CustomEvent('license-status-changed', { detail: status }));
});
