@echo off
chcp 65001 >nul
title TallerOS v2.0
color 0B

:: ============================================
:: TallerOS v2.0 - Iniciar Aplicacion
:: ============================================

cd /d "%~dp0"

echo.
echo  ============================================
echo   TallerOS v2.0
echo  ============================================
echo.

:: Verificar Node.js
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo  [ERROR] Node.js no encontrado.
    echo  [INFO] Por favor, ejecuta primero: Instalar-TallerOS.bat
    pause
    exit /b 1
)

:: Verificar PostgreSQL
if not exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
    if not exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
        if not exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" (
            echo  [ADVERTENCIA] PostgreSQL no encontrado.
            echo  [INFO] La aplicacion puede no funcionar correctamente.
            echo.
            timeout /t 3 >nul
        )
    )
)

echo  [INFO] Iniciando servidor...
echo  [INFO] Espera a que aparezca "Servidor iniciado en puerto 3003"
echo.
echo  [INFO] Despues, abre tu navegador en: http://localhost:3003
echo.
echo  [INFO] Datos de acceso:
echo         - Usuario: admin@igsm.com
echo         - Contraseña: admin123
echo.
echo  ============================================
echo.

:: Iniciar el servidor
node backend\src\index.js

if %errorLevel% neq 0 (
    echo.
    echo  [ERROR] El servidor se detuvo con errores.
    pause
)
