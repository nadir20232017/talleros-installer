@echo off
cd /d "%~dp0"
cls

:: Configurar PATH de Node.js
set "NODE_PATH=C:\Program Files\nodejs"
set "PATH=%PATH%;%NODE_PATH%"

echo ============================================
echo   INICIANDO TALLEROS v2.0
echo ============================================
echo.

:: Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no encontrado.
    echo.
    echo Instala Node.js desde: https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js detectado.
echo.
echo [INFO] Iniciando servidor...
echo [INFO] Espera a que aparezca "Servidor iniciado en puerto 3003"
echo.
echo [INFO] Despues abre tu navegador en: http://localhost:3003
echo.
echo [INFO] Datos de acceso:
echo          Usuario: admin@igsm.com
echo          Contrasena: admin123
echo.
echo ============================================
echo.

:: Iniciar TallerOS
npm start

if errorlevel 1 (
    echo.
    echo [ERROR] El servidor se detuvo.
    pause
)
