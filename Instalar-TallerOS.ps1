# ═══════════════════════════════════════════════════════════════
#  TallerOS Windows Installer - PowerShell
#  Instalacion profesional con barra de progreso
# ═══════════════════════════════════════════════════════════════

param(
    [switch]$Silent,
    [string]$InstallDir = "$env:ProgramFiles\TallerOS"
)

# Configuracion
$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

$HOST.UI.RawUI.WindowTitle = "Instalador TallerOS v2.0"

# Colores
$Colors = @{
    Success = "Green"
    Info = "Cyan"
    Warning = "Yellow"
    Error = "Red"
}

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    $color = $Colors[$Type]
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')]" -NoNewline -ForegroundColor Gray
    Write-Host " $Message" -ForegroundColor $color
}

function Show-Progress {
    param([int]$Percent, [string]$Activity)
    Write-Progress -Activity $Activity -PercentComplete $Percent -Status "Progreso: $Percent%"
}

Clear-Host
Write-Host ""
Write-Host "    ╔═══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "    ║                                           ║" -ForegroundColor Cyan
Write-Host "    ║     INSTALADOR TallerOS v2.0             ║" -ForegroundColor Cyan
Write-Host "    ║     para Windows                         ║" -ForegroundColor Cyan
Write-Host "    ║                                           ║" -ForegroundColor Cyan
Write-Host "    ╚═══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not $Silent) {
    $continue = Read-Host "Presiona ENTER para comenzar la instalacion"
}

# ═══════════════════════════════════════════════════════════════
# PASO 1: Verificar/Instalar Node.js
# ═══════════════════════════════════════════════════════════════
Write-Status "PASO 1/4: Verificando Node.js..." "Info"
Show-Progress -Percent 10 -Activity "Verificando Node.js"

try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Status "Node.js encontrado: $nodeVersion" "Success"
    } else {
        throw "Node.js no encontrado"
    }
} catch {
    Write-Status "Node.js no instalado. Descargando..." "Warning"
    Show-Progress -Percent 15 -Activity "Descargando Node.js"

    $nodeUrl = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
    $nodeInstaller = "$env:TEMP\nodejs.msi"

    try {
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -UseBasicParsing
        Write-Status "Descarga completada. Instalando Node.js..." "Info"
        Show-Progress -Percent 20 -Activity "Instalando Node.js"

        $process = Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /quiet /norestart" -Wait -PassThru
        if ($process.ExitCode -eq 0) {
            Write-Status "Node.js instalado correctamente" "Success"
        } else {
            throw "Error instalando Node.js (codigo: $($process.ExitCode))"
        }

        Remove-Item $nodeInstaller -Force
    } catch {
        Write-Status "ERROR: No se pudo instalar Node.js automaticamente" "Error"
        Write-Status "Por favor instala manualmente desde: https://nodejs.org" "Warning"
        Start-Process "https://nodejs.org"
        Read-Host "Presiona ENTER para salir"
        exit 1
    }
}

# ═══════════════════════════════════════════════════════════════
# PASO 2: Copiar archivos
# ═══════════════════════════════════════════════════════════════
Write-Status "PASO 2/4: Copiando archivos..." "Info"
Show-Progress -Percent 30 -Activity "Copiando archivos"

$sourceDir = Join-Path $PSScriptRoot "files-win-licencia-pro"

if (-not (Test-Path $sourceDir)) {
    Write-Status "ERROR: No se encuentran los archivos de instalacion" "Error"
    Write-Status "Asegurate de ejecutar este script desde la carpeta correcta" "Warning"
    Read-Host "Presiona ENTER para salir"
    exit 1
}

# Eliminar instalacion anterior si existe
if (Test-Path $InstallDir) {
    Write-Status "Eliminando version anterior..." "Warning"
    Remove-Item -Path $InstallDir -Recurse -Force
}

# Copiar archivos
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -Path "$sourceDir\*" -Destination $InstallDir -Recurse -Force

Write-Status "Archivos copiados a: $InstallDir" "Success"
Show-Progress -Percent 50 -Activity "Copiando archivos"

# ═══════════════════════════════════════════════════════════════
# PASO 3: Instalar dependencias
# ═══════════════════════════════════════════════════════════════
Write-Status "PASO 3/4: Instalando dependencias npm..." "Info"
Write-Status "Esto puede tomar varios minutos..." "Warning"
Show-Progress -Percent 60 -Activity "Instalando dependencias"

$backendDir = Join-Path $InstallDir "backend"
$frontendDir = Join-Path $InstallDir "frontend"

# Backend
Set-Location $backendDir
Write-Status "Instalando dependencias del backend..." "Info"
& npm install 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Status "Backend listo" "Success"
} else {
    Write-Status "Advertencia: Problemas con dependencias del backend" "Warning"
}

Show-Progress -Percent 75 -Activity "Instalando dependencias"

# Frontend
Set-Location $frontendDir
Write-Status "Instalando dependencias del frontend..." "Info"
& npm install 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Status "Frontend listo" "Success"
} else {
    Write-Status "Advertencia: Problemas con dependencias del frontend" "Warning"
}

Show-Progress -Percent 90 -Activity "Instalando dependencias"

# ═══════════════════════════════════════════════════════════════
# PASO 4: Crear lanzadores
# ═══════════════════════════════════════════════════════════════
Write-Status "PASO 4/4: Creando accesos directos..." "Info"
Show-Progress -Percent 95 -Activity "Creando accesos directos"

# Crear el batch de inicio del backend
$startBackend = @"
@echo off
cd /d "%~dp0"
start "" "http://localhost:3001"
npm start
"@
$startBackend | Out-File -FilePath (Join-Path $backendDir "Start-Backend.bat") -Encoding ASCII

# Crear VBS para lanzar sin ventana
$vbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "`"$backendDir\Start-Backend.bat`"", 0, False
Set WshShell = Nothing
"@
$vbsContent | Out-File -FilePath (Join-Path $InstallDir "Iniciar-TallerOS.vbs") -Encoding ASCII

# Acceso directo en el escritorio
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\TallerOS v2.0.lnk")
$Shortcut.TargetPath = Join-Path $InstallDir "Iniciar-TallerOS.vbs"
$Shortcut.IconLocation = Join-Path $InstallDir "icono.ico"
$Shortcut.Save()

# Acceso directo en el menu inicio
$startMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\TallerOS"
New-Item -ItemType Directory -Path $startMenuPath -Force | Out-Null
$Shortcut2 = $WshShell.CreateShortcut("$startMenuPath\TallerOS v2.0.lnk")
$Shortcut2.TargetPath = Join-Path $InstallDir "Iniciar-TallerOS.vbs"
$Shortcut2.IconLocation = Join-Path $InstallDir "icono.ico"
$Shortcut2.Save()

Write-Status "Accesos directos creados" "Success"
Show-Progress -Percent 100 -Activity "Completado"

# ═══════════════════════════════════════════════════════════════
# FINALIZAR
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "    ╔═══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "    ║                                           ║" -ForegroundColor Green
Write-Host "    ║     INSTALACION COMPLETADA!             ║" -ForegroundColor Green
Write-Host "    ║                                           ║" -ForegroundColor Green
Write-Host "    ╚═══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Status "TallerOS v2.0 instalado en: $InstallDir" "Info"
Write-Host ""
Write-Status "Para iniciar TallerOS:" "Info"
Write-Host "  1. Haz doble clic en el icono 'TallerOS v2.0' en tu escritorio" -ForegroundColor White
Write-Host "  2. Espera 3-5 segundos" -ForegroundColor White
Write-Host "  3. Tu navegador se abrira automaticamente" -ForegroundColor White
Write-Host ""

if (-not $Silent) {
    $launch = Read-Host "Quieres iniciar TallerOS ahora? (S/N)"
    if ($launch -eq "S" -or $launch -eq "s") {
        & (Join-Path $InstallDir "Iniciar-TallerOS.vbs")
        Write-Status "Iniciando TallerOS..." "Success"
    }

    Read-Host "Presiona ENTER para salir"
}

exit 0
