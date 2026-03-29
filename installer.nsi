; TallerOS v2.0 Installer
; Compilado automaticamente con GitHub Actions

Name "TallerOS v2.0"
OutFile "TallerOS-Setup.exe"
InstallDir "$PROGRAMFILES64\TallerOS"
InstallDirRegKey HKLM "Software\TallerOS" "Install_Dir"
RequestExecutionLevel admin
SetCompressor lzma

; Includes
!include "MUI2.nsh"
!include "LogicLib.nsh"

; Configuracion MUI
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\Iniciar-TallerOS.bat"

; Paginas
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Desinstalador
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Idioma
!insertmacro MUI_LANGUAGE "Spanish"

; Seccion principal
Section "TallerOS v2.0" SecMain
  SectionIn RO

  DetailPrint "Instalando TallerOS v2.0..."
  SetOutPath "$INSTDIR"

  ; Copiar archivos de TallerOS
  File /r "files-win-licencia-pro\*.*"

  ; Copiar instaladores
  SetOutPath "$INSTDIR\installers"
  File /r "installers\*.*"

  ; Crear archivo de configuracion .env
  SetOutPath "$INSTDIR"
  FileOpen $9 "$INSTDIR\.env" w
  FileWrite $9 "DATABASE_URL=postgresql://talleros:talleros123@localhost:5432/talleros"
  FileWrite $9 "$\r$\n"
  FileWrite $9 "DB_HOST=localhost"
  FileWrite $9 "$\r$\n"
  FileWrite $9 "DB_PORT=5432"
  FileWrite $9 "$\r$\n"
  FileWrite $9 "DB_NAME=talleros"
  FileWrite $9 "$\r$\n"
  FileWrite $9 "DB_USER=talleros"
  FileWrite $9 "$\r$\n"
  FileWrite $9 "DB_PASSWORD=talleros123"
  FileWrite $9 "$\r$\n"
  FileWrite $9 "NODE_ENV=production"
  FileWrite $9 "$\r$\n"
  FileWrite $9 "PORT=3003"
  FileWrite $9 "$\r$\n"
  FileClose $9

  ; Crear script de inicio .bat
  FileOpen $8 "$INSTDIR\Iniciar-TallerOS.bat" w
  FileWrite $8 "@echo off"
  FileWrite $8 "$\r$\n"
  FileWrite $8 "cd /d $INSTDIR"
  FileWrite $8 "$\r$\n"
  FileWrite $8 "echo Iniciando TallerOS..."
  FileWrite $8 "$\r$\n"
  FileWrite $8 "echo Espera a que aparezca Servidor iniciado..."
  FileWrite $8 "$\r$\n"
  FileWrite $8 "echo."
  FileWrite $8 "$\r$\n"
  FileWrite $8 "node backend\src\index.js"
  FileWrite $8 "$\r$\n"
  FileWrite $8 "pause"
  FileWrite $8 "$\r$\n"
  FileClose $8

  ; Crear accesos directos
  CreateDirectory "$SMPROGRAMS\TallerOS"
  CreateShortcut "$SMPROGRAMS\TallerOS\TallerOS.lnk" "$INSTDIR\Iniciar-TallerOS.bat"
  CreateShortcut "$SMPROGRAMS\TallerOS\Desinstalar.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\TallerOS.lnk" "$INSTDIR\Iniciar-TallerOS.bat"

  ; Registrar en Windows
  WriteRegStr HKLM "Software\TallerOS" "Install_Dir" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\TallerOS" "DisplayName" "TallerOS v2.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\TallerOS" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\TallerOS" "DisplayVersion" "2.0.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\TallerOS" "Publisher" "iGSM"

  ; Crear desinstalador
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  DetailPrint "Instalacion completada!"
SectionEnd

; Seccion de desinstalacion
Section "Uninstall"
  DetailPrint "Desinstalando TallerOS..."

  ; Eliminar archivos
  RMDir /r "$INSTDIR"

  ; Eliminar accesos directos
  Delete "$DESKTOP\TallerOS.lnk"
  RMDir /r "$SMPROGRAMS\TallerOS"

  ; Eliminar del registro
  DeleteRegKey HKLM "Software\TallerOS"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\TallerOS"

  DetailPrint "TallerOS ha sido desinstalado."
SectionEnd
