@echo off
chcp 65001 >nul
title Instalador TallerOS v2.0
color 0A
cls

echo ==========================================
echo    INSTALADOR TallerOS v2.0 para Windows
echo ==========================================
echo.
echo Este instalador configurara todo automaticamente.
echo.
pause
cls

:: ════════════════════════════════════════════
:: PASO 1: Verificar/Instalar Node.js
:: ════════════════════════════════════════════
echo [PASO 1/4] Verificando Node.js...

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo    Node.js no encontrado. Descargando...
    echo.
    echo    Descargando Node.js LTS...

    :: Descargar Node.js
    powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi' -OutFile '%TEMP%\nodejs.msi'}"

    if exist "%TEMP%\nodejs.msi" (
        echo    Instalando Node.js...
        echo    (Esto puede tomar unos minutos...)
        msiexec /i "%TEMP%\nodejs.msi" /quiet /norestart

        :: Limpiar
        del "%TEMP%\nodejs.msi" >nul 2>&1

        echo    Node.js instalado correctamente.
    ) else (
        echo    ERROR: No se pudo descargar Node.js
        echo    Por favor instala manualmente desde nodejs.org
        pause
        exit /b 1
    )
) else (
    for /f "tokens=*" %%a in ('node --version') do echo    Node.js encontrado: %%a
)

echo.

:: ════════════════════════════════════════════
:: PASO 2: Copiar archivos
:: ════════════════════════════════════════════
echo [PASO 2/4] Instalando archivos...

set "INSTALLDIR=%PROGRAMFILES%\TallerOS"
if exist "C:\Program Files\TallerOS" rmdir /s /q "C:\Program Files\TallerOS" >nul 2>&1

:: Crear directorio
mkdir "%INSTALLDIR%" >nul 2>&1

:: Copiar archivos (asumiendo que estan en la misma carpeta)
xcopy /E /I /Y "files-win-licencia-pro\*" "%INSTALLDIR%\" >nul 2>&1

echo    Archivos copiados a: %INSTALLDIR%
echo.

:: ════════════════════════════════════════════
:: PASO 3: Instalar dependencias
:: ════════════════════════════════════════════
echo [PASO 3/4] Instalando dependencias...
echo    (Esto puede tomar varios minutos...)
echo.

cd /d "%INSTALLDIR%\backend"
call npm install >nul 2>&1
if %errorlevel% neq 0 (
    echo    Advertencia: Problema instalando dependencias del backend
)

cd /d "%INSTALLDIR%\frontend"
call npm install >nul 2>&1

cd /d "%INSTALLDIR%"
echo    Dependencias instaladas.
echo.

:: ════════════════════════════════════════════
:: PASO 4: Crear accesos directos
:: ════════════════════════════════════════════
echo [PASO 4/4] Creando accesos directos...

:: Crear el archivo de inicio silencioso
echo Set WshShell = CreateObject("WScript.Shell") > "%INSTALLDIR%\Iniciar-TallerOS.vbs"
echo WshShell.Run "%~dp0backend\Iniciar-Backend.bat", 0, False >> "%INSTALLDIR%\Iniciar-TallerOS.vbs"
echo Set WshShell = Nothing >> "%INSTALLDIR%\Iniciar-TallerOS.vbs"

:: Crear el batch del backend
echo @echo off > "%INSTALLDIR%\backend\Iniciar-Backend.bat"
echo cd /d "%~dp0" >> "%INSTALLDIR%\backend\Iniciar-Backend.bat"
echo start "" "http://localhost:3001" >> "%INSTALLDIR%\backend\Iniciar-Backend.bat"
echo npm start >> "%INSTALLDIR%\backend\Iniciar-Backend.bat"

:: Acceso directo en el escritorio
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\TallerOS v2.0.lnk'); $Shortcut.TargetPath = '%INSTALLDIR%\Iniciar-TallerOS.vbs'; $Shortcut.IconLocation = '%INSTALLDIR%\icono.ico'; $Shortcut.Save()"

:: Menu inicio
mkdir "%APPDATA%\Microsoft\Windows\Start Menu\Programs\TallerOS" >nul 2>&1
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\TallerOS\TallerOS v2.0.lnk'); $Shortcut.TargetPath = '%INSTALLDIR%\Iniciar-TallerOS.vbs'; $Shortcut.IconLocation = '%INSTALLDIR%\icono.ico'; $Shortcut.Save()"

echo    Accesos directos creados.
echo.

:: ════════════════════════════════════════════
:: FINALIZAR
:: ════════════════════════════════════════════
echo ==========================================
echo    INSTALACION COMPLETADA
echo ==========================================
echo.
echo TallerOS v2.0 ha sido instalado en:
echo %INSTALLDIR%
echo.
echo Para iniciar, haz doble clic en el icono
echo "TallerOS v2.0" en tu escritorio.
echo.
pause
