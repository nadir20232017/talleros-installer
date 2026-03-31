@echo off
chcp 65001 >nul
title Instalador TallerOS v2.0
color 0A
cls

echo ==========================================
echo    LANZADOR TallerOS v2.0
echo ==========================================
echo.
echo Este programa abrira el instalador de TallerOS.
echo.
echo Si es la primera vez, Windows pedira permisos.
echo Selecciona "Si" cuando aparezca la ventana.
echo.
pause
cls

echo ==========================================
echo    Preparando instalacion...
echo ==========================================
echo.

:: Verificar si estamos en modo administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Se necesitan permisos de administrador.
    echo Solicitando permisos elevados...
    echo.

    :: Relanzar como administrador
    powershell -Command "Start-Process '%~f0' -Verb runAs"
    exit /b
)

:: Cambiar politica de ejecucion temporalmente
echo Configurando PowerShell para permitir instalacion...
powershell -Command "Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force" >nul 2>&1

echo.
echo ==========================================
echo    Iniciando instalador...
echo ==========================================
echo.

:: Ejecutar el instalador PowerShell
powershell -ExecutionPolicy Bypass -File "Instalar-TallerOS.ps1"

if %errorlevel% neq 0 (
    echo.
    echo ==========================================
    echo    ERROR EN LA INSTALACION
    echo ==========================================
    echo.
    echo Hubo un problema. Intentando metodo alternativo...
    echo.
    pause

    :: Intentar con el instalador Batch
    call INSTALAR-TallerOS.bat
)

echo.
echo ==========================================
echo    Proceso completado
echo ==========================================
echo.
pause
