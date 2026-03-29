@echo off
cd /d "%~dp0"
set "NODE_PATH=C:\Program Files\nodejs"
set "PATH=%PATH%;%NODE_PATH%"
cls
echo ============================================
echo   INICIANDO TALLEROS v2.0 - ADMIN
echo   (Version Unlocked)
echo ============================================
echo.
echo [INFO] Usando main-unlocked.js (sin verificacion de licencia)
echo [INFO] Espera a que aparezca "Servidor iniciado"
echo [INFO] Despues abre: http://localhost:3003
echo.
echo [INFO] Modo ADMIN activado
echo [INFO] Generador de licencias: http://localhost:3003/admin-licencias.html
echo.
echo ============================================
echo.

:: Verificar que existe el archivo main-unlocked.js
if not exist "src\main-unlocked.js" (
    echo [ERROR] No se encuentra src\main-unlocked.js
    echo [INFO] Usando version standard...
    npm start
) else (
    :: Usar el main-unlocked.js para modo admin sin licencias
    node src\main-unlocked.js
)

if errorlevel 1 (
    echo.
    echo [ERROR] El servidor se detuvo.
    pause
)
