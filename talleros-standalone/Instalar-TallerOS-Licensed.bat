@echo off
chcp 65001 >nul
title Instalador TallerOS Licensed v2.0
color 0A

:: ============================================
:: TallerOS Licensed v2.0 - Instalador Completo
:: Incluye: Node.js, Electron, Backend, Frontend
:: ============================================

echo.
echo  ============================================
echo   TallerOS Licensed v2.0
echo   Instalador Automatico
echo  ============================================
echo.

:: Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo  [ERROR] Se necesitan permisos de administrador.
    echo  [INFO] Reiniciando como administrador...
    timeout /t 2 >nul
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

set "INSTALL_DIR=%PROGRAMFILES%\TallerOS-Licensed"

echo  [INFO] Directorio: %INSTALL_DIR%
echo.

:: ============================================
:: PASO 1: Verificar/Instalar Node.js
:: ============================================
echo  [PASO 1/4] Verificando Node.js...

node --version >nul 2>&1
if %errorLevel% equ 0 (
    echo  [OK] Node.js detectado.
) else (
    echo  [INFO] Node.js no encontrado. Descargando...
    echo  [INFO] Esto puede tardar unos minutos...

    powershell -Command "& {
        $url = 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi'
        $output = '%TEMP%\node-installer.msi'
        Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing -MaximumRetryCount 3
    }"

    if exist "%TEMP%\node-installer.msi" (
        echo  [INFO] Instalando Node.js...
        msiexec /i "%TEMP%\node-installer.msi" /qn /norestart
        del "%TEMP%\node-installer.msi" 2>nul
        echo  [OK] Node.js instalado.
    ) else (
        echo  [ERROR] No se pudo descargar Node.js.
        pause
        exit /b 1
    )
)

echo.

:: ============================================
:: PASO 2: Copiar archivos
:: ============================================
echo  [PASO 2/4] Copiando archivos de TallerOS...

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Copiar todo excepto scripts de instalacion
robocopy "%~dp0" "%INSTALL_DIR%" /E /XD "%~dp0" /XF "Instalar-*.bat" "README.txt" /NJH /NJS >nul

echo  [OK] Archivos copiados.
echo.

:: ============================================
:: PASO 3: Instalar dependencias
:: ============================================
echo  [PASO 3/4] Instalando dependencias...
echo  [INFO] Esto puede tardar 5-10 minutos la primera vez...
echo.

cd /d "%INSTALL_DIR%"

:: Instalar dependencias principales (incluye Electron)
echo  [INFO] Instalando dependencias de Electron...
call npm install
if %errorLevel% neq 0 (
    echo  [ERROR] Error instalando dependencias principales.
    pause
    exit /b 1
)

:: Instalar dependencias del backend
echo  [INFO] Instalando dependencias del backend...
cd "%INSTALL_DIR%\backend"
call npm install
if %errorLevel% neq 0 (
    echo  [ERROR] Error instalando dependencias del backend.
    pause
    exit /b 1
)

cd /d "%INSTALL_DIR%"

echo  [OK] Dependencias instaladas.
echo.

:: ============================================
:: PASO 4: Crear accesos directos
:: ============================================
echo  [PASO 4/4] Creando accesos directos...

:: Crear acceso directo en el escritorio
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%PUBLIC%\Desktop\TallerOS Licensed.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\Iniciar-TallerOS-Electron.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.IconLocation = '%INSTALL_DIR%\resources\icon.ico'; $Shortcut.Save()"

:: Crear en Menu Inicio
if not exist "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\TallerOS Licensed" mkdir "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\TallerOS Licensed"
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\TallerOS Licensed\TallerOS Licensed.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\Iniciar-TallerOS-Electron.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.IconLocation = '%INSTALL_DIR%\resources\icon.ico'; $Shortcut.Save()"

echo  [OK] Accesos directos creados.
echo.

:: ============================================
:: INSTALACION COMPLETADA
:: ============================================
echo  ============================================
echo   INSTALACION COMPLETADA
echo  ============================================
echo.
echo  [INFO] TallerOS Licensed se ha instalado en:
echo         %INSTALL_DIR%
echo.
echo  [INFO] Para iniciar:
echo         - Doble clic en el icono del escritorio
echo         - Busca "TallerOS Licensed" en el menu inicio
echo.
echo  [INFO] La primera vez que inicies:
echo         - Se abrira la ventana de activacion de licencia
echo         - Sigue las instrucciones en pantalla
echo.
echo  ============================================
echo.

set /p START_NOW="Deseas iniciar TallerOS ahora? (S/N): "
if /i "%START_NOW%"=="S" (
    echo  [INFO] Iniciando TallerOS Licensed...
    start "" "%INSTALL_DIR%\Iniciar-TallerOS-Electron.bat"
) else (
    echo  [INFO] Instalacion completada.
    echo  [INFO] Puedes iniciar TallerOS desde el escritorio.
    pause
)

exit /b 0
