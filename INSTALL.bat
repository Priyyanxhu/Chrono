@echo off
echo ==========================================
echo   ORION - First Time Setup
echo ==========================================
echo.
echo Installing dependencies...
echo.

echo [1/3] Backend...
cd /d "%~dp0backend"
call npm install
if errorlevel 1 goto :error

echo.
echo [2/3] Frontend...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 goto :error

echo.
echo [3/3] Root...
cd /d "%~dp0"
call npm install
if errorlevel 1 goto :error

echo.
echo ==========================================
echo   Setup complete!
echo ==========================================
echo.
echo Run start.bat   - production (single port 5000)
echo Run start-dev.bat - development (two ports)
echo.
pause
exit /b 0

:error
echo.
echo Installation failed! Check errors above.
pause
exit /b 1
