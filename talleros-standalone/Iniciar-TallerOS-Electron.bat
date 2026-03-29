@echo off
chcp 65001 >nul
title Iniciando TallerOS Licensed v2.0...
color 0B

cd /d "%~dp0"

echo.
echo  ============================================
echo   TallerOS Licensed v2.0
echo   Sistema de Gestion de Talleres
echo  ============================================
echo.
echo  [INFO] Iniciando aplicacion...
echo  [INFO] Esto puede tardar unos segundos...
echo.

:: Verificar que existan las dependencias
if not exist "node_modules\electron" (
    echo  [ERROR] Electron no encontrado.
    echo  [INFO] Ejecuta primero: Instalar-TallerOS.bat
    pause
    exit /b 1
)

:: Iniciar Electron
npm start

if %errorLevel% neq 0 (
    echo.
    echo  [ERROR] La aplicacion se cerro con errores.
    pause
)
