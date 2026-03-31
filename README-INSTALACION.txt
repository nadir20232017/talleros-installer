═══════════════════════════════════════════════════════════════════
  TALLEROS v2.0 - INSTALADOR PARA WINDOWS
  One-Click Installer - Sin comandos, sin configuración
═══════════════════════════════════════════════════════════════════

📋 CONTENIDO DE ESTA CARPETA:

  📁 files-win-licencia-pro/     ← Archivos de la aplicación
  📄 Instalar-TallerOS.ps1      ← Instalador PowerShell (RECOMENDADO)
  📄 INSTALAR-TallerOS.bat      ← Instalador Batch (Alternativa)
  📄 EJECUTAR-INSTALADOR.bat     ← ← ← USA ESTE (Soluciona problemas)
  📄 installer-professional.nsi  ← Script NSIS (Para crear .exe)
  📄 README-INSTALACION.txt      ← Este archivo

═══════════════════════════════════════════════════════════════════

⚠️⚠️⚠️ IMPORTANTE - LEER ESTO PRIMERO ⚠️⚠️⚠️

Si PowerShell se cierra al abrir o da error de permisos,
usa el archivo:  EJECUTAR-INSTALADOR.bat

═══════════════════════════════════════════════════════════════════

🚀 MÉTODO RECOMENDADO #1: Ejecutar Instalador (CORREGIDO)

  1. Doble clic en "EJECUTAR-INSTALADOR.bat"
  2. Si pide "Permitir que esta app realice cambios", clic en SI
  3. Sigue las instrucciones
  4. ¡Listo!

  Este archivo soluciona automáticamente los problemas de permisos.

═══════════════════════════════════════════════════════════════════

🚀 MÉTODO #2: Solo si el anterior no funciona

  PowerShell Directo:
  1. Click derecho en "Instalar-TallerOS.ps1"
  2. Selecciona "Ejecutar con PowerShell"
  3. Si da error de permisos, abre PowerShell como ADMINISTRADOR:
     - Click en Inicio
     - Escribe "PowerShell"
     - Click derecho → "Ejecutar como administrador"
     - Escribe: Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser
     - Escribe: S
     - Luego ejecuta el instalador

═══════════════════════════════════════════════════════════════════

🚀 MÉTODO #3: Instalador Batch (Más compatible)

  1. Doble clic en "INSTALAR-TallerOS.bat"
  2. Sigue las instrucciones en la ventana negra
  3. Espera a que termine

  Este método funciona siempre pero es menos visual.

═══════════════════════════════════════════════════════════════════

⚙️ MÉTODO AVANZADO: Crear instalador .exe profesional

  Si tienes NSIS instalado:
  1. Abre "installer-professional.nsi" con NSIS
  2. Compila (Ctrl+F9)
  3. Genera "TallerOS-v2.0-Setup.exe"
  4. Distribuye ese archivo a tus clientes

  NOTA: Se corrigió el error del icono. La ruta ahora es correcta.

═══════════════════════════════════════════════════════════════════

📁 DESPUÉS DE LA INSTALACIÓN:

  La app se instala en: C:\Program Files\TallerOS

  Accesos directos creados:
  • Escritorio: "TallerOS v2.0"
  • Menú Inicio: Programas → TallerOS

  Para iniciar: Doble clic en el icono del escritorio

═══════════════════════════════════════════════════════════════════

🔧 SOLUCIÓN DE PROBLEMAS:

  PROBLEMA: "No se puede cargar el archivo porque está deshabilitada la ejecución de scripts"
  SOLUCIÓN: Usa "EJECUTAR-INSTALADOR.bat" en lugar del .ps1 directamente

  PROBLEMA: "Error de compilación NSIS - can't open file icono.ico"
  SOLUCIÓN: Se corrigió en el archivo actual. La ruta del icono ahora es correcta.

  PROBLEMA: El instalador se queda en "Descargando Node.js"
  SOLUCIÓN: Ve a https://nodejs.org, descarga e instala Node.js manualmente,
            luego vuelve a ejecutar el instalador de TallerOS.

═══════════════════════════════════════════════════════════════════

✉️ SOPORTE:

  Para ayuda adicional:
  iGSM Servicio Técnico
  info@igsm.com

═══════════════════════════════════════════════════════════════════
