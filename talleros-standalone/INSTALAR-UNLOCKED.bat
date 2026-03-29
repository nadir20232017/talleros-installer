@echo off
cd /d "%~dp0"
cls

echo ============================================
echo   INSTALADOR TALLEROS v2.0 - ADMIN
echo   (Version Unlocked - Sin Licencias)
echo ============================================
echo.
pause

:: Configurar PATH de Node.js
set "NODE_PATH=C:\Program Files\nodejs"
set "PATH=%PATH%;%NODE_PATH%"

echo.
echo [PASO 1] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no encontrado.
    echo.
    echo Descarga e instala desde: https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js encontrado.

echo.
echo [PASO 2] Instalando dependencias...
echo (Esto puede tardar 5-10 minutos...)
call npm install
if errorlevel 1 (
    echo [ERROR] Error instalando dependencias principales.
    pause
    exit /b 1
)

cd backend
call npm install
if errorlevel 1 (
    echo [ERROR] Error instalando dependencias del backend.
    pause
    exit /b 1
)
cd ..

echo [OK] Dependencias instaladas.

echo.
echo [PASO 3] Configurando base de datos SQLite...
echo DATABASE_URL=sqlite:./talleros.db > .env
echo [OK] Base de datos configurada.

echo.
echo [PASO 4] Creando acceso directo...
powershell -Command "$s=New-Object -COM WScript.Shell;$l=$s.CreateShortcut('%USERPROFILE%\Desktop\TallerOS Admin.lnk');$l.TargetPath='%~dp0INICIAR-UNLOCKED.bat';$l.WorkingDirectory='%~dp0';$l.IconLocation='%~dp0resources\icon.ico';$l.Save()" >nul 2>&1
echo [OK] Acceso directo creado.

echo.
echo ============================================
echo   INSTALACION COMPLETADA
echo ============================================
echo.
echo Version: ADMIN (Unlocked)
echo Modo: Sin restricciones de licencia
echo.
echo Para iniciar:
echo - Doble clic en "TallerOS Admin" en el escritorio
echo.
echo Acceso directo al sistema:
echo - http://localhost:3003
echo.
echo Datos de acceso:
echo   Usuario: admin@igsm.com
echo   Contrasena: admin123
echo.
echo Incluye: Generador de licencias para clientes
echo.
pause
