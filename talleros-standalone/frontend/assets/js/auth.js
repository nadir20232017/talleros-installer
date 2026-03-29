// ═══════════════════════════════════════════════════════
//  TallerOS Auth Utilities
// ═══════════════════════════════════════════════════════

(function() {
  'use strict';

  // Verificar sesión activa
  function checkSession() {
    const token = localStorage.getItem('talleros_token');
    const userStr = localStorage.getItem('talleros_user');

    if (!token) {
      window.location.href = '/login.html';
      return null;
    }

    try {
      return JSON.parse(userStr || '{}');
    } catch (e) {
      localStorage.removeItem('talleros_token');
      localStorage.removeItem('talleros_user');
      window.location.href = '/login.html';
      return null;
    }
  }

  // Obtener usuario actual
  function getCurrentUser() {
    const userStr = localStorage.getItem('talleros_user');
    try {
      return JSON.parse(userStr || '{}');
    } catch (e) {
      return {};
    }
  }

  // Cerrar sesión
  function logout() {
    if (confirm('¿Cerrar sesión?')) {
      localStorage.removeItem('talleros_token');
      localStorage.removeItem('talleros_user');
      window.location.href = '/login.html';
    }
  }

  // Inicializar UI del usuario en el topbar
  function initUserUI() {
    const user = getCurrentUser();
    if (!user.nombre) return;

    const color = user.color || '#00d4ff';
    const ini = user.ini || user.iniciales || 'US';
    const nombre = user.nombre || 'Usuario';

    // Actualizar avatar en welcome
    const welcomeAv = document.getElementById('welcome-av');
    if (welcomeAv) {
      welcomeAv.style.cssText = `width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;background:${color}22;color:${color}`;
      welcomeAv.textContent = ini;
    }

    // Actualizar nombre
    const welcomeNombre = document.getElementById('welcome-nombre');
    if (welcomeNombre) {
      welcomeNombre.textContent = `Hola, ${nombre.split(' ')[0]}!`;
    }

    // Actualizar sub
    const welcomeSub = document.getElementById('welcome-sub');
    if (welcomeSub) {
      welcomeSub.textContent = `Bienvenido a TallerOS — ${new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })}`;
    }

    // Actualizar chip de usuario
    const userAv = document.getElementById('user-av');
    if (userAv) {
      userAv.style.cssText = `width:24px;height:24px;border-radius:50%;background:${color}22;color:${color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800`;
      userAv.textContent = ini;
    }

    const userName = document.getElementById('user-name');
    if (userName) {
      userName.textContent = nombre.split(' ')[0];
    }

    // Configurar logout
    const userChip = document.getElementById('user-chip');
    if (userChip) {
      userChip.onclick = logout;
    }
  }

  // Generar logo dinámico - usa configuración guardada
  function getDocConfig() {
    try {
      var cfg = JSON.parse(localStorage.getItem("talleros_config") || "{}");
      var docs = cfg.documentos || {};
      return {
        nombre: docs.texto_cabecera || docs.nombre_empresa || "iGSM",
        colorPrimario: docs.color_primario || "#ff3d5a",
        colorSecundario: docs.color_secundario || "#00d4ff"
      };
    } catch(e) {
      return { nombre: "iGSM", colorPrimario: "#ff3d5a", colorSecundario: "#00d4ff" };
    }
  }

  function generarLogoDoc(docCfg) {
    if (!docCfg) docCfg = getDocConfig();
    if (docCfg.nombre.indexOf('<') >= 0) {
      return docCfg.nombre;
    }
    if (docCfg.nombre.toLowerCase().startsWith('i')) {
      return '<span style="color:' + docCfg.colorPrimario + '">i</span><span style="color:' + docCfg.colorSecundario + '">' + docCfg.nombre.substring(1) + '</span>';
    }
    return '<span style="color:' + docCfg.colorPrimario + '">' + docCfg.nombre + '</span>';
  }

  function initLogo() {
    var docCfg = getDocConfig();
    var logoHTML = generarLogoDoc(docCfg);
    const logoEl = document.getElementById('topbar-logo');
    if (logoEl) {
      logoEl.innerHTML = logoHTML;
    }
  }

  // Inicializar página protegida
  function initProtectedPage() {
    const user = checkSession();
    if (user) {
      initUserUI();
      initLogo();
    }
  }

  // Exponer funciones globales
  window.TallerAuth = {
    checkSession,
    getCurrentUser,
    logout,
    initUserUI,
    initLogo,
    initProtectedPage
  };
})();
