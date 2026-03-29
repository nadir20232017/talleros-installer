@echo off
cd /d "%~dp0"

echo ============================================
echo   INSTALADOR TALLEROS LICENSED v2.0
echo ============================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Se necesitan permisos de administrador.
    echo [INFO] Reiniciando como administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

set "INSTALL_DIR=%PROGRAMFILES%\TallerOS-Licensed"
set "NODE_PATH=C:\Program Files\nodejs"
set "PATH=%PATH%;%NODE_PATH%"

echo [INFO] Directorio de instalacion: %INSTALL_DIR%
echo.

echo [PASO 1/3] Verificando Node.js...

node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Node.js no encontrado.
    echo [INFO] Descargando e instalando Node.js...
    echo [INFO] Esto puede tardar unos minutos...

    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile '%TEMP%\node.msi'"

    if exist "%TEMP%\node.msi" (
        msiexec /i "%TEMP%\node.msi" /qn /norestart
        del "%TEMP%\node.msi" >nul 2>&1
        set "PATH=%PATH%;%NODE_PATH%"
        timeout /t 3 >nul
        echo [OK] Node.js instalado.
    ) else (
        echo [ERROR] No se pudo descargar Node.js.
        echo [INFO] Por favor, descarga manualmente desde: https://nodejs.org
        pause
        exit /b 1
    )
) else (
    echo [OK] Node.js encontrado.
)

echo.
echo [PASO 2/3] Copiando archivos...

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

xcopy /E /I /Y "*" "%INSTALL_DIR%\" >nul 2>&1

echo [OK] Archivos copiados.
echo.

echo [PASO 3/3] Instalando dependencias...
echo [INFO] Esto puede tardar 5-10 minutos...

cd /d "%INSTALL_DIR%"

echo [INFO] Instalando dependencias principales...
call npm install
if %errorLevel% neq 0 (
    echo [ERROR] Error instalando dependencias principales.
    pause
    exit /b 1
)

echo [INFO] Instalando dependencias del backend...
cd "%INSTALL_DIR%\backend"
call npm install
if %errorLevel% neq 0 (
    echo [ERROR] Error instalando dependencias del backend.
    pause
    exit /b 1
)

echo [OK] Dependencias instaladas.
echo.

echo [INFO] Creando accesos directos...

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%PUBLIC%\Desktop\TallerOS Licensed.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\INICIAR.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Save()" >nul 2>&1

echo [OK] Acceso directo creado en el escritorio.
echo.

echo ============================================
echo   INSTALACION COMPLETADA
echo ============================================
echo.
echo [INFO] TallerOS se ha instalado en:
echo         %INSTALL_DIR%
echo.
echo [INFO] Para iniciar, haz doble clic en:
echo         "TallerOS Licensed" en el escritorio
echo.
pause
