@echo off
chcp 65001 >nul
title Instalador TallerOS v2.0
color 0A

:: ============================================
:: TallerOS v2.0 - Instalador Automatico
:: ============================================

echo.
echo  ============================================
echo   TallerOS v2.0 - Instalador Automatico
echo  ============================================
echo.

:: Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo  [ERROR] Este instalador necesita permisos de administrador.
    echo  [INFO] Reiniciando como administrador...
    timeout /t 3 >nul
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

set "INSTALL_DIR=%PROGRAMFILES%\TallerOS"
set "NODE_VERSION=20.11.0"
set "PG_VERSION=16.2-1"

echo  [INFO] Directorio de instalacion: %INSTALL_DIR%
echo.

:: ============================================
:: PASO 1: Verificar/Instalar Node.js
:: ============================================
echo  [PASO 1/4] Verificando Node.js...

node --version >nul 2>&1
if %errorLevel% equ 0 (
    echo  [OK] Node.js ya esta instalado.
    for /f "tokens=*" %%a in ('node --version') do set NODE_INSTALLED=%%a
    echo            Version: %NODE_INSTALLED%
) else (
    echo  [INFO] Node.js no encontrado. Descargando...
    echo  [INFO] Descargando Node.js v%NODE_VERSION%...

    powershell -Command "& {
        $url = 'https://nodejs.org/dist/v%NODE_VERSION%/node-v%NODE_VERSION%-x64.msi'
        $output = '%TEMP%\node-installer.msi'
        Write-Host '  [INFO] Descargando...'
        try {
            Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing -MaximumRetryCount 3
            Write-Host '  [OK] Descarga completada'
        } catch {
            Write-Host '  [ERROR] Error descargando Node.js'
            exit 1
        }
    }"

    if exist "%TEMP%\node-installer.msi" (
        echo  [INFO] Instalando Node.js...
        msiexec /i "%TEMP%\node-installer.msi" /qn /norestart
        if %errorLevel% equ 0 (
            echo  [OK] Node.js instalado correctamente.
        ) else (
            echo  [ERROR] Error instalando Node.js.
            pause
            exit /b 1
        )
        del "%TEMP%\node-installer.msi" 2>nul
    ) else (
        echo  [ERROR] No se pudo descargar Node.js.
        echo  [INFO] Por favor, instala manualmente desde: https://nodejs.org
        pause
        exit /b 1
    )
)

echo.

:: ============================================
:: PASO 2: Verificar/Instalar PostgreSQL
:: ============================================
echo  [PASO 2/4] Verificando PostgreSQL...

:: Verificar si PostgreSQL esta instalado
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
    echo  [OK] PostgreSQL 16 ya esta instalado.
) else if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
    echo  [OK] PostgreSQL 15 ya esta instalado.
) else if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" (
    echo  [OK] PostgreSQL 14 ya esta instalado.
) else (
    echo  [INFO] PostgreSQL no encontrado. Descargando...
    echo  [INFO] Esto puede tardar varios minutos...

    powershell -Command "& {
        $url = 'https://get.enterprisedb.com/postgresql/postgresql-%PG_VERSION%-windows-x64.exe'
        $output = '%TEMP%\postgres-installer.exe'
        Write-Host '  [INFO] Descargando PostgreSQL (aprox. 350 MB)...'
        try {
            Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing -MaximumRetryCount 3
            Write-Host '  [OK] Descarga completada'
        } catch {
            Write-Host '  [ERROR] Error descargando: ' $_.Exception.Message
            exit 1
        }
    }"

    if exist "%TEMP%\postgres-installer.exe" (
        echo  [INFO] Instalando PostgreSQL...
        echo  [INFO] Configurando usuario: postgres / contraseña: postgres123
        "%TEMP%\postgres-installer.exe" --mode unattended --unattendedmodeui minimal --superpassword postgres123 --serverport 5432
        if %errorLevel% equ 0 (
            echo  [OK] PostgreSQL instalado correctamente.
        ) else (
            echo  [ADVERTENCIA] PostgreSQL puede haberse instalado con advertencias.
            echo  [INFO] Verificando instalacion...
        )
        del "%TEMP%\postgres-installer.exe" 2>nul
    ) else (
        echo  [ADVERTENCIA] No se pudo descargar PostgreSQL automaticamente.
        echo  [INFO] Por favor, instala manualmente desde: https://www.postgresql.org/download/windows/
        echo  [INFO] Presiona cualquier tecla para continuar sin PostgreSQL...
        pause >nul
    )
)

echo.

:: ============================================
:: PASO 3: Instalar TallerOS
:: ============================================
echo  [PASO 3/4] Instalando TallerOS...

:: Crear directorio de instalacion
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Copiar archivos de TallerOS
echo  [INFO] Copiando archivos...
robocopy "%~dp0" "%INSTALL_DIR%" /E /XD "%~dp0" /XF "Instalar-TallerOS.bat" "Iniciar-TallerOS.bat" "README.txt" "LEEME-*.txt" /NJH /NJS

:: Crear archivo de configuracion
echo  [INFO] Creando configuracion...
(
echo DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/talleros
echo DB_HOST=localhost
echo DB_PORT=5432
echo DB_NAME=talleros
echo DB_USER=postgres
echo DB_PASSWORD=postgres123
echo NODE_ENV=production
echo PORT=3003
) > "%INSTALL_DIR%\.env"

:: Instalar dependencias Node.js
echo  [INFO] Instalando dependencias (esto puede tardar varios minutos)...
cd /d "%INSTALL_DIR%"
call npm install --production
if %errorLevel% neq 0 (
    echo  [ERROR] Error instalando dependencias.
    echo  [INFO] Intenta ejecutar manualmente: cd "%INSTALL_DIR%" ^&^& npm install
    pause
    exit /b 1
)

echo  [OK] TallerOS instalado correctamente.
echo.

:: ============================================
:: PASO 4: Crear accesos directos
:: ============================================
echo  [PASO 4/4] Creando accesos directos...

:: Crear accesos directos
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\TallerOS.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\Iniciar-TallerOS.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.IconLocation = '%INSTALL_DIR%\resources\icon.ico'; $Shortcut.Save()"

:: Crear en Menu Inicio
if not exist "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\TallerOS" mkdir "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\TallerOS"
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\TallerOS\TallerOS.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\Iniciar-TallerOS.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.IconLocation = '%INSTALL_DIR%\resources\icon.ico'; $Shortcut.Save()"

echo  [OK] Accesos directos creados.
echo.

:: ============================================
:: INSTALACION COMPLETADA
:: ============================================
echo  ============================================
echo   INSTALACION COMPLETADA
echo  ============================================
echo.
echo  [INFO] TallerOS se ha instalado en:
echo         %INSTALL_DIR%
echo.
echo  [INFO] Accesos directos creados en:
echo         - Escritorio
echo         - Menu Inicio
echo.
echo  [INFO] Para iniciar TallerOS:
echo         - Doble clic en el icono del escritorio
echo         - O busca "TallerOS" en el menu inicio
echo.
echo  [INFO] Datos de acceso por defecto:
echo         - Usuario: admin@igsm.com
echo         - Contraseña: admin123
echo.
echo  ============================================
echo.

:: Preguntar si iniciar ahora
set /p START_NOW="¿Deseas iniciar TallerOS ahora? (S/N): "
if /i "%START_NOW%"=="S" (
    echo  [INFO] Iniciando TallerOS...
    start "" "%INSTALL_DIR%\Iniciar-TallerOS.bat"
) else (
    echo  [INFO] Instalacion completada. Puedes iniciar TallerOS desde el escritorio.
    pause
)

exit /b 0
