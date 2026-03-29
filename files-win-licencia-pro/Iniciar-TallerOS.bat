@echo off
cd /d "%~dp0"
echo Iniciando TallerOS...
echo Espera a que aparezca 'Servidor iniciado en puerto 3003'
echo.
node backend\src\index.js
pause
