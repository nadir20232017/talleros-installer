@echo off
cd /d "%~dp0"
cls

echo ============================================
echo   INSTALADOR TALLEROS v2.0
echo ============================================
echo.
echo Este script instalara TallerOS paso a paso.
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
    echo Por favor instala Node.js desde:
    echo https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
    echo.
    echo Despues de instalarlo, cierra esta ventana y vuelve a ejecutar este script.
    pause
    exit /b 1
)
echo [OK] Node.js encontrado.

echo.
echo [PASO 2] Instalando dependencias principales...
echo (Esto puede tardar 3-5 minutos...)
call npm install
if errorlevel 1 (
    echo [ERROR] Error instalando dependencias principales.
    pause
    exit /b 1
)
echo [OK] Dependencias principales instaladas.

echo.
echo [PASO 3] Instalando dependencias del backend...
echo (Esto puede tardar 2-3 minutos...)
cd backend
call npm install
if errorlevel 1 (
    echo [ERROR] Error instalando dependencias del backend.
    pause
    exit /b 1
)
cd ..
echo [OK] Dependencias del backend instaladas.

echo.
echo [PASO 4] Configurando base de datos SQLite...
echo DATABASE_URL=sqlite:./talleros.db > .env
echo [OK] Base de datos configurada.

echo.
echo [PASO 5] Creando acceso directo en el escritorio...
powershell -NoProfile -Command "$s=New-Object -COM WScript.Shell;$l=$s.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\TallerOS v2.0.lnk');$l.TargetPath='%~dp0INICIAR_MANUAL.bat';$l.WorkingDirectory='%~dp0';$l.IconLocation='%~dp0resources\icon.ico';$l.Save()" 2>nul
if errorlevel 1 (
    echo [ADVERTENCIA] No se pudo crear el acceso directo automaticamente.
    echo Puedes crearlo manualmente despues.
) else (
    echo [OK] Acceso directo creado en el escritorio.
)

echo.
echo ============================================
echo   INSTALACION COMPLETADA
echo ============================================
echo.
echo TallerOS se ha instalado correctamente.
echo.
echo Para iniciar TallerOS:
echo 1. Haz doble clic en el icono del escritorio
echo    "TallerOS v2.0"
echo 2. O ejecuta: INICIAR_MANUAL.bat
echo.
echo Datos de acceso por defecto:
echo   Usuario: admin@igsm.com
echo   Contrasena: admin123
echo.
pause
