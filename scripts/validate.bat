@echo off
REM Script de validación para Windows
REM Ejecutar antes de hacer push

echo.
echo 🔒 Validando proyecto...
echo.

node scripts\validate-project.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ VALIDACION FALLIDA
    echo ⚠️  NO HAGAS PUSH - Posible codigo de otro proyecto
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Validacion exitosa - Puedes hacer push de forma segura
echo.
pause
