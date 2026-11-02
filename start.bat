@echo off
echo ==========================================
echo   CHRONO - AI Missing Person System
echo   Starting backend + frontend (production)
echo ==========================================
echo.

echo [1/2] Building frontend...
cd /d "%~dp0frontend"
call npm run build
if errorlevel 1 (
  echo Frontend build failed!
  pause
  exit /b 1
)

echo.
echo [2/2] Starting backend on http://localhost:5000
echo   (Frontend served at same URL)
echo   Press Ctrl+C to stop
echo.
cd /d "%~dp0backend"
node server.js
