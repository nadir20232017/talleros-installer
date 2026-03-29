@echo off
cd /d "%~dp0"
cls
echo ============================================
echo   INSTALADOR TALLEROS LICENSED v2.0
echo ============================================
echo.

:: Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Se necesitan permisos de administrador.
    echo [INFO] Reiniciando...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Agregar Node.js al PATH si existe
if exist "C:\Program Files\nodejs" (
    set "PATH=%PATH%;C:\Program Files\nodejs"
)

:: Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [INFO] Node.js no encontrado.
    echo [INFO] Descargando Node.js...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile '%TEMP%\node.msi'"
    echo [INFO] Instalando Node.js...
    msiexec /i "%TEMP%\node.msi" /qn /norestart
    set "PATH=%PATH%;C:\Program Files\nodejs"
    timeout /t 3 >nul
)

echo [OK] Node.js listo.
echo.

:: Instalar dependencias
echo [INFO] Instalando dependencias principales...
cd /d "%~dp0"
call npm install
if errorlevel 1 (
    echo [ERROR] Error instalando dependencias principales
    pause
    exit /b 1
)

echo [INFO] Instalando dependencias del backend...
cd /d "%~dp0\backend"
call npm install
if errorlevel 1 (
    echo [ERROR] Error instalando dependencias del backend
    pause
    exit /b 1
)

echo [OK] Dependencias instaladas.
echo.

:: Crear acceso directo
echo [INFO] Creando acceso directo...
powershell -Command "$s=New-Object -COM WScript.Shell;$l=$s.CreateShortcut('%PUBLIC%\Desktop\TallerOS Licensed.lnk');$l.TargetPath='%~dp0Iniciar-TallerOS-Electron.bat';$l.WorkingDirectory='%~dp0';$l.IconLocation='%~dp0resources\icon.ico';$l.Save()"

echo [OK] Instalacion completada.
echo.
echo Para iniciar, haz doble clic en el icono del escritorio.
pause
