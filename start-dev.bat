@echo off
echo ==========================================
echo   ORION - Development Mode
echo   Backend : http://localhost:5000
echo   Frontend: http://localhost:5173
echo ==========================================
echo.
echo Starting both servers...
echo Frontend proxies /api to backend automatically
echo.

cd /d "%~dp0"
if not exist "node_modules\concurrently" (
  echo Installing root deps...
  call npm install
)

call npx concurrently "npm run dev --prefix backend" "npm run dev --prefix frontend"
