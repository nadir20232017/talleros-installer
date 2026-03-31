; ═══════════════════════════════════════════════════════════════
;  TallerOS Professional Installer - Windows One-Click
;  Instala: Node.js + App + Dependencias + Accesos Directos
; ═══════════════════════════════════════════════════════════════

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "x64.nsh"

; Configuracion
Name "TallerOS v2.0"
OutFile "TallerOS-v2.0-Setup.exe"
InstallDir "$PROGRAMFILES64\TallerOS"
RequestExecutionLevel admin
SetCompressor lzma

; Tamanos de ventana
!define MUI_ICON "files-win-licencia-pro\resources\icon.ico"
!define MUI_UNICON "files-win-licencia-pro\resources\icon.ico"

; Paginas
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Idiomas
!insertmacro MUI_LANGUAGE "Spanish"

; Variables
Var NODE_INSTALLED
Var NODE_VERSION

; ═══════════════════════════════════════════════════════════════
;  FUNCIONES AUXILIARES
; ═══════════════════════════════════════════════════════════════

; Verificar si Node.js esta instalado
Function CheckNodeJS
  ClearErrors
  ${If} ${RunningX64}
    ReadRegStr $0 HKLM "Software\Node.js" "InstallPath"
  ${Else}
    ReadRegStr $0 HKLM "Software\WOW6432Node\Node.js" "InstallPath"
  ${EndIf}

  ${If} $0 == ""
    ; Verificar en PATH
    nsExec::ExecToStack '"cmd" /c node --version'
    Pop $0
    ${If} $0 == "error"
      StrCpy $NODE_INSTALLED "0"
    ${Else}
      StrCpy $NODE_INSTALLED "1"
    ${EndIf}
  ${Else}
    StrCpy $NODE_INSTALLED "1"
  ${EndIf}
FunctionEnd

; Descargar e instalar Node.js silenciosamente
Function InstallNodeJS
  DetailPrint "Descargando Node.js..."

  ; Crear directorio temporal
  CreateDirectory "$TEMP\TallerOS-Installer"

  ; Descargar Node.js LTS (x64)
  NSISdl::download "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi" "$TEMP\TallerOS-Installer\nodejs.msi"
  Pop $0

  ${If} $0 != "success"
    DetailPrint "Error descargando Node.js. Intentando instalar manualmente..."
    MessageBox MB_OK "No se pudo descargar NodeJS automaticamente. Por favor instala Node.js desde nodejs.org y reejecuta el instalador."
    ExecShell "open" "https://nodejs.org/"
    Abort
  ${EndIf}

  DetailPrint "Instalando Node.js..."
  ; Instalar silenciosamente: /quiet /norestart
  ExecWait '"msiexec" /i "$TEMP\TallerOS-Installer\nodejs.msi" /quiet /norestart' $0

  ${If} $0 != "0"
    DetailPrint "Error instalando Node.js (codigo: $0)"
    MessageBox MB_OK "Hubo un error instalando Node.js. Por favor instala manualmente desde nodejs.org"
    ExecShell "open" "https://nodejs.org/"
    Abort
  ${EndIf}

  DetailPrint "Node.js instalado correctamente"
  StrCpy $NODE_INSTALLED "1"

  ; Limpiar
  Delete "$TEMP\TallerOS-Installer\nodejs.msi"
FunctionEnd

; ═══════════════════════════════════════════════════════════════
;  SECCION PRINCIPAL DE INSTALACION
; ═══════════════════════════════════════════════════════════════
Section "TallerOS" SecMain
  SectionIn RO

  DetailPrint "========================================="
  DetailPrint "  Instalando TallerOS v2.0"
  DetailPrint "========================================="

  ; ═════════════════════════════════════════
  ;  PASO 1: Verificar/Instalar Node.js
  ; ═════════════════════════════════════════
  DetailPrint ""
  DetailPrint "Paso 1/5: Verificando Node.js..."

  Call CheckNodeJS

  ${If} $NODE_INSTALLED == "0"
    DetailPrint "Node.js no encontrado. Instalando..."
    Call InstallNodeJS
  ${Else}
    DetailPrint "Node.js ya esta instalado"
  ${EndIf}

  ; ═════════════════════════════════════════
  ;  PASO 2: Copiar archivos
  ; ═════════════════════════════════════════
  DetailPrint ""
  DetailPrint "Paso 2/5: Copiando archivos..."

  SetOutPath "$INSTDIR"
  File /r "files-win-licencia-pro\*.*"

  ; ═════════════════════════════════════════
  ;  PASO 3: Instalar dependencias npm
  ; ═════════════════════════════════════════
  DetailPrint ""
  DetailPrint "Paso 3/5: Instalando dependencias..."
  DetailPrint "Esto puede tomar varios minutos..."

  ; Backend
  SetOutPath "$INSTDIR\backend"
  nsExec::ExecToLog '"cmd" /c npm install'
  Pop $0

  ${If} $0 != "0"
    DetailPrint "Advertencia: Error instalando dependencias del backend"
  ${EndIf}

  ; Frontend
  SetOutPath "$INSTDIR\frontend"
  nsExec::ExecToLog '"cmd" /c npm install'
  Pop $0

  ; ═════════════════════════════════════════
  ;  PASO 4: Crear archivos de inicio
  ; ═════════════════════════════════════════
  DetailPrint ""
  DetailPrint "Paso 4/5: Creando lanzadores..."

  ; Crear el archivo de inicio principal
  FileOpen $0 "$INSTDIR\Iniciar-TallerOS.bat" w
  FileWrite $0 "@echo off$
"
  FileWrite $0 "chcp 65001 >nul$
"
  FileWrite $0 "title TallerOS v2.0$
"
  FileWrite $0 "cd /d $\"$INSTDIR\backend$\"$
"
  FileWrite $0 "echo =======================================$
"
  FileWrite $0 "echo   TallerOS v2.0 - Iniciando servidor$
"
  FileWrite $0 "echo =======================================$
"
  FileWrite $0 "echo.$
"
  FileWrite $0 "echo Abriendo navegador en 3 segundos...$
"
  FileWrite $0 "timeout /t 3 /nobreak >nul$
"
  FileWrite $0 "start http://localhost:3001$
"
  FileWrite $0 "npm start$
"
  FileClose $0

  ; Crear el archivo de inicio silencioso (sin ventana de cmd)
  FileOpen $0 "$INSTDIR\Iniciar-TallerOS-Silencioso.vbs" w
  FileWrite $0 "Set WshShell = CreateObject($\"WScript.Shell$\")$
"
  FileWrite $0 "WshShell.Run $\"$INSTDIR\Iniciar-TallerOS.bat$\", 0, False$
"
  FileWrite $0 "Set WshShell = Nothing$
"
  FileClose $0

  ; Crear acceso directo mejorado
  SetOutPath "$INSTDIR"
  CreateShortcut "$DESKTOP\TallerOS v2.0.lnk" "$INSTDIR\Iniciar-TallerOS-Silencioso.vbs" "" "$INSTDIR\resources\icon.ico" 0

  CreateDirectory "$SMPROGRAMS\TallerOS"
  CreateShortcut "$SMPROGRAMS\TallerOS\TallerOS v2.0.lnk" "$INSTDIR\Iniciar-TallerOS-Silencioso.vbs" "" "$INSTDIR\resources\icon.ico" 0
  CreateShortcut "$SMPROGRAMS\TallerOS\Desinstalar.lnk" "$INSTDIR\Uninstall.exe"

  ; ═════════════════════════════════════════
  ;  PASO 5: Registro y finalizacion
  ; ═════════════════════════════════════════
  DetailPrint ""
  DetailPrint "Paso 5/5: Finalizando instalacion..."

  ; Escribir en registro
  WriteRegStr HKLM "Software\TallerOS" "Install_Dir" "$INSTDIR"
  WriteRegStr HKLM "Software\TallerOS" "Version" "2.0.0"

  ; Para desinstalador de Windows
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\TallerOS" "DisplayName" "TallerOS v2.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\TallerOS" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\TallerOS" "DisplayIcon" "$INSTDIR\icono.ico"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\TallerOS" "DisplayVersion" "2.0.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\TallerOS" "Publisher" "iGSM Servicio Tecnico"

  ; Crear desinstalador
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  DetailPrint ""
  DetailPrint "========================================="
  DetailPrint "  Instalacion completada!"
  DetailPrint "========================================="
  DetailPrint ""
  DetailPrint "Haz doble clic en el icono de TallerOS"
  DetailPrint "en tu escritorio para iniciar."

SectionEnd

; ═══════════════════════════════════════════════════════════════
;  DESINSTALACION
; ═══════════════════════════════════════════════════════════════
Section "Uninstall"
  DetailPrint "Desinstalando TallerOS..."

  ; Detener procesos de Node.js
  nsExec::ExecToStack '"taskkill" /F /IM node.exe 2>nul'

  ; Eliminar directorio de instalacion
  RMDir /r "$INSTDIR"

  ; Eliminar accesos directos
  Delete "$DESKTOP\TallerOS v2.0.lnk"
  RMDir /r "$SMPROGRAMS\TallerOS"

  ; Eliminar del registro
  DeleteRegKey HKLM "Software\TallerOS"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\TallerOS"

  DetailPrint "TallerOS ha sido desinstalado correctamente."
SectionEnd
