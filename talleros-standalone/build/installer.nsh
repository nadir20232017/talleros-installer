!include "LogicLib.nsh"
!include "WinVer.nsh"
!include "FileFunc.nsh"

; Verificar requisitos antes de instalar
!macro customInit
  ; Verificar Windows 10 o superior
  ${If} ${AtLeastWin10}
    ; OK
  ${Else}
    MessageBox MB_OK "TallerOS requiere Windows 10 o superior."
    Abort
  ${EndIf}

  ; Verificar arquitectura x64
  ${If} ${RunningX64}
    ; OK
  ${Else}
    MessageBox MB_OK "TallerOS requiere Windows de 64 bits."
    Abort
  ${EndIf}

  ; Mensaje IMPORTANTE con requisitos previos
  MessageBox MB_OK "═══════════════════════════════════════$
TALLEROS - REQUISITOS PREVIOS$
═══════════════════════════════════════$
$
Antes de instalar TallerOS necesitas:$
$
1️⃣  NODE.JS (Obligatorio)$
    Descarga desde: https://nodejs.org/$
    Version LTS recomendada$
$
2️⃣  POSTGRESQL (Obligatorio)$
    Descarga desde: https://www.postgresql.org/download/windows/$
    Version 15 o 16$
    ANOTA LA CONTRASEÑA que pongas!$
$
3️⃣  CREAR BASE DE DATOS$
    Abre pgAdmin y crea una BD llamada 'talleros'$
$
4️⃣  VISUAL C++ REDISTRIBUTABLE (Si hay errores)$
    https://aka.ms/vs/17/release/vc_redist.x64.exe$
$
═══════════════════════════════════════$
Ver LEEME-INSTALACION-WINDOWS.txt para instrucciones completas."
!macroend

; Copiar archivo LEEME al escritorio después de instalar
!macro customInstall
  ; Copiar LEEME al escritorio
  CopyFiles "$INSTDIR\LEEME-INSTALACION-WINDOWS.txt" "$DESKTOP\TallerOS - Instrucciones.txt"
!macroend
