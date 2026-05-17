@echo off
cd /d "%~dp0"
echo Installation des dependances...
call npm install
echo.
echo Demarrage de MyCloud sur http://localhost:3000
echo Appuyez sur Ctrl+C pour arreter.
echo.
call npm run dev
pause
