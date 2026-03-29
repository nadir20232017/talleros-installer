@echo off
cd /d "%~dp0"

echo ============================================
echo   TALLEROS LICENSED v2.0
echo ============================================
echo.

set "NODE_PATH=C:\Program Files\nodejs"
set "PATH=%PATH%;%NODE_PATH%"

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no encontrado.
    echo [INFO] Instala Node.js desde: https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js detectado.
echo.
echo [INFO] Iniciando TallerOS...
echo [INFO] Espera a que aparezca "Servidor iniciado"
echo.

npm start

pause
