═══════════════════════════════════════════════════════════════════
  TALLEROS LICENSED v2.0 - INSTRUCCIONES PARA CONSTRUIR INSTALADORES
═══════════════════════════════════════════════════════════════════

ESTRUCTURA DEL PROYECTO:
------------------------
TallerOS-Licensed/
├── src/                    ← Código fuente Electron
├── backend/                ← Backend Node.js
├── frontend/               ← Frontend HTML/CSS/JS
├── node/                   ← Node.js embebido
├── resources/              ← Iconos y recursos
├── build/                  ← Scripts de instalador NSIS
├── package.json            ← Configuración de electron-builder
├── LEEME-INSTALACION-WINDOWS.txt  ← Guía Windows
└── LEEME-INSTALACION-MAC.txt       ← Guía Mac

REQUISITOS PARA CONSTRUIR:
--------------------------
• Node.js 18+ instalado
• electron-builder instalado globalmente:
  npm install -g electron-builder

• Para Mac: macOS con Xcode Command Line Tools
• Para Windows: Windows con Visual Studio Build Tools

═══════════════════════════════════════════════════════════════════
CONSTRUIR INSTALADOR WINDOWS
═══════════════════════════════════════════════════════════════════

1. Abre terminal en esta carpeta:
   cd /Users/air/Desktop/TallerOS-Licensed

2. Instala dependencias (primera vez):
   npm install

3. Construye el instalador:
   npm run build-win

   O directamente:
   electron-builder --win

4. El instalador se creará en:
   dist/TallerOS-Licensed-v2.0.0-Windows-x64-Setup.exe

5. Verifica que incluye el archivo LEEME:
   - El archivo LEEME-INSTALACION-WINDOWS.txt debe estar en los recursos
   - Al instalar, se copiará al escritorio

═══════════════════════════════════════════════════════════════════
CONSTRUIR INSTALADOR MAC
═══════════════════════════════════════════════════════════════════

OPCIÓN 1 - Universal (Intel + Apple Silicon):
--------------------------------------------
npm run build-mac

O:
electron-builder --mac

OPCIÓN 2 - Solo Intel (x64):
-----------------------------
npm run build-mac:intel

O:
electron-builder --mac --x64

OPCIÓN 3 - Solo Apple Silicon (arm64):
--------------------------------------
npm run build-mac:arm

O:
electron-builder --mac --arm64

4. El instalador se creará en:
   dist/TallerOS-Licensed-v2.0.0.dmg

5. El DMG incluye:
   - TallerOS.app (aplicación)
   - Enlace a Applications
   - LEEME-INSTALACION-MAC.txt (instrucciones detalladas)

═══════════════════════════════════════════════════════════════════
VERIFICACIÓN PREVIA
═══════════════════════════════════════════════════════════════════

Antes de construir, verifica:

☐ package.json tiene la versión correcta
☐ LEEME-INSTALACION-WINDOWS.txt existe y está actualizado
☐ LEEME-INSTALACION-MAC.txt existe y está actualizado
☐ build/installer.nsh está configurado
☐ resources/icon.ico existe (para Windows)
☐ resources/icon.icns existe (para Mac)
☐ src/main.js tiene la lógica de licencias
☐ backend/ está completo con node_modules
☐ frontend/ está completo

═══════════════════════════════════════════════════════════════════
COMANDOS RÁPIDOS
═══════════════════════════════════════════════════════════════════

# Limpiar builds anteriores
rm -rf dist/

# Windows (desde Mac con cross-compilation - NO RECOMENDADO)
# Mejor construir Windows desde una máquina Windows

# Mac desde Mac
npm run build-mac

# Verificar contenido del DMG
hdiutil attach dist/TallerOS-Licensed-v2.0.0.dmg
ls /Volumes/TallerOS\ Licensed/
hdiutil detach /Volumes/TallerOS\ Licensed/

═══════════════════════════════════════════════════════════════════
SOLUCIÓN DE PROBLEMAS DE CONSTRUCCIÓN
═══════════════════════════════════════════════════════════════════

ERROR: "Cannot find module 'electron-builder'"
-----------------------------------------------
npm install -g electron-builder

ERROR: "Identity not found" (Mac)
----------------------------------
El code signing está configurado pero no hay certificado.
Para desarrollo, desactiva el code signing en package.json:

  "mac": {
    "identity": null,
    ...
  }

ERROR: "file doesn't exist" de iconos
--------------------------------------
Asegúrate de que existan:
  - resources/icon.ico (Windows)
  - resources/icon.icns (Mac)

ERROR: "asarUnpack" no encuentra archivos
------------------------------------------
Asegúrate de que las rutas en asarUnpack sean correctas:
  - "node/**/*" debe existir
  - "backend/**/*" debe existir

═══════════════════════════════════════════════════════════════════
DISTRIBUCIÓN
═══════════════════════════════════════════════════════════════════

Una vez construidos los instaladores:

1. Prueba los instaladores en máquinas limpias
2. Verifica que los archivos LEEME se incluyen
3. Sube a tu servidor de descargas
4. Crea checksums para verificar integridad:

   shasum -a 256 dist/TallerOS-Licensed-v2.0.0.dmg
   certutil -hashfile dist/TallerOS-Licensed-v2.0.0-Windows-x64-Setup.exe SHA256

═══════════════════════════════════════════════════════════════════
© 2024 iGSM - TallerOS v2.0 Licensed
═══════════════════════════════════════════════════════════════════
