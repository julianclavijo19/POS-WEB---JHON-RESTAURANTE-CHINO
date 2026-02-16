@echo off
REM Iniciar PM2 y restaurar procesos guardados (incluye cash-drawer-script)
REM Para inicio con Windows: colocar acceso directo en shell:startup o usar Programador de tareas

SET PM2_HOME=%USERPROFILE%\.pm2
SET PATH=%PATH%;%APPDATA%\npm

cd /d "%~dp0"
pm2 resurrect 2>nul
if errorlevel 1 pm2 start ecosystem.config.js
